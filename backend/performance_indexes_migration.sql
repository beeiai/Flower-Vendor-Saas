-- PostgreSQL Performance Indexes Migration
-- Created: 2026-01-28
-- Purpose: Optimize database performance for production use

-- NOTE: Run this script during maintenance window as some indexes may take time to build

-- 1. farmers table indexes
CREATE INDEX IF NOT EXISTS ix_farmers_vendor_name ON farmers(vendor_id, name);
CREATE INDEX IF NOT EXISTS ix_farmers_group_id ON farmers(group_id);
CREATE INDEX IF NOT EXISTS ix_farmers_created_at ON farmers(created_at);

-- 2. collection_items table indexes
CREATE INDEX IF NOT EXISTS ix_collection_items_vendor_date ON collection_items(vendor_id, date);
CREATE INDEX IF NOT EXISTS ix_collection_items_farmer_date ON collection_items(farmer_id, date);
CREATE INDEX IF NOT EXISTS ix_collection_items_is_locked ON collection_items(is_locked);

-- Covering index for common aggregation queries (high impact for reporting)
CREATE INDEX IF NOT EXISTS ix_collection_items_vendor_date_covering 
ON collection_items(vendor_id, date, qty_kg, rate_per_kg, labour_per_kg, coolie_cost);

-- 3. saala_transactions table indexes
CREATE INDEX IF NOT EXISTS ix_saala_transactions_date ON saala_transactions(date);
CREATE INDEX IF NOT EXISTS ix_saala_transactions_customer_date ON saala_transactions(customer_id, date);
CREATE INDEX IF NOT EXISTS ix_saala_transactions_balance ON saala_transactions(balance);

-- Covering index for balance calculations (critical for SAALA module)
CREATE INDEX IF NOT EXISTS ix_saala_transactions_customer_date_covering 
ON saala_transactions(customer_id, date, total_amount, paid_amount, balance);

-- 4. settlements table indexes
CREATE INDEX IF NOT EXISTS ix_settlements_vendor_id ON settlements(vendor_id);
CREATE INDEX IF NOT EXISTS ix_settlements_farmer_id ON settlements(farmer_id);
CREATE INDEX IF NOT EXISTS ix_settlements_status ON settlements(status);

-- Composite index for settlement lookups (high impact)
CREATE INDEX IF NOT EXISTS ix_settlements_vendor_farmer_dates 
ON settlements(vendor_id, farmer_id, date_from, date_to);

-- 5. advances table indexes
CREATE INDEX IF NOT EXISTS ix_advances_vendor_id ON advances(vendor_id);
CREATE INDEX IF NOT EXISTS ix_advances_farmer_id ON advances(farmer_id);
CREATE INDEX IF NOT EXISTS ix_advances_vendor_farmer ON advances(vendor_id, farmer_id);

-- 6. sms_logs table indexes
CREATE INDEX IF NOT EXISTS ix_sms_logs_vendor_id ON sms_logs(vendor_id);
CREATE INDEX IF NOT EXISTS ix_sms_logs_farmer_id ON sms_logs(farmer_id);
CREATE INDEX IF NOT EXISTS ix_sms_logs_created_at ON sms_logs(created_at);
CREATE INDEX IF NOT EXISTS ix_sms_logs_status ON sms_logs(status);

-- 7. audits table indexes
CREATE INDEX IF NOT EXISTS ix_audits_vendor_id ON audits(vendor_id);
CREATE INDEX IF NOT EXISTS ix_audits_user_id ON audits(user_id);
CREATE INDEX IF NOT EXISTS ix_audits_table_name ON audits(table_name);
CREATE INDEX IF NOT EXISTS ix_audits_created_at ON audits(created_at);
CREATE INDEX IF NOT EXISTS ix_audits_vendor_created ON audits(vendor_id, created_at);

-- 8. users table indexes
CREATE INDEX IF NOT EXISTS ix_users_vendor_id ON users(vendor_id);
CREATE INDEX IF NOT EXISTS ix_users_role ON users(role);

-- 9. vehicles table indexes
CREATE INDEX IF NOT EXISTS ix_vehicles_name ON vehicles(vehicle_name);

-- Optional: Analyze tables to update statistics after index creation
ANALYZE farmers;
ANALYZE collection_items;
ANALYZE saala_transactions;
ANALYZE settlements;
ANALYZE advances;
ANALYZE sms_logs;
ANALYZE audits;
ANALYZE users;
ANALYZE vehicles;

-- Verification queries to confirm indexes were created
-- Uncomment to run manually:
-- SELECT tablename, indexname, indexdef 
-- FROM pg_indexes 
-- WHERE tablename IN (
--     'farmers', 'collection_items', 'saala_transactions', 'settlements',
--     'advances', 'sms_logs', 'audits', 'users', 'vehicles'
-- )
-- AND indexname LIKE 'ix_%'
-- ORDER BY tablename, indexname;