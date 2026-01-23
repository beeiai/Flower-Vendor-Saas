from sqlalchemy import Column, Integer, String, Numeric, DATE, TIMESTAMP, ForeignKey, func, Index
from sqlalchemy.orm import relationship
from app.core.db import Base


class SilkLedgerEntry(Base):
    """
    Silk ledger entries track daily transactions for silk products.
    Each entry represents a transaction with qty (pieces), kg (weight), and rate.
    """
    __tablename__ = "silk_ledger_entries"
    __table_args__ = (
        Index("ix_silk_ledger_vendor_id", "vendor_id"),
        Index("ix_silk_ledger_customer_id", "customer_id"),
        Index("ix_silk_ledger_date", "date"),
    )

    id = Column(Integer, primary_key=True, index=True)
    vendor_id = Column(Integer, ForeignKey("vendors.id", ondelete="CASCADE"), nullable=False)
    customer_id = Column(Integer, ForeignKey("farmers.id", ondelete="CASCADE"), nullable=False)

    date = Column(DATE, nullable=False)
    qty = Column(Numeric(12, 2), nullable=False)  # Pieces
    kg = Column(Numeric(12, 3), nullable=False)  # Weight in KG
    rate = Column(Numeric(12, 2), nullable=False)  # Rate per unit

    created_at = Column(TIMESTAMP, server_default=func.now())

    # ORM relationships
    vendor = relationship("Vendor", backref="silk_ledger_entries")
    customer = relationship("Farmer", backref="silk_ledger_entries")
