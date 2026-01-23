from sqlalchemy import Column, Integer, String, Numeric, DATE, TIMESTAMP, ForeignKey, func
from sqlalchemy.orm import relationship
from app.core.db import Base


class SilkPhysicalDigitalEntry(Base):
    """
    Silk physical and digital entries track daily cash collections for silk products.
    Each entry represents the physical and digital cash collected for a specific date.
    """
    __tablename__ = "silk_physical_digital_entries"

    id = Column(Integer, primary_key=True, index=True)
    vendor_id = Column(Integer, ForeignKey("vendors.id", ondelete="CASCADE"), nullable=False)
    
    date = Column(DATE, nullable=False)
    
    # Physical collection
    physical_kg = Column(Numeric(12, 2), nullable=False, server_default="0")  # Physical collection in KG
    physical_rate = Column(Numeric(12, 2), nullable=False, server_default="0")  # Physical collection rate per KG
    physical_amount = Column(Numeric(12, 2), nullable=False, server_default="0")  # Physical collection amount
    
    # Digital collection
    digital_kg = Column(Numeric(12, 2), nullable=False, server_default="0")  # Digital collection in KG
    digital_rate = Column(Numeric(12, 2), nullable=False, server_default="0")  # Digital collection rate per KG
    digital_amount = Column(Numeric(12, 2), nullable=False, server_default="0")  # Digital collection amount
    
    # Totals
    total_kg = Column(Numeric(12, 2), nullable=False, server_default="0")  # Total KG (physical + digital)
    total_amount = Column(Numeric(12, 2), nullable=False, server_default="0")  # Total amount (physical + digital)
    
    # Metadata
    created_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"))  # Who created the entry
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    # ORM relationships
    vendor = relationship("Vendor", backref="silk_physical_digital_entries")
    creator = relationship("User", backref="silk_physical_digital_entries_created")
