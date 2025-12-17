from sqlalchemy import Column, Integer, DATE, TIMESTAMP, ForeignKey, func
from sqlalchemy.orm import relationship
from app.core.db import Base

class Collection(Base):
    __tablename__ = "collections"

    id = Column(Integer, primary_key=True, index=True)
    
    vendor_id = Column(Integer, ForeignKey("vendors.id", ondelete="CASCADE"), nullable=False)
    vehicle_id = Column(Integer, ForeignKey("vehicles.id", ondelete="SET NULL"), nullable=True)

    date = Column(DATE, nullable=False)

    created_at = Column(TIMESTAMP, server_default=func.now())

    vendor = relationship("Vendor", backref="collections")
    vehicle = relationship("Vehicle", backref="collections")
