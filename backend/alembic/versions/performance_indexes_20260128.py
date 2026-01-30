"""Performance indexes for database optimization

Revision ID: performance_indexes_20260128
Revises: 
Create Date: 2026-01-28

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'performance_indexes_20260128'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    # farmers table indexes
    op.create_index('ix_farmers_vendor_name', 'farmers', ['vendor_id', 'name'])
    op.create_index('ix_farmers_group_id', 'farmers', ['group_id'])
    op.create_index('ix_farmers_created_at', 'farmers', ['created_at'])
    
    # collection_items table indexes
    op.create_index('ix_collection_items_vendor_date', 'collection_items', ['vendor_id', 'date'])
    op.create_index('ix_collection_items_farmer_date', 'collection_items', ['farmer_id', 'date'])
    op.create_index('ix_collection_items_is_locked', 'collection_items', ['is_locked'])
    
    # Covering index for common aggregation queries
    op.create_index(
        'ix_collection_items_vendor_date_covering',
        'collection_items',
        ['vendor_id', 'date', 'qty_kg', 'rate_per_kg', 'labour_per_kg', 'coolie_cost']
    )
    
    # saala_transactions table indexes
    op.create_index('ix_saala_transactions_date', 'saala_transactions', ['date'])
    op.create_index('ix_saala_transactions_customer_date', 'saala_transactions', ['customer_id', 'date'])
    op.create_index('ix_saala_transactions_balance', 'saala_transactions', ['balance'])
    
    # Covering index for balance calculations
    op.create_index(
        'ix_saala_transactions_customer_date_covering',
        'saala_transactions',
        ['customer_id', 'date', 'total_amount', 'paid_amount', 'balance']
    )
    
    # settlements table indexes
    op.create_index('ix_settlements_vendor_id', 'settlements', ['vendor_id'])
    op.create_index('ix_settlements_farmer_id', 'settlements', ['farmer_id'])
    op.create_index('ix_settlements_status', 'settlements', ['status'])
    
    # Composite index for settlement lookups
    op.create_index(
        'ix_settlements_vendor_farmer_dates',
        'settlements',
        ['vendor_id', 'farmer_id', 'date_from', 'date_to']
    )
    
    # advances table indexes
    op.create_index('ix_advances_vendor_id', 'advances', ['vendor_id'])
    op.create_index('ix_advances_farmer_id', 'advances', ['farmer_id'])
    op.create_index('ix_advances_vendor_farmer', 'advances', ['vendor_id', 'farmer_id'])
    
    # sms_logs table indexes
    op.create_index('ix_sms_logs_vendor_id', 'sms_logs', ['vendor_id'])
    op.create_index('ix_sms_logs_farmer_id', 'sms_logs', ['farmer_id'])
    op.create_index('ix_sms_logs_created_at', 'sms_logs', ['created_at'])
    op.create_index('ix_sms_logs_status', 'sms_logs', ['status'])
    
    # audits table indexes
    op.create_index('ix_audits_vendor_id', 'audits', ['vendor_id'])
    op.create_index('ix_audits_user_id', 'audits', ['user_id'])
    op.create_index('ix_audits_table_name', 'audits', ['table_name'])
    op.create_index('ix_audits_created_at', 'audits', ['created_at'])
    op.create_index('ix_audits_vendor_created', 'audits', ['vendor_id', 'created_at'])
    
    # users table indexes
    op.create_index('ix_users_vendor_id', 'users', ['vendor_id'])
    op.create_index('ix_users_role', 'users', ['role'])
    
    # vehicles table indexes
    op.create_index('ix_vehicles_name', 'vehicles', ['vehicle_name'])


def downgrade():
    # Drop all created indexes in reverse order
    op.drop_index('ix_vehicles_name', table_name='vehicles')
    op.drop_index('ix_users_role', table_name='users')
    op.drop_index('ix_users_vendor_id', table_name='users')
    op.drop_index('ix_audits_vendor_created', table_name='audits')
    op.drop_index('ix_audits_created_at', table_name='audits')
    op.drop_index('ix_audits_table_name', table_name='audits')
    op.drop_index('ix_audits_user_id', table_name='audits')
    op.drop_index('ix_audits_vendor_id', table_name='audits')
    op.drop_index('ix_sms_logs_status', table_name='sms_logs')
    op.drop_index('ix_sms_logs_created_at', table_name='sms_logs')
    op.drop_index('ix_sms_logs_farmer_id', table_name='sms_logs')
    op.drop_index('ix_sms_logs_vendor_id', table_name='sms_logs')
    op.drop_index('ix_advances_vendor_farmer', table_name='advances')
    op.drop_index('ix_advances_farmer_id', table_name='advances')
    op.drop_index('ix_advances_vendor_id', table_name='advances')
    op.drop_index('ix_settlements_vendor_farmer_dates', table_name='settlements')
    op.drop_index('ix_settlements_status', table_name='settlements')
    op.drop_index('ix_settlements_farmer_id', table_name='settlements')
    op.drop_index('ix_settlements_vendor_id', table_name='settlements')
    op.drop_index('ix_saala_transactions_customer_date_covering', table_name='saala_transactions')
    op.drop_index('ix_saala_transactions_balance', table_name='saala_transactions')
    op.drop_index('ix_saala_transactions_customer_date', table_name='saala_transactions')
    op.drop_index('ix_saala_transactions_date', table_name='saala_transactions')
    op.drop_index('ix_collection_items_vendor_date_covering', table_name='collection_items')
    op.drop_index('ix_collection_items_is_locked', table_name='collection_items')
    op.drop_index('ix_collection_items_farmer_date', table_name='collection_items')
    op.drop_index('ix_collection_items_vendor_date', table_name='collection_items')
    op.drop_index('ix_farmers_created_at', table_name='farmers')
    op.drop_index('ix_farmers_group_id', table_name='farmers')
    op.drop_index('ix_farmers_vendor_name', table_name='farmers')