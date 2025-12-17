from sqlalchemy import Column, Integer, String, Text, TIMESTAMP, ForeignKey, func
from sqlalchemy.orm import relationship
from app.core.db import Base

class SMSLog(Base):
    __tablename__ = "sms_logs"

    id = Column(Integer, primary_key=True, index=True)

    vendor_id = Column(Integer, ForeignKey("vendors.id", ondelete="CASCADE"), nullable=False)
    farmer_id = Column(Integer, ForeignKey("farmers.id", ondelete="SET NULL"), nullable=True)

    phone = Column(String(20), nullable=False)

    # Examples: collection_received, settlement_generated, daily_summary
    sms_type = Column(String(50), nullable=False)

    message = Column(Text, nullable=False)

    # SENT / FAILED / DELIVERED
    status = Column(String(20), nullable=False)

    created_at = Column(TIMESTAMP, server_default=func.now())

    vendor = relationship("Vendor", backref="sms_logs")
    farmer = relationship("Farmer", backref="sms_logs")
