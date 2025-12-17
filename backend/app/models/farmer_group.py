from sqlalchemy import Column, Integer, String, Numeric, TIMESTAMP, ForeignKey, func
from sqlalchemy.orm import relationship
from app.core.db import Base

class FarmerGroup(Base):
    __tablename__ = "farmer_groups"

    id = Column(Integer, primary_key=True, index=True)
    vendor_id = Column(Integer, ForeignKey("vendors.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(100), nullable=False)
    commission_percent = Column(Numeric(5, 2), nullable=True)  # nullable → individual farmer commission override allowed
    created_at = Column(TIMESTAMP, server_default=func.now())

    # Relationships
    vendor = relationship("Vendor", backref="farmer_groups")
