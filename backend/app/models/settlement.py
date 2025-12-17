from sqlalchemy import (
    Column, Integer, Numeric, DATE, TIMESTAMP, ForeignKey, Text, func
)
from sqlalchemy.orm import relationship
from app.core.db import Base

class Settlement(Base):
    __tablename__ = "settlements"

    id = Column(Integer, primary_key=True, index=True)

    vendor_id = Column(Integer, ForeignKey("vendors.id", ondelete="CASCADE"), nullable=False)
    farmer_id = Column(Integer, ForeignKey("farmers.id", ondelete="CASCADE"), nullable=False)

    date_from = Column(DATE, nullable=False)
    date_to = Column(DATE, nullable=False)

    total_qty = Column(Numeric(12, 2), nullable=False)
    total_amount = Column(Numeric(12, 2), nullable=False)

    total_labour = Column(Numeric(12, 2), nullable=True)
    total_coolie = Column(Numeric(12, 2), nullable=True)
    total_transport = Column(Numeric(12, 2), nullable=True)

    commission_percent = Column(Numeric(5, 2), nullable=False)
    total_commission = Column(Numeric(12, 2), nullable=False)

    advance_deducted = Column(Numeric(12, 2), nullable=True)

    net_payable = Column(Numeric(12, 2), nullable=False)

    pdf_url = Column(Text, nullable=True)

    created_at = Column(TIMESTAMP, server_default=func.now())

    vendor = relationship("Vendor", backref="settlements")
    farmer = relationship("Farmer", backref="settlements")
