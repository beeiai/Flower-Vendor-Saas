from sqlalchemy import Column, Integer, Numeric, Text, TIMESTAMP, ForeignKey, func
from sqlalchemy.orm import relationship
from app.core.db import Base

class Advance(Base):
    __tablename__ = "advances"

    id = Column(Integer, primary_key=True, index=True)

    vendor_id = Column(Integer, ForeignKey("vendors.id", ondelete="CASCADE"), nullable=False)
    farmer_id = Column(Integer, ForeignKey("farmers.id", ondelete="CASCADE"), nullable=False)

    # Positive = advance given, Negative = recovered/deducted
    amount = Column(Numeric(12, 2), nullable=False)

    note = Column(Text, nullable=True)

    created_at = Column(TIMESTAMP, server_default=func.now())

    vendor = relationship("Vendor", backref="advances")
    farmer = relationship("Farmer", backref="advances")
