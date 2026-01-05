from sqlalchemy import (
    Column, Integer, String, Numeric, DATE, Boolean, Text,
    ForeignKey, TIMESTAMP, func, Index
)
from sqlalchemy.orm import relationship
from app.core.db import Base


class CollectionItem(Base):
    __tablename__ = "collection_items"
    __table_args__ = (
        Index("ix_collection_items_vendor_id", "vendor_id"),
        Index("ix_collection_items_farmer_id", "farmer_id"),
    )

    id = Column(Integer, primary_key=True, index=True)
    
    vendor_id = Column(Integer, ForeignKey("vendors.id", ondelete="CASCADE"), nullable=False)
    collection_id = Column(Integer, ForeignKey("collections.id", ondelete="CASCADE"), nullable=False)
    farmer_id = Column(Integer, ForeignKey("farmers.id", ondelete="SET NULL"), nullable=True)
    group_id = Column(Integer, ForeignKey("farmer_groups.id", ondelete="SET NULL"), nullable=True)

    date = Column(DATE, nullable=False)

    # Vehicle (manual input for Excel-like grid)
    vehicle_number = Column(String(20), nullable=True)
    vehicle_name = Column(String(100), nullable=True)

    # Item / Flower details
    item_code = Column(String(20), nullable=True)
    item_name = Column(String(100), nullable=True)

    qty_kg = Column(Numeric(12, 2), nullable=False)
    rate_per_kg = Column(Numeric(12, 2), nullable=False)
    labour_per_kg = Column(Numeric(12, 2), nullable=True)
    coolie_cost = Column(Numeric(12, 2), nullable=True)
    transport_cost = Column(Numeric(12, 2), nullable=True)

    total_labour = Column(Numeric(12, 2), nullable=True)
    line_total = Column(Numeric(12, 2), nullable=True)

    paid_amount = Column(Numeric(12, 2), nullable=True)
    remarks = Column(Text, nullable=True)

    sms_sent = Column(Boolean, default=False)

    created_at = Column(TIMESTAMP, server_default=func.now())

    # ORM relationships
    vendor = relationship("Vendor", backref="collection_items")
    collection = relationship("Collection", backref="items")
    farmer = relationship("Farmer", backref="collection_items")
    group = relationship("FarmerGroup", backref="collection_items")
