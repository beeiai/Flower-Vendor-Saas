from sqlalchemy import Column, Integer, String, Numeric, DATE, TIMESTAMP, ForeignKey, func, Index, Enum as SQLEnum
from sqlalchemy.orm import relationship
from app.core.db import Base
import enum


class CollectionStatus(str, enum.Enum):
    """Status enum for silk collection reconciliation"""
    MATCHED = "MATCHED"
    MISMATCH = "MISMATCH"


class SilkCollection(Base):
    """
    Daily silk collection record tracking manual payment entries
    and reconciliation against ledger totals.
    """
    __tablename__ = "silk_collections"
    __table_args__ = (
        Index("ix_silk_collections_vendor_id", "vendor_id"),
        Index("ix_silk_collections_date", "date"),
    )

    id = Column(Integer, primary_key=True, index=True)
    vendor_id = Column(Integer, ForeignKey("vendors.id", ondelete="CASCADE"), nullable=False)

    date = Column(DATE, nullable=False, unique=False)

    # Manual payment entries
    credit_amount = Column(Numeric(12, 2), nullable=False, server_default="0")
    cash_amount = Column(Numeric(12, 2), nullable=False, server_default="0")
    upi_amount = Column(Numeric(12, 2), nullable=False, server_default="0")

    # Computed fields
    total_entered = Column(Numeric(12, 2), nullable=False)  # credit + cash + upi
    ledger_total = Column(Numeric(12, 2), nullable=False)  # From ledger aggregation
    difference = Column(Numeric(12, 2), nullable=False)  # total_entered - ledger_total

    status = Column(SQLEnum(CollectionStatus), nullable=False, default=CollectionStatus.MISMATCH)

    created_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    # ORM relationships
    vendor = relationship("Vendor", backref="silk_collections")
    creator = relationship("User", backref="silk_collections")
