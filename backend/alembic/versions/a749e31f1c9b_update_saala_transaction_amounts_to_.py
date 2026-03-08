"""update saala transaction amounts to numeric types

Revision ID: a749e31f1c9b
Revises: 41e391a51297
Create Date: 2026-01-23 00:13:32.219673

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'a749e31f1c9b'
down_revision: Union[str, Sequence[str], None] = '41e391a51297'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Change saala_transactions columns to numeric types for proper decimal support
    op.alter_column('saala_transactions', 'qty',
               existing_type=sa.Integer(),
               type_=sa.Numeric(precision=10, scale=2),
               existing_nullable=False,
               server_default='0')
    op.alter_column('saala_transactions', 'rate',
               existing_type=sa.Integer(),
               type_=sa.Numeric(precision=10, scale=2),
               existing_nullable=False,
               server_default='0')
    op.alter_column('saala_transactions', 'total_amount',
               existing_type=sa.Integer(),
               type_=sa.Numeric(precision=12, scale=2),
               existing_nullable=False,
               server_default='0')
    op.alter_column('saala_transactions', 'paid_amount',
               existing_type=sa.Integer(),
               type_=sa.Numeric(precision=12, scale=2),
               existing_nullable=False,
               server_default='0')


def downgrade() -> None:
    """Downgrade schema."""
    # Change saala_transactions columns back to integer types
    op.alter_column('saala_transactions', 'paid_amount',
               existing_type=sa.Numeric(precision=12, scale=2),
               type_=sa.Integer(),
               existing_nullable=False,
               server_default='0')
    op.alter_column('saala_transactions', 'total_amount',
               existing_type=sa.Numeric(precision=12, scale=2),
               type_=sa.Integer(),
               existing_nullable=False,
               server_default='0')
    op.alter_column('saala_transactions', 'rate',
               existing_type=sa.Numeric(precision=10, scale=2),
               type_=sa.Integer(),
               existing_nullable=False,
               server_default='0')
    op.alter_column('saala_transactions', 'qty',
               existing_type=sa.Numeric(precision=10, scale=2),
               type_=sa.Integer(),
               existing_nullable=False,
               server_default='0')
