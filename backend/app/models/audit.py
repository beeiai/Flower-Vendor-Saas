from sqlalchemy import Column, Integer, String, TIMESTAMP, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.db import Base

class Audit(Base):
    __tablename__ = "audits"

    id = Column(Integer, primary_key=True, index=True)

    vendor_id = Column(
        Integer,
        ForeignKey("vendors.id", ondelete="CASCADE"),
        nullable=False
    )

    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True
    )

    table_name = Column(String(50), nullable=False)
    record_id = Column(Integer, nullable=False)

    # INSERT / UPDATE / DELETE
    action = Column(String(20), nullable=False)

    before_data = Column(JSON, nullable=True)
    after_data = Column(JSON, nullable=True)

    created_at = Column(TIMESTAMP, server_default=func.now())

    vendor = relationship("Vendor", backref="audits")
    user = relationship("User", backref="audits")
