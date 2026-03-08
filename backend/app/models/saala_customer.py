from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, Numeric, DECIMAL
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.db import Base
from datetime import datetime


class SaalaCustomer(Base):
    """
    SAALA customer model to track individual customers in the SAALA system.
    """
    __tablename__ = "saala_customers"

    id = Column(Integer, primary_key=True, index=True)
    vendor_id = Column(Integer, ForeignKey("vendors.id", ondelete="CASCADE"), nullable=False)
    
    name = Column(String(255), nullable=False)
    contact = Column(String(50), nullable=True)
    address = Column(Text, nullable=True)
    
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # ORM relationships
    vendor = relationship("Vendor", back_populates="saala_customers")
    transactions = relationship("SaalaTransaction", back_populates="customer", cascade="all, delete-orphan")


class SaalaTransaction(Base):
    """
    SAALA transaction model to track individual transactions for each customer.
    """
    __tablename__ = "saala_transactions"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("saala_customers.id", ondelete="CASCADE"), nullable=False)
    
    date = Column(DateTime(timezone=True), nullable=False)
    description = Column(Text, nullable=True)
    
    # Item information
    item_code = Column(String(100), nullable=True)
    item_name = Column(String(255), nullable=True)
    
    # Quantities and rates
    qty = Column(Numeric(precision=10, scale=2), nullable=True)  # Quantity
    rate = Column(Numeric(precision=10, scale=2), nullable=True)  # Rate per unit
    total_amount = Column(Numeric(precision=12, scale=2), nullable=True)  # Total amount for the transaction
    
    # Payment tracking
    paid_amount = Column(Numeric(precision=12, scale=2), nullable=True)  # Amount paid
    balance = Column(Numeric(precision=12, scale=2), nullable=True)  # Remaining balance
    
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # ORM relationships
    customer = relationship("SaalaCustomer", back_populates="transactions")