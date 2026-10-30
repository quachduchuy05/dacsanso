-- Lookup indexes for persistent export queue and SRS feature workflows.
-- No historical orders, ledger entries, accounts or audit events are rewritten.
CREATE INDEX IF NOT EXISTS exports_queue_idx ON app_private.export_jobs(status, data_as_of);
CREATE INDEX IF NOT EXISTS feature_kind_owner_idx ON app_private.feature_records(kind, owner_id);
