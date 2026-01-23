from pydantic import BaseModel
from datetime import datetime
from typing import Optional
from decimal import Decimal
from typing import Any


# SAALA Customer Schemas
class SaalaCustomerBase(BaseModel):
    name: str
    contact: Optional[str] = None
    address: Optional[str] = None


class SaalaCustomerCreate(SaalaCustomerBase):
    pass


class SaalaCustomerUpdate(BaseModel):
    name: Optional[str] = None
    contact: Optional[str] = None
    address: Optional[str] = None


class SaalaCustomerResponse(SaalaCustomerBase):
    id: int
    vendor_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# SAALA Transaction Schemas
class SaalaTransactionBase(BaseModel):
    customer_id: int
    date: datetime
    description: Optional[str] = None
    item_code: Optional[str] = None
    item_name: Optional[str] = None
    qty: Optional[Decimal] = None
    rate: Optional[Decimal] = None
    total_amount: Optional[Decimal] = None
    paid_amount: Optional[Decimal] = None
    balance: Optional[Decimal] = None


class SaalaTransactionCreate(BaseModel):
    date: datetime
    description: Optional[str] = None
    item_code: Optional[str] = None
    item_name: Optional[str] = None
    qty: Optional[Decimal] = None
    rate: Optional[Decimal] = None
    total_amount: Optional[Decimal] = None
    paid_amount: Optional[Decimal] = None


class SaalaTransactionUpdate(BaseModel):
    date: Optional[datetime] = None
    description: Optional[str] = None
    item_code: Optional[str] = None
    item_name: Optional[str] = None
    qty: Optional[Decimal] = None
    rate: Optional[Decimal] = None
    total_amount: Optional[Decimal] = None
    paid_amount: Optional[Decimal] = None


class SaalaTransactionResponse(BaseModel):
    id: int
    customer_id: int
    date: datetime
    description: Optional[str] = None
    item_code: Optional[str] = None
    item_name: Optional[str] = None
    qty: Optional[Decimal] = None
    rate: Optional[Decimal] = None
    total_amount: Optional[Decimal] = None
    paid_amount: Optional[Decimal] = None
    balance: Optional[Decimal] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
        json_encoders = {
            datetime: lambda v: v.strftime('%Y-%m-%d') if v else None
        }


# Response models that include customer info
class SaalaTransactionWithCustomerResponse(SaalaTransactionResponse):
    customer: SaalaCustomerResponse

    class Config:
        from_attributes = True