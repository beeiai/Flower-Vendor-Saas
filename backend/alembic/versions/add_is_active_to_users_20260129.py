"""add is_active column to users table

Revision ID: add_is_active_to_users_20260129
Revises: performance_indexes_20260128
Create Date: 2026-01-29

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_is_active_to_users_20260129'
down_revision = 'performance_indexes_20260128'
branch_labels = None
depends_on = None


def upgrade():
    # Add is_active column to users table with default True
    op.add_column('users', sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')))
    # Create index for is_active column
    op.create_index('ix_users_is_active', 'users', ['is_active'])


def downgrade():
    # Drop index first
    op.drop_index('ix_users_is_active', table_name='users')
    # Drop column
    op.drop_column('users', 'is_active')
