import logging

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.models.user import User
from app.schemas.auth import SignupRequest, TokenResponse
from app.core.security import hash_password, verify_password
from app.core.jwt import create_access_token
from app.dependencies import get_current_user


logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["Authentication"])


# =========================
# SIGNUP (JSON BODY)
# =========================
@router.post("/signup")
def signup(data: SignupRequest, db: Session = Depends(get_db)):
    existing_user = db.query(User).filter(User.email == data.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        vendor_id=data.vendor_id,
        name=data.name,
        email=data.email,
        password_hash=hash_password(data.password),
        role=data.role
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return {"message": "User created successfully"}


# =========================
# LOGIN (OAUTH2 FORM DATA)
# =========================
@router.post("/login", response_model=TokenResponse)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    # OAuth2 uses "username" field  we treat it as email
    user = db.query(User).filter(User.email == form_data.username).first()

    if not user or not verify_password(form_data.password, user.password_hash):
        logger.warning("Failed login attempt for %s", form_data.username)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )

    token = create_access_token({
        "sub": user.email,
        "vendor_id": user.vendor_id,
        "role": user.role
    })

    logger.info("User %s logged in", user.email)

    return {
        "access_token": token,
        "token_type": "bearer"
    }

@router.get("/me")
def get_me(current_user: User = Depends(get_current_user)):
    logger.info("User %s accessed /auth/me", current_user.email)
    return {
        "id": current_user.id,
        "email": current_user.email,
        "vendor_id": current_user.vendor_id,
        "role": current_user.role,
    }
