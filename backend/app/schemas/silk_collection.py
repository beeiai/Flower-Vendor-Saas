from datetime import date, datetime
from decimal import Decimal
from pydantic import BaseModel, Field, field_serializer
from typing import List, Optional


class SilkDailyCollectionBase(BaseModel):
    date: date
    cash: Decimal = Field(default=Decimal("0"), ge=0, decimal_places=2)
    upi: Decimal = Field(default=Decimal("0"), ge=0, decimal_places=2)


class SilkDailyCollectionCreate(SilkDailyCollectionBase):
    pass


class SilkDailyCollectionUpdate(BaseModel):
    cash: Optional[Decimal] = Field(default=None, ge=0, decimal_places=2)
    upi: Optional[Decimal] = Field(default=None, ge=0, decimal_places=2)


class SilkDailyCollectionResponse(SilkDailyCollectionBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    @field_serializer('created_at', 'updated_at')
    def serialize_datetime(self, dt: datetime) -> Optional[str]:
        if dt is None:
            return None
        return dt.isoformat()

    class Config:
        from_attributes = True


class SilkDailyCollectionListResponse(BaseModel):
    collections: List[SilkDailyCollectionResponse]