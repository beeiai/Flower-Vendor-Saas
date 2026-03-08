from pydantic import BaseModel, Field, ConfigDict
from datetime import date
from typing import Optional


class SettlementVoidRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    reason: str = Field(..., min_length=3, max_length=255, description="Reason for voiding settlement")


class SettlementCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    farmer_id: int = Field(..., ge=1)
    date_from: date
    date_to: date
    advance_deduction_percent: Optional[float] = Field(
        default=20,
        ge=0,
        le=100,
        description="Percentage of net payable to deduct from advance",
    )


class SettlementResponse(BaseModel):
    id: int
    farmer_id: int
    gross_amount: float
    commission_amount: float
    advance_deducted: float
    net_payable: float

    class Config:
        from_attributes = True
