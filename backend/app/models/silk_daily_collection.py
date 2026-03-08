from sqlalchemy import Column, Integer, Numeric, Date, DateTime, func, UniqueConstraint
from app.core.db import Base


class SilkDailyCollection(Base):
    """
    Table to store daily Cash & UPI collections for Silk.
    This is separate from SilkCollection which handles reconciliation.
    
    Business Rules:
    - One record per date (UNIQUE constraint)
    - Cash and UPI are authoritative from this table
    - Credit comes from Saala transactions
    - Totals are computed, not stored
    """
    __tablename__ = "silk_daily_collections"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, nullable=False, index=True)

    # Scope to vendor
    vendor_id = Column(Integer, nullable=False, index=True)

    # Payment amounts - must be stored as decimals
    cash = Column(Numeric(12, 2), nullable=False, default=0)
    upi = Column(Numeric(12, 2), nullable=False, default=0)

    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    __table_args__ = (
        UniqueConstraint('vendor_id', 'date', name='uq_silk_daily_collections_vendor_date'),
    )