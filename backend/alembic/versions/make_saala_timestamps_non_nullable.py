"""make saala timestamp columns non-nullable

Revision ID: c8f4a2b1d9e6
Revises: 173d01a98bce
Create Date: 2026-01-23 02:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'c8f4a2b1d9e6'
down_revision: Union[str, Sequence[str], None] = '173d01a98bce'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # First populate any NULL values with current timestamp
    op.execute("UPDATE saala_customers SET created_at = NOW() WHERE created_at IS NULL")
    op.execute("UPDATE saala_customers SET updated_at = NOW() WHERE updated_at IS NULL")
    op.execute("UPDATE saala_transactions SET created_at = NOW() WHERE created_at IS NULL")
    op.execute("UPDATE saala_transactions SET updated_at = NOW() WHERE updated_at IS NULL")
    
    # Make saala_customers timestamp columns non-nullable
    op.alter_column('saala_customers', 'created_at',
               existing_type=sa.DateTime(timezone=True),
               nullable=False)
    op.alter_column('saala_customers', 'updated_at',
               existing_type=sa.DateTime(timezone=True),
               nullable=False)
    
    # Make saala_transactions timestamp columns non-nullable
    op.alter_column('saala_transactions', 'created_at',
               existing_type=sa.DateTime(timezone=True),
               nullable=False)
    op.alter_column('saala_transactions', 'updated_at',
               existing_type=sa.DateTime(timezone=True),
               nullable=False)


def downgrade() -> None:
    # Revert saala_customers timestamp columns to nullable
    op.alter_column('saala_customers', 'updated_at',
               existing_type=sa.DateTime(timezone=True),
               nullable=True)
    op.alter_column('saala_customers', 'created_at',
               existing_type=sa.DateTime(timezone=True),
               nullable=True)
    
    # Revert saala_transactions timestamp columns to nullable
    op.alter_column('saala_transactions', 'updated_at',
               existing_type=sa.DateTime(timezone=True),
               nullable=True)
    op.alter_column('saala_transactions', 'created_at',
               existing_type=sa.DateTime(timezone=True),
               nullable=True)