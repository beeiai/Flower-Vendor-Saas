"""create saala customers and transactions tables

Revision ID: 41e391a51297
Revises: 47875aaa76dd
Create Date: 2026-01-23 00:10:00.464568

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '41e391a51297'
down_revision: Union[str, Sequence[str], None] = '47875aaa76dd'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Create saala_customers table
    op.create_table('saala_customers',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('vendor_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('contact', sa.String(50), nullable=True),
        sa.Column('address', sa.Text(), nullable=True),
        sa.Column('created_at', sa.TIMESTAMP(), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.TIMESTAMP(), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['vendor_id'], ['vendors.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_saala_customers_id'), 'saala_customers', ['id'], unique=False)
    
    # Create saala_transactions table
    op.create_table('saala_transactions',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('customer_id', sa.Integer(), nullable=False),
        sa.Column('date', sa.TIMESTAMP(), nullable=False),
        sa.Column('item_code', sa.String(100), nullable=True),
        sa.Column('item_name', sa.String(255), nullable=False),
        sa.Column('qty', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('rate', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('total_amount', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('paid_amount', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('remarks', sa.Text(), nullable=True),
        sa.Column('created_at', sa.TIMESTAMP(), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.TIMESTAMP(), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['customer_id'], ['saala_customers.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_saala_transactions_id'), 'saala_transactions', ['id'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_saala_transactions_id'), table_name='saala_transactions')
    op.drop_table('saala_transactions')
    op.drop_index(op.f('ix_saala_customers_id'), table_name='saala_customers')
    op.drop_table('saala_customers')
