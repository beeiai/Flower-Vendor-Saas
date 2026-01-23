"""remove deprecated saala transaction columns

Revision ID: 95a3d2e4f8c1
Revises: c8f4a2b1d9e6
Create Date: 2026-01-23 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '95a3d2e4f8c1'
down_revision: Union[str, Sequence[str], None] = 'c8f4a2b1d9e6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Drop deprecated columns from saala_transactions table
    op.drop_column('saala_transactions', 'item_name')
    op.drop_column('saala_transactions', 'item_code')
    op.drop_column('saala_transactions', 'remarks')


def downgrade() -> None:
    # Recreate deprecated columns (making item_name nullable to avoid constraint issues)
    op.add_column('saala_transactions', sa.Column('remarks', sa.VARCHAR(length=500), autoincrement=False, nullable=True))
    op.add_column('saala_transactions', sa.Column('item_code', sa.VARCHAR(length=100), autoincrement=False, nullable=True))
    op.add_column('saala_transactions', sa.Column('item_name', sa.VARCHAR(length=255), autoincrement=False, nullable=True))