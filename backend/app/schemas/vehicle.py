from typing import Optional
from pydantic import BaseModel, Field, ConfigDict, AliasChoices


# =========================
# BASE
# =========================
class VehicleBase(BaseModel):
    model_config = ConfigDict(extra="forbid")

    vehicle_number: str = Field(..., max_length=50, validation_alias=AliasChoices("vehicle_number", "vehicleNumber"))
    vehicle_name: Optional[str] = Field(None, min_length=1, max_length=100, validation_alias=AliasChoices("vehicle_name", "vehicleName"))
    driver_name: Optional[str] = Field(None, max_length=100, validation_alias=AliasChoices("driver_name", "driverName"))


# =========================
# CREATE
# =========================
class VehicleCreate(VehicleBase):
    pass


# =========================
# UPDATE
# =========================
class VehicleUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    vehicle_number: Optional[str] = Field(None, max_length=50, validation_alias=AliasChoices("vehicle_number", "vehicleNumber"))
    vehicle_name: Optional[str] = Field(None, min_length=1, max_length=100, validation_alias=AliasChoices("vehicle_name", "vehicleName"))
    driver_name: Optional[str] = Field(None, max_length=100, validation_alias=AliasChoices("driver_name", "driverName"))


# =========================
# RESPONSE
# =========================
class VehicleResponse(VehicleBase):
    id: int
    vendor_id: int

    class Config:
        from_attributes = True
