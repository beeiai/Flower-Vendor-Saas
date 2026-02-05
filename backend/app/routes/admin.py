import logging
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, status, Body, Header
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field, ConfigDict
from app.core.db import get_db
from app.models.user import User
from app.models.vendor import Vendor
from app.core.security import hash_password, verify_password
from app.core.jwt import create_access_token, decode_token
from app.core.config import settings
from app.core.structured_logging import log_security_event
from sqlalchemy import text
import re

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin", tags=["Admin"])

# Master admin token will have 10-minute TTL with special role
MASTER_ADMIN_TOKEN_TTL = 10  # minutes

class MasterLoginRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    
    username: str = Field(..., min_length=1)
    password: str = Field(..., min_length=1)

class MasterLoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str = "MASTER_ADMIN"

class CreateVendorRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    
    vendor_name: str = Field(..., min_length=2, max_length=100)
    owner_name: str = Field(..., min_length=2, max_length=100)
    email: str = Field(..., min_length=5, max_length=120)  # Will validate email format in handler
    password: str = Field(..., min_length=8, max_length=128)
    
    @property
    def password_strength(self) -> bool:
        """Check if password meets strength requirements"""
        if len(self.password) < 8:
            return False
        if not any(c.isupper() for c in self.password):
            return False
        if not any(c.islower() for c in self.password):
            return False
        if not any(c.isdigit() for c in self.password):
            return False
        return True

class CreateVendorResponse(BaseModel):
    vendor_id: int
    vendor_name: str
    admin_email: str
    admin_password: str  # Temporary password for initial login

class ChangeMasterPasswordRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    
    old_password: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=8, max_length=128)
    
    @property
    def new_password_strength(self) -> bool:
        """Check if new password meets strength requirements"""
        if len(self.new_password) < 8:
            return False
        if not any(c.isupper() for c in self.new_password):
            return False
        if not any(c.islower() for c in self.new_password):
            return False
        if not any(c.isdigit() for c in self.new_password):
            return False
        return True

def verify_master_token_payload(token: str) -> bool:
    """Verify that a token belongs to a master admin by decoding JWT"""
    try:
        payload = decode_token(token)
        return payload.get("role") == "MASTER_ADMIN"
    except Exception:
        return False

def constant_time_compare(a: str, b: str) -> bool:
    """Compare strings in constant time to prevent timing attacks"""
    if len(a) != len(b):
        return False
    result = 0
    for x, y in zip(a, b):
        result |= ord(x) ^ ord(y)
    return result == 0

# =========================
# MASTER ADMIN AUTHENTICATION
# =========================
@router.post("/master-login", response_model=MasterLoginResponse)
def master_login(
    request: MasterLoginRequest,
    db: Session = Depends(get_db)
):
    """Master admin login endpoint with security logging"""
    
    # Constant-time comparison to prevent username enumeration
    username_match = constant_time_compare(request.username, settings.MASTER_ADMIN_USERNAME)
    
    # Always verify password to prevent timing attacks
    password_valid = verify_password(request.password, settings.MASTER_ADMIN_PASSWORD_HASH)
    
    # Log security event
    log_security_event(
        "master_admin_login_attempt",
        {
            "username": request.username,
            "username_match": username_match,
            "password_valid": password_valid
        },
        severity="INFO"
    )
    
    # Only succeed if both username and password are correct
    if not username_match or not password_valid:
        logger.warning(f"Failed master admin login attempt for username: {request.username}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )
    
    # Create short-lived master admin token
    access_token = create_access_token(
        {
            "sub": "master_admin",
            "role": "MASTER_ADMIN",
        },
        expires_delta=timedelta(minutes=MASTER_ADMIN_TOKEN_TTL)
    )
    
    logger.info(f"Master admin logged in: {request.username}")
    log_security_event(
        "master_admin_login_success",
        {
            "username": request.username
        },
        severity="INFO"
    )
    
    return MasterLoginResponse(
        access_token=access_token,
        role="MASTER_ADMIN"
    )

# =========================
# CREATE VENDOR (MASTER ONLY)
# =========================
@router.post("/create-vendor", response_model=CreateVendorResponse)
def create_vendor(
    request: CreateVendorRequest,
    authorization: str = Header(...),
    db: Session = Depends(get_db)
):
    """Create a new vendor and admin user (master admin only)"""
    
    # Extract token from Authorization header
    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization header"
        )
    
    token = authorization[7:]  # Remove "Bearer " prefix
    
    # Verify master admin token by checking payload
    if not verify_master_token_payload(token):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired master token"
        )
    
    # Validate password strength
    if not request.password_strength:
        raise HTTPException(
            status_code=400,
            detail="Password must be at least 8 characters with uppercase, lowercase, and digit"
        )
    
    # Normalize email
    email = request.email.lower().strip()
    
    # Validate email format
    if not re.match(r"[^@]+@[^@]+\.[^@]+", email):
        raise HTTPException(
            status_code=400,
            detail="Invalid email format"
        )
    
    # Check if email already exists
    existing_user = db.query(User).filter(User.email.ilike(email)).first()
    if existing_user:
        raise HTTPException(
            status_code=409,
            detail="Email already registered"
        )
    
    try:
        # Create Vendor
        vendor = Vendor(
            name=request.vendor_name,
            owner_name=request.owner_name,
            email=email,
            password_hash=hash_password(request.password),
            phone="",
            address=""
        )
        
        # Add vendor and flush to get ID
        db.add(vendor)
        db.flush()  # Get vendor ID without committing
        
        # Create Admin User with the vendor ID
        user = User(
            vendor_id=vendor.id,
            name=request.owner_name,
            email=email,
            password_hash=hash_password(request.password),
            role="Admin User",
            is_active=True
        )
        
        # Add user and commit in single transaction
        db.add(user)
        db.commit()
        db.refresh(user)
        db.refresh(vendor)
        
        logger.info(f"New vendor created by master admin: {vendor.name} (ID: {vendor.id})")
        log_security_event(
            "vendor_created",
            {
                "vendor_id": vendor.id,
                "vendor_name": vendor.name,
                "admin_email": user.email,
                "created_by": "master_admin"
            },
            severity="INFO"
        )
        
        return CreateVendorResponse(
            vendor_id=vendor.id,
            vendor_name=vendor.name,
            admin_email=user.email,
            admin_password=request.password  # Return the temporary password
        )
        
    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Vendor creation failed: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Vendor creation failed. Please try again."
        )

# =========================
# CHANGE MASTER PASSWORD
# =========================
@router.post("/change-master-password")
def change_master_password(
    request: ChangeMasterPasswordRequest,
    authorization: str = Header(...),
    db: Session = Depends(get_db)
):
    """Change master admin password (master admin only)"""
    
    # Extract token from Authorization header
    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization header"
        )
    
    token = authorization[7:]  # Remove "Bearer " prefix
    
    # Verify master admin token by checking payload
    if not verify_master_token_payload(token):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired master token"
        )
    
    # Validate new password strength
    if not request.new_password_strength:
        raise HTTPException(
            status_code=400,
            detail="New password must be at least 8 characters with uppercase, lowercase, and digit"
        )
    
    # Verify old password
    if not verify_password(request.old_password, settings.MASTER_ADMIN_PASSWORD_HASH):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid old password"
        )
    
    # Hash new password
    new_hash = hash_password(request.new_password)
    
    # Update in database (system_settings table) using raw SQL
    try:
        # Insert or update the password hash
        stmt = text(""" 
            INSERT INTO system_settings (key, value) 
            VALUES (:key, :value) 
            ON CONFLICT (key) 
            DO UPDATE SET value = :value, updated_at = NOW()
        """)
        
        db.execute(stmt, {"key": "MASTER_ADMIN_PASSWORD_HASH", "value": new_hash})
        db.commit()
        
        # Also update the settings object for immediate use
        # Note: This won't persist across restarts, but database will be source of truth
        settings.MASTER_ADMIN_PASSWORD_HASH = new_hash
        
        logger.info("Master admin password changed successfully")
        log_security_event(
            "master_password_changed",
            {
                "changed_by": "master_admin"
            },
            severity="INFO"
        )
        
        return {"message": "Password changed successfully"}
        
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to change master password: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Failed to change password"
        )


# =========================
# CHANGE VENDOR PASSWORD (MASTER ONLY)
# =========================
class ChangeVendorPasswordRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    
    vendor_id: int
    new_password: str = Field(..., min_length=8, max_length=128)
    
    @property
    def password_strength(self) -> bool:
        """Check if password meets strength requirements"""
        if len(self.new_password) < 8:
            return False
        if not any(c.isupper() for c in self.new_password):
            return False
        if not any(c.islower() for c in self.new_password):
            return False
        if not any(c.isdigit() for c in self.new_password):
            return False
        return True

@router.post("/change-vendor-password")
def change_vendor_password(
    request: ChangeVendorPasswordRequest,
    authorization: str = Header(...),
    db: Session = Depends(get_db)
):
    """Change vendor password (master admin only)"""
    
    # Extract token from Authorization header
    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization header"
        )
    
    token = authorization[7:]  # Remove "Bearer " prefix
    
    # Verify master admin token by checking payload
    if not verify_master_token_payload(token):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired master token"
        )
    
    # Validate password strength
    if not request.password_strength:
        raise HTTPException(
            status_code=400,
            detail="New password must be at least 8 characters with uppercase, lowercase, and digit"
        )
    
    # Find the vendor
    vendor = db.query(Vendor).filter(Vendor.id == request.vendor_id).first()
    if not vendor:
        raise HTTPException(
            status_code=404,
            detail="Vendor not found"
        )
    
    # Find the admin user for this vendor
    user = db.query(User).filter(User.vendor_id == request.vendor_id, User.role == "Admin User").first()
    if not user:
        raise HTTPException(
            status_code=404,
            detail="Admin user for vendor not found"
        )
    
    # Hash new password
    new_hash = hash_password(request.new_password)
    
    # Update user password
    user.password_hash = new_hash
    user.updated_at = datetime.utcnow()
    
    try:
        db.commit()
        
        logger.info(f"Password changed for vendor {request.vendor_id}")
        log_security_event(
            "vendor_password_changed",
            {
                "vendor_id": request.vendor_id,
                "changed_by": "master_admin"
            },
            severity="INFO"
        )
        
        return {"message": "Vendor password changed successfully"}
        
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to change vendor password: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Failed to change vendor password"
        )


# =========================
# CREATE USER FOR VENDOR (MASTER ONLY)
# =========================
class CreateUserForVendorRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    
    vendor_id: int
    name: str = Field(..., min_length=2, max_length=100)
    email: str = Field(..., min_length=5, max_length=120)
    password: str = Field(..., min_length=8, max_length=128)
    role: str = Field(default="User", max_length=50)
    
    @property
    def password_strength(self) -> bool:
        """Check if password meets strength requirements"""
        if len(self.password) < 8:
            return False
        if not any(c.isupper() for c in self.password):
            return False
        if not any(c.islower() for c in self.password):
            return False
        if not any(c.isdigit() for c in self.password):
            return False
        return True

@router.post("/create-user-for-vendor")
def create_user_for_vendor(
    request: CreateUserForVendorRequest,
    authorization: str = Header(...),
    db: Session = Depends(get_db)
):
    """Create a new user for a specific vendor (master admin only)"""
    
    # Extract token from Authorization header
    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization header"
        )
    
    token = authorization[7:]  # Remove "Bearer " prefix
    
    # Verify master admin token by checking payload
    if not verify_master_token_payload(token):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired master token"
        )
    
    # Validate password strength
    if not request.password_strength:
        raise HTTPException(
            status_code=400,
            detail="Password must be at least 8 characters with uppercase, lowercase, and digit"
        )
    
    # Find the vendor
    vendor = db.query(Vendor).filter(Vendor.id == request.vendor_id).first()
    if not vendor:
        raise HTTPException(
            status_code=404,
            detail="Vendor not found"
        )
    
    # Normalize email
    email = request.email.lower().strip()
    
    # Validate email format
    if not re.match(r"[^@]+@[^@]+\.[^@]+", email):
        raise HTTPException(
            status_code=400,
            detail="Invalid email format"
        )
    
    # Check if email already exists
    existing_user = db.query(User).filter(User.email.ilike(email)).first()
    if existing_user:
        raise HTTPException(
            status_code=409,
            detail="Email already registered"
        )
    
    try:
        # Create User
        # For master admin creating users for vendors, always set role to "vendor_admin"
        user = User(
            vendor_id=request.vendor_id,
            name=request.name,
            email=email,
            password_hash=hash_password(request.password),
            role="vendor_admin",
            is_active=True
        )
        
        # Add user record and commit
        try:
            db.add(user)
            db.commit()
            db.refresh(user)
        except Exception as e:
            db.rollback()
            logger.error(f"User creation failed: {str(e)}", exc_info=True)
            raise HTTPException(
                status_code=500,
                detail=f"User creation failed: {str(e)}"
            )
        
        logger.info(f"New user created for vendor {request.vendor_id}: {user.name} ({user.email})")
        log_security_event(
            "user_created",
            {
                "user_id": user.id,
                "vendor_id": request.vendor_id,
                "user_email": user.email,
                "created_by": "master_admin"
            },
            severity="INFO"
        )
        
        return {
            "user_id": user.id,
            "name": user.name,
            "email": user.email,
            "role": user.role,
            "vendor_id": user.vendor_id
        }
        
    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"User creation failed: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"User creation failed: {str(e)}"
        )


# =========================
# LIST VENDORS (MASTER ONLY)
# =========================
@router.get("/vendors")
def list_vendors(
    authorization: str = Header(...),
    db: Session = Depends(get_db)
):
    """List all vendors (master admin only)"""
    
    # Extract token from Authorization header
    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization header"
        )
    
    token = authorization[7:]  # Remove "Bearer " prefix
    
    # Verify master admin token by checking payload
    if not verify_master_token_payload(token):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired master token"
        )
    
    # Get all vendors
    vendors = db.query(Vendor).all()
    
    # Convert to simple dict format
    vendor_list = []
    for vendor in vendors:
        # Get users for this vendor
        vendor_users = db.query(User).filter(User.vendor_id == vendor.id).all()
        users_list = []
        for user in vendor_users:
            users_list.append({
                "id": user.id,
                "name": user.name,
                "email": user.email,
                "role": user.role,
                "is_active": user.is_active,
                "created_at": user.created_at,
            })
        
        vendor_list.append({
            "id": vendor.id,
            "name": vendor.name,
            "owner_name": vendor.owner_name,
            "email": vendor.email,
            "phone": vendor.phone,
            "created_at": vendor.created_at,
            "users": users_list,
        })
    
    return vendor_list
