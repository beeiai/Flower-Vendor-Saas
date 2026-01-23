"""create saala customers and transactions tables

Revision ID: b096f5878979
Revises: a749e31f1c9b
Create Date: 2026-01-23 01:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'b096f5878979'
down_revision: Union[str, Sequence[str], None] = 'a749e31f1c9b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create saala_customers table
    op.create_table('saala_customers',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('vendor_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('contact', sa.String(length=50), nullable=True),
        sa.Column('address', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=True),
        sa.ForeignKeyConstraint(['vendor_id'], ['vendors.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_saala_customers_id'), 'saala_customers', ['id'], unique=False)
    
    # Create saala_transactions table
    op.create_table('saala_transactions',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('customer_id', sa.Integer(), nullable=False),
        sa.Column('date', sa.DateTime(timezone=True), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('qty', sa.Numeric(precision=10, scale=2), nullable=True),
        sa.Column('rate', sa.Numeric(precision=10, scale=2), nullable=True),
        sa.Column('total_amount', sa.Numeric(precision=12, scale=2), nullable=True),
        sa.Column('paid_amount', sa.Numeric(precision=12, scale=2), nullable=True),
        sa.Column('balance', sa.Numeric(precision=12, scale=2), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=True),
        sa.ForeignKeyConstraint(['customer_id'], ['saala_customers.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_saala_transactions_id'), 'saala_transactions', ['id'], unique=False)
    op.create_index(op.f('ix_saala_transactions_customer_id'), 'saala_transactions', ['customer_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_saala_transactions_customer_id'), table_name='saala_transactions')
    op.drop_index(op.f('ix_saala_transactions_id'), table_name='saala_transactions')
    op.drop_table('saala_transactions')
    op.drop_index(op.f('ix_saala_customers_id'), table_name='saala_customers')
    op.drop_table('saala_customers')