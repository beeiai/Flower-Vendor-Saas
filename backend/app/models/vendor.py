from sqlalchemy import Column, Integer, String, Text, TIMESTAMP, func
from sqlalchemy.orm import relationship
from app.core.db import Base

class Vendor(Base):
    __tablename__ = "vendors"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False)
    owner_name = Column(String(150), nullable=False)
    phone = Column(String(20), nullable=False)
    email = Column(String(120), unique=True, nullable=False)
    password_hash = Column(Text, nullable=False)
    address = Column(Text)
    plan_type = Column(String(50), default="basic")
    created_at = Column(TIMESTAMP, server_default=func.now())

    # Relationships
    saala_customers = relationship("SaalaCustomer", back_populates="vendor")
