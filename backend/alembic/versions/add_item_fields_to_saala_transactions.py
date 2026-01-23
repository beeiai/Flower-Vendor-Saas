"""add item_code and item_name to saala_transactions

Revision ID: 8a7b1c2d3e4f
Revises: 95a3d2e4f8c1
Create Date: 2026-01-23 10:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '8a7b1c2d3e4f'
down_revision: Union[str, Sequence[str], None] = '95a3d2e4f8c1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add item_code and item_name columns to saala_transactions table
    op.add_column('saala_transactions', sa.Column('item_code', sa.String(length=100), nullable=True))
    op.add_column('saala_transactions', sa.Column('item_name', sa.String(length=255), nullable=True))


def downgrade() -> None:
    # Remove item_code and item_name columns
    op.drop_column('saala_transactions', 'item_name')
    op.drop_column('saala_transactions', 'item_code')