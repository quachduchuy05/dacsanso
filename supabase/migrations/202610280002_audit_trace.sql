ALTER TABLE app_private.audit_events ADD COLUMN IF NOT EXISTS outcome TEXT NOT NULL DEFAULT 'unknown';
ALTER TABLE app_private.audit_events ADD COLUMN IF NOT EXISTS correlation_id TEXT;
CREATE INDEX IF NOT EXISTS audit_correlation ON app_private.audit_events(correlation_id);
CREATE INDEX IF NOT EXISTS audit_outcome ON app_private.audit_events(outcome,id);
