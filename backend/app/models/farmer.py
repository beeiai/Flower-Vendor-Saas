from sqlalchemy import Column, Integer, String, Text, Numeric, TIMESTAMP, ForeignKey, func
from sqlalchemy.orm import relationship
from app.core.db import Base

class Farmer(Base):
    __tablename__ = "farmers"

    id = Column(Integer, primary_key=True, index=True)

    vendor_id = Column(Integer, ForeignKey("vendors.id", ondelete="CASCADE"), nullable=False)
    group_id = Column(Integer, ForeignKey("farmer_groups.id", ondelete="SET NULL"), nullable=True)

    farmer_code = Column(String(20), unique=True, index=True, nullable=False)
    name = Column(String(150), nullable=False)
    phone = Column(String(20), nullable=True)
    address = Column(Text, nullable=True)

    # commission override (optional).
    # If NULL → use group commission
    commission_percent = Column(Numeric(5, 2), nullable=True)

    # running advance total
    advance_total = Column(Numeric(12, 2), default=0)

    created_at = Column(TIMESTAMP, server_default=func.now())

    # Relationships
    vendor = relationship("Vendor", backref="farmers")
    group = relationship("FarmerGroup", backref="farmers")
