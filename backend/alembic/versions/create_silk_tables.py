"""create silk tables

Revision ID: def789ghi012
Revises: abc123def456
Create Date: 2026-01-15 14:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'def789ghi012'
down_revision: Union[str, Sequence[str], None] = 'abc123def456'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema - create silk ledger and collections tables."""
    
    # Create silk_ledger_entries table
    op.create_table('silk_ledger_entries',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('vendor_id', sa.Integer(), nullable=False),
        sa.Column('customer_id', sa.Integer(), nullable=False),
        sa.Column('date', sa.DATE(), nullable=False),
        sa.Column('qty', sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column('kg', sa.Numeric(precision=12, scale=3), nullable=False),
        sa.Column('rate', sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column('created_at', sa.TIMESTAMP(), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['customer_id'], ['farmers.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['vendor_id'], ['vendors.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_silk_ledger_vendor_id', 'silk_ledger_entries', ['vendor_id'])
    op.create_index('ix_silk_ledger_customer_id', 'silk_ledger_entries', ['customer_id'])
    op.create_index('ix_silk_ledger_date', 'silk_ledger_entries', ['date'])
    op.create_index(op.f('ix_silk_ledger_entries_id'), 'silk_ledger_entries', ['id'], unique=False)

    # Create silk_collections table
    op.create_table('silk_collections',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('vendor_id', sa.Integer(), nullable=False),
        sa.Column('date', sa.DATE(), nullable=False),
        sa.Column('credit_amount', sa.Numeric(precision=12, scale=2), server_default='0', nullable=False),
        sa.Column('cash_amount', sa.Numeric(precision=12, scale=2), server_default='0', nullable=False),
        sa.Column('upi_amount', sa.Numeric(precision=12, scale=2), server_default='0', nullable=False),
        sa.Column('total_entered', sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column('ledger_total', sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column('difference', sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column('status', sa.Enum('MATCHED', 'MISMATCH', name='collectionstatus'), nullable=False),
        sa.Column('created_by', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.TIMESTAMP(), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.TIMESTAMP(), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['vendor_id'], ['vendors.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_silk_collections_vendor_id', 'silk_collections', ['vendor_id'])
    op.create_index('ix_silk_collections_date', 'silk_collections', ['date'])
    op.create_index(op.f('ix_silk_collections_id'), 'silk_collections', ['id'], unique=False)


def downgrade() -> None:
    """Downgrade schema - drop silk tables."""
    op.drop_index(op.f('ix_silk_collections_id'), table_name='silk_collections')
    op.drop_index('ix_silk_collections_date', table_name='silk_collections')
    op.drop_index('ix_silk_collections_vendor_id', table_name='silk_collections')
    op.drop_table('silk_collections')
    
    op.drop_index(op.f('ix_silk_ledger_entries_id'), table_name='silk_ledger_entries')
    op.drop_index('ix_silk_ledger_date', table_name='silk_ledger_entries')
    op.drop_index('ix_silk_ledger_customer_id', table_name='silk_ledger_entries')
    op.drop_index('ix_silk_ledger_vendor_id', table_name='silk_ledger_entries')
    op.drop_table('silk_ledger_entries')
