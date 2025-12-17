from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.db import get_db
from app.models.user import User
from app.schemas.auth import SignupRequest, LoginRequest, TokenResponse
from app.core.security import hash_password, verify_password
from app.core.jwt import create_access_token

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/signup")
def signup(data: SignupRequest, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == data.email).first():
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

@router.post("/login", response_model=TokenResponse)
def login(data: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()

    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )

    token = create_access_token({
        "user_id": user.id,
        "vendor_id": user.vendor_id,
        "role": user.role
    })

    return {"access_token": token}
