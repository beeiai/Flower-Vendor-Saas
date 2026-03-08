from pydantic import BaseModel, Field, ConfigDict
from datetime import date
from typing import Optional


# =========================
# CREATE (Excel-style row)
# =========================
class CollectionItemCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    farmer_id: int = Field(..., ge=1, description="Farmer ID")
    vehicle_id: int = Field(..., ge=1, description="Vehicle ID")
    date: Optional[date] = Field(None, description="Collection date")

    qty_kg: float = Field(..., gt=0, description="Quantity in KG")
    rate_per_kg: float = Field(..., ge=0, description="Price per KG")
    labour_per_kg: float = Field(..., ge=0, description="Labour cost per KG")
    coolie_cost: float = Field(..., ge=0, description="Fixed coolie cost")
    transport_cost: float = Field(..., ge=0, description="Transport cost")

    class Config:
        from_attributes = True


# =========================
# UPDATE (same rules)
# =========================
class CollectionItemUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    qty_kg: float = Field(..., gt=0)
    rate_per_kg: float = Field(..., ge=0)
    labour_per_kg: float = Field(..., ge=0)
    coolie_cost: float = Field(..., ge=0)
    transport_cost: float = Field(..., ge=0)

    class Config:
        from_attributes = True


# =========================
# RESPONSE (read-only)
# =========================
class CollectionItemResponse(BaseModel):
    id: int
    farmer_id: int
    vehicle_id: int
    group_id: int
    date: date

    qty_kg: float
    rate_per_kg: float
    labour_per_kg: float
    coolie_cost: float
    transport_cost: float

    total_labour: float
    line_total: float
    is_locked: bool

    class Config:
        from_attributes = True
