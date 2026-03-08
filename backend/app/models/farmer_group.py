from sqlalchemy import Column, Integer, String, Numeric, TIMESTAMP, ForeignKey, func, UniqueConstraint, Index
from sqlalchemy.orm import relationship
from app.core.db import Base


class FarmerGroup(Base):
    __tablename__ = "farmer_groups"
    __table_args__ = (
        # Prevent duplicate group names per vendor at the DB level
        UniqueConstraint("vendor_id", "name", name="uq_farmer_groups_vendor_id_name"),
        # Common filter key for all vendor-scoped queries
        Index("ix_farmer_groups_vendor_id", "vendor_id"),
    )

    id = Column(Integer, primary_key=True, index=True)
    vendor_id = Column(Integer, ForeignKey("vendors.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(100), nullable=False)
    commission_percent = Column(Numeric(5, 2), nullable=True)  # nullable  individual farmer commission override allowed
    created_at = Column(TIMESTAMP, server_default=func.now())

    # Relationships
    vendor = relationship("Vendor", backref="farmer_groups")
