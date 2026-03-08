from pydantic import BaseModel, EmailStr, Field, ConfigDict


class SignupRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    vendor_id: int = Field(..., ge=1)
    name: str = Field(..., min_length=1, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=128)
    role: str = Field("vendor_admin", min_length=3, max_length=50)


class RegisterRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    
    vendor_name: str = Field(..., min_length=2, max_length=100)
    owner_name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
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


class LoginRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: EmailStr
    password: str = Field(..., min_length=1)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class RegisterResponse(BaseModel):
    access_token: str
    user: dict
    vendor: dict
