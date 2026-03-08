import logging

from fastapi import APIRouter, Depends, HTTPException, status, Body
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.models.user import User
from app.schemas.auth import TokenResponse
from app.core.security import hash_password, verify_password
from app.core.jwt import create_access_token, create_refresh_token
from app.dependencies import get_current_user
from app.core.config import settings
from jose import JWTError


logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["Authentication"])


# =========================
# SELF-SERVICE REGISTRATION (DISABLED)
# =========================
@router.post("/register")
def register():
    # Public registration is disabled - return 404 to prevent discovery
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Endpoint not found"
    )


# =========================
# LEGACY REGISTRATION (DISABLED)
# =========================
# This endpoint is kept for backward compatibility but returns 404
@router.post("/signup")
def signup_legacy():
    # Public registration is disabled - return 404 to prevent discovery
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Endpoint not found"
    )


# =========================
# LOGIN (OAUTH2 FORM DATA)
# =========================
@router.post("/login", response_model=TokenResponse)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    # OAuth2 uses "username" field - we treat it as email
    user = db.query(User).filter(User.email == form_data.username).first()

    if not user or not verify_password(form_data.password, user.password_hash):
        logger.warning("Failed login attempt for %s", form_data.username)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )

    try:
        access_token = create_access_token(
            {
                "sub": user.email,
                "user_id": user.id,
                "vendor_id": user.vendor_id,
                "role": user.role,
            }
        )
        
        refresh_token = create_refresh_token(
            {
                "sub": user.email,
                "user_id": user.id,
            }
        )

        logger.info("User %s logged in", user.email)

        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
        }
    except Exception as e:
        logger.exception("Login response build failed for user %s", user.email)
        raise HTTPException(status_code=500, detail="Login processing failed")

@router.get("/me")
def get_me(current_user: User = Depends(get_current_user)):
    logger.info("User %s accessed /auth/me", current_user.email)
    return {
        "id": current_user.id,
        "email": current_user.email,
        "vendor_id": current_user.vendor_id,
        "role": current_user.role,
    }


@router.post("/refresh")
def refresh_token(refresh_token: str = Body(..., embed=True)):
    """Refresh access token using refresh token."""
    from app.core.jwt import verify_refresh_token
    
    try:
        payload = verify_refresh_token(refresh_token)
        user_id = payload.get("user_id")
        
        # In production, you might want to check if user still exists
        # and is active in database
        
        # Create new access token
        new_access_token = create_access_token(
            {
                "sub": payload.get("sub"),
                "user_id": user_id,
                "vendor_id": payload.get("vendor_id"),
                "role": payload.get("role"),
            }
        )
        
        return {
            "access_token": new_access_token,
            "token_type": "bearer",
            "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
        }
    
    except JWTError as e:
        logger.warning("Invalid refresh token used")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )
