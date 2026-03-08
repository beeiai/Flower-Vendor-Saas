"""update saala transaction columns to proper types

Revision ID: 173d01a98bce
Revises: b096f5878979
Create Date: 2026-01-23 01:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '173d01a98bce'
down_revision: Union[str, Sequence[str], None] = 'b096f5878979'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add description column if it doesn't exist
    op.add_column('saala_transactions', sa.Column('description', sa.Text(), nullable=True))
    
    # Add balance column if it doesn't exist
    op.add_column('saala_transactions', sa.Column('balance', sa.Numeric(precision=12, scale=2), nullable=True))
    
    # Update data types for existing columns to ensure proper numeric precision
    op.alter_column('saala_transactions', 'date',
               type_=sa.DateTime(timezone=True),
               existing_nullable=False)
    op.alter_column('saala_transactions', 'qty',
               type_=sa.Numeric(precision=10, scale=2),
               nullable=True)
    op.alter_column('saala_transactions', 'rate',
               type_=sa.Numeric(precision=10, scale=2),
               nullable=True)
    op.alter_column('saala_transactions', 'total_amount',
               type_=sa.Numeric(precision=12, scale=2),
               nullable=True)
    op.alter_column('saala_transactions', 'paid_amount',
               type_=sa.Numeric(precision=12, scale=2),
               nullable=True)
    op.alter_column('saala_transactions', 'created_at',
               type_=sa.DateTime(timezone=True),
               existing_nullable=True)
    op.alter_column('saala_transactions', 'updated_at',
               type_=sa.DateTime(timezone=True),
               existing_nullable=True)
    
    # Update saala_customers timestamps to timezone-aware
    op.alter_column('saala_customers', 'created_at',
               type_=sa.DateTime(timezone=True),
               existing_nullable=True)
    op.alter_column('saala_customers', 'updated_at',
               type_=sa.DateTime(timezone=True),
               existing_nullable=True)
    
    # Update saala_customers address to Text type
    op.alter_column('saala_customers', 'address',
               type_=sa.Text(),
               existing_nullable=True)


def downgrade() -> None:
    # Revert changes to saala_customers
    op.alter_column('saala_customers', 'updated_at',
               type_=postgresql.TIMESTAMP(),
               existing_nullable=True)
    op.alter_column('saala_customers', 'created_at',
               type_=postgresql.TIMESTAMP(),
               existing_nullable=True)
    op.alter_column('saala_customers', 'address',
               type_=sa.VARCHAR(length=500),
               existing_nullable=True)
    
    # Revert changes to saala_transactions
    op.alter_column('saala_transactions', 'updated_at',
               type_=postgresql.TIMESTAMP(),
               existing_nullable=True)
    op.alter_column('saala_transactions', 'created_at',
               type_=postgresql.TIMESTAMP(),
               existing_nullable=True)
    op.alter_column('saala_transactions', 'paid_amount',
               type_=sa.NUMERIC(precision=12, scale=2),
               nullable=False)
    op.alter_column('saala_transactions', 'total_amount',
               type_=sa.NUMERIC(precision=12, scale=2),
               nullable=False)
    op.alter_column('saala_transactions', 'rate',
               type_=sa.NUMERIC(precision=10, scale=2),
               nullable=False)
    op.alter_column('saala_transactions', 'qty',
               type_=sa.NUMERIC(precision=10, scale=2),
               nullable=False)
    op.alter_column('saala_transactions', 'date',
               type_=sa.DATE(),
               existing_nullable=False)
    
    op.drop_column('saala_transactions', 'balance')
    op.drop_column('saala_transactions', 'description')