from typing import Optional
from pydantic import BaseModel, Field, ConfigDict


# =========================
# BASE
# =========================
class FarmerBase(BaseModel):
    model_config = ConfigDict(extra="forbid")

    group_id: int = Field(..., ge=1)
    farmer_code: str = Field("", max_length=50)
    name: str = Field(..., min_length=1, max_length=100)
    phone: Optional[str] = Field(None, max_length=20)
    address: Optional[str] = Field(None, max_length=255)
    commission_percent: Optional[float] = Field(None, ge=0, le=100)


# =========================
# CREATE
# =========================
class FarmerCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(..., min_length=1, max_length=100)
    phone: str = Field(..., min_length=5, max_length=20)
    address: str = Field(..., min_length=1, max_length=255)
    group_name: str = Field(..., min_length=1, max_length=100)


# =========================
# UPDATE (PARTIAL)
# =========================
class FarmerUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    group_id: Optional[int] = Field(None, ge=1)
    farmer_code: Optional[str] = Field(None, max_length=50)
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    phone: Optional[str] = Field(None, min_length=5, max_length=20)
    address: Optional[str] = Field(None, min_length=1, max_length=255)
    commission_percent: Optional[float] = Field(None, ge=0, le=100)


# =========================
# RESPONSE
# =========================
class FarmerResponse(FarmerBase):
    id: int
    vendor_id: int

    class Config:
        from_attributes = True
