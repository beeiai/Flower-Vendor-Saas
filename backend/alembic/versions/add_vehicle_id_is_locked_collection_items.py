"""add vehicle_id and is_locked to collection_items

Revision ID: abc123def456
Revises: 10720bf9574b
Create Date: 2025-01-15 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'abc123def456'
down_revision: Union[str, Sequence[str], None] = '0341bdc7606a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Make collection_id nullable
    op.alter_column('collection_items', 'collection_id',
                    existing_type=sa.Integer(),
                    nullable=True)
    
    # Add vehicle_id column
    op.add_column('collection_items', 
                  sa.Column('vehicle_id', sa.Integer(), nullable=True))
    
    # Add foreign key constraint for vehicle_id
    op.create_foreign_key('fk_collection_items_vehicle_id', 
                          'collection_items', 'vehicles', 
                          ['vehicle_id'], ['id'], 
                          ondelete='SET NULL')
    
    # Add is_locked column with default False
    op.add_column('collection_items', 
                  sa.Column('is_locked', sa.Boolean(), 
                           server_default='false', nullable=False))
    
    # Create indexes for performance
    op.create_index('ix_collection_items_vendor_id', 'collection_items', ['vendor_id'])
    op.create_index('ix_collection_items_farmer_id', 'collection_items', ['farmer_id'])


def downgrade() -> None:
    """Downgrade schema."""
    # Drop indexes
    op.drop_index('ix_collection_items_farmer_id', table_name='collection_items')
    op.drop_index('ix_collection_items_vendor_id', table_name='collection_items')
    
    # Drop columns
    op.drop_column('collection_items', 'is_locked')
    op.drop_constraint('fk_collection_items_vehicle_id', 'collection_items', type_='foreignkey')
    op.drop_column('collection_items', 'vehicle_id')
    
    # Make collection_id not nullable again
    op.alter_column('collection_items', 'collection_id',
                    existing_type=sa.Integer(),
                    nullable=False)
