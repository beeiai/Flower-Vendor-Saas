from typing import Optional
from pydantic import BaseModel, Field, ConfigDict


class FarmerGroupBase(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(..., min_length=1, max_length=100)
    commission_percent: Optional[float] = Field(None, ge=0, le=100)


class FarmerGroupCreate(FarmerGroupBase):
    pass


class FarmerGroupUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: Optional[str] = Field(None, min_length=1, max_length=100)
    commission_percent: Optional[float] = Field(None, ge=0, le=100)


class FarmerGroupResponse(FarmerGroupBase):
    id: int
    vendor_id: int

    class Config:
        from_attributes = True
