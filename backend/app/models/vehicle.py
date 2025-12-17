from sqlalchemy import Column, Integer, String, TIMESTAMP, ForeignKey, func
from sqlalchemy.orm import relationship
from app.core.db import Base

class Vehicle(Base):
    __tablename__ = "vehicles"

    id = Column(Integer, primary_key=True, index=True)
    vendor_id = Column(Integer, ForeignKey("vendors.id", ondelete="CASCADE"), nullable=False)

    vehicle_number = Column(String(20), nullable=False)
    vehicle_name = Column(String(100), nullable=True)
    driver_name = Column(String(100), nullable=True)

    created_at = Column(TIMESTAMP, server_default=func.now())

    vendor = relationship("Vendor", backref="vehicles")
