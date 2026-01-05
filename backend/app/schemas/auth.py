from pydantic import BaseModel, EmailStr, Field, ConfigDict


class SignupRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    vendor_id: int = Field(..., ge=1)
    name: str = Field(..., min_length=1, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=128)
    role: str = Field("vendor_admin", min_length=3, max_length=50)


class LoginRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: EmailStr
    password: str = Field(..., min_length=1)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
