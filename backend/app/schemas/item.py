from typing import Optional
from pydantic import BaseModel, Field, ConfigDict, AliasChoices


class ItemCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    code: str = Field(..., min_length=1, max_length=50, validation_alias=AliasChoices("code", "itemCode", "productCode"))
    name: str = Field(..., min_length=1, max_length=150, validation_alias=AliasChoices("name", "itemName", "productName"))
    rate: Optional[float] = Field(0, ge=0)


class ItemUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: Optional[str] = Field(None, min_length=1, max_length=150, validation_alias=AliasChoices("name", "itemName", "productName"))
    rate: Optional[float] = Field(None, ge=0)


class ItemResponse(BaseModel):
    id: int
    itemCode: str
    itemName: str
    rate: float = 0

    class Config:
        from_attributes = True
