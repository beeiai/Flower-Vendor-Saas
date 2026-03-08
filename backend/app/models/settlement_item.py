from sqlalchemy import Column, Integer, Numeric, ForeignKey
from sqlalchemy.orm import relationship
from app.core.db import Base


class SettlementItem(Base):
    __tablename__ = "settlement_items"

    id = Column(Integer, primary_key=True, index=True)

    settlement_id = Column(
        Integer,
        ForeignKey("settlements.id", ondelete="CASCADE"),
        nullable=False,
    )

    collection_item_id = Column(
        Integer,
        ForeignKey("collection_items.id", ondelete="CASCADE"),
        nullable=False,
    )

    # Store line total for PDF & audit (do not recompute later)
    line_total = Column(Numeric(12, 2), nullable=False)

    # ✅ RELATIONSHIPS (FIXED)
    settlement = relationship(
        "Settlement",
        back_populates="items",
    )

    collection_item = relationship(
        "CollectionItem",
        backref="settlement_items",
    )
