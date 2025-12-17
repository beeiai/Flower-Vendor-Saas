from pydantic import BaseModel, EmailStr

class SignupRequest(BaseModel):
    vendor_id: int
    name: str
    email: EmailStr
    password: str
    role: str = "vendor_admin"

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
