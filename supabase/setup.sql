-- Generated from all repository migrations. Run in the intended Supabase project SQL Editor.
BEGIN;

-- Migration: 202610270001_backend.sql
-- Business data is accessible only through the Node backend. No browser access.
CREATE SCHEMA IF NOT EXISTS app_private;
REVOKE ALL ON SCHEMA app_private FROM PUBLIC;

CREATE TABLE IF NOT EXISTS app_private.app_state (
  id integer PRIMARY KEY CHECK (id = 1), version bigint NOT NULL, data text NOT NULL
);
CREATE TABLE IF NOT EXISTS app_private.sessions (
  access_hash text PRIMARY KEY, refresh_hash text UNIQUE NOT NULL,
  user_id text NOT NULL, expires_at bigint NOT NULL, refresh_expires_at bigint NOT NULL
);
CREATE TABLE IF NOT EXISTS app_private.revoked_tokens (token_hash text PRIMARY KEY, expires_at bigint NOT NULL);
CREATE INDEX IF NOT EXISTS sessions_user_idx ON app_private.sessions(user_id);
CREATE TABLE IF NOT EXISTS app_private.otp_challenges (
  id text PRIMARY KEY, phone text NOT NULL, purpose text NOT NULL,
  code_hash text NOT NULL, expires_at bigint NOT NULL, attempts integer NOT NULL DEFAULT 0, created_at bigint NOT NULL
);
CREATE INDEX IF NOT EXISTS otp_phone_idx ON app_private.otp_challenges(phone, created_at DESC);
CREATE TABLE IF NOT EXISTS app_private.receipts (
  user_id text NOT NULL, request_id text NOT NULL, fingerprint text NOT NULL,
  response text NOT NULL, created_at bigint NOT NULL, PRIMARY KEY(user_id, request_id)
);
CREATE TABLE IF NOT EXISTS app_private.audit_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id text, action text NOT NULL, target text, at text NOT NULL, detail text
);

CREATE TABLE IF NOT EXISTS app_private.export_jobs (
  id text PRIMARY KEY, user_id text NOT NULL, kind text NOT NULL, status text NOT NULL,
  filters text NOT NULL, data_as_of text NOT NULL, version bigint NOT NULL,
  filename text, content text, expires_at bigint NOT NULL
);
CREATE INDEX IF NOT EXISTS exports_user_idx ON app_private.export_jobs(user_id, data_as_of DESC);
CREATE TABLE IF NOT EXISTS app_private.rate_limits (
  key text PRIMARY KEY, count integer NOT NULL, reset_at bigint NOT NULL
);
CREATE TABLE IF NOT EXISTS app_private.webhook_events (
  provider text NOT NULL, event_id text NOT NULL, fingerprint text NOT NULL, created_at bigint NOT NULL,
  PRIMARY KEY(provider, event_id)
);

CREATE OR REPLACE FUNCTION app_private.audit_append_only() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN RAISE EXCEPTION 'Audit is append-only'; END;
$$;
DROP TRIGGER IF EXISTS audit_immutable ON app_private.audit_events;
CREATE TRIGGER audit_immutable BEFORE UPDATE OR DELETE ON app_private.audit_events
FOR EACH ROW EXECUTE FUNCTION app_private.audit_append_only();

ALTER TABLE app_private.app_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_private.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_private.revoked_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_private.otp_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_private.receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_private.audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_private.export_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_private.rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_private.webhook_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ALL TABLES IN SCHEMA app_private FROM PUBLIC;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA app_private FROM PUBLIC;
-- Supabase roles exist in hosted projects; conditional so local PostgreSQL tests also work.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON SCHEMA app_private FROM anon;
    REVOKE ALL ON ALL TABLES IN SCHEMA app_private FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON SCHEMA app_private FROM authenticated;
    REVOKE ALL ON ALL TABLES IN SCHEMA app_private FROM authenticated;
  END IF;
END $$;


-- Migration: 202610270002_storage.sql
-- Private bucket: clients cannot list or overwrite other users' objects.
INSERT INTO storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
VALUES ('app-images', 'app-images', false, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT(id) DO UPDATE SET public=false, file_size_limit=5242880,
  allowed_mime_types=ARRAY['image/jpeg', 'image/png', 'image/webp'];
-- No anon/authenticated policies are added. The Node backend authorizes each upload/read.


-- Migration: 202610270003_password_credentials.sql
CREATE TABLE IF NOT EXISTS app_private.password_credentials (user_id TEXT PRIMARY KEY,password_hash TEXT NOT NULL);
ALTER TABLE app_private.password_credentials ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON app_private.password_credentials FROM PUBLIC;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN
    REVOKE ALL ON app_private.password_credentials FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN
    REVOKE ALL ON app_private.password_credentials FROM authenticated;
  END IF;
END $$;


-- Migration: 202610280001_account_security.sql
CREATE TABLE IF NOT EXISTS app_private.password_attempts (phone TEXT PRIMARY KEY, failures INTEGER NOT NULL, locked_until BIGINT NOT NULL);
CREATE TABLE IF NOT EXISTS app_private.account_links (token_hash TEXT PRIMARY KEY,user_id TEXT NOT NULL,expires_at BIGINT NOT NULL);
CREATE TABLE IF NOT EXISTS app_private.feature_records (id TEXT PRIMARY KEY,kind TEXT NOT NULL,owner_id TEXT NOT NULL,data TEXT NOT NULL,expires_at BIGINT NOT NULL);
ALTER TABLE app_private.password_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_private.account_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_private.feature_records ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON app_private.feature_records FROM PUBLIC;
REVOKE ALL ON app_private.password_attempts,app_private.account_links FROM PUBLIC;
DO $$ BEGIN
  IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN REVOKE ALL ON app_private.password_attempts,app_private.account_links FROM anon; END IF;
  IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN REVOKE ALL ON app_private.password_attempts,app_private.account_links FROM authenticated; END IF;
END $$;


-- Migration: 202610280002_audit_trace.sql
ALTER TABLE app_private.audit_events ADD COLUMN IF NOT EXISTS outcome TEXT NOT NULL DEFAULT 'unknown';
ALTER TABLE app_private.audit_events ADD COLUMN IF NOT EXISTS correlation_id TEXT;
CREATE INDEX IF NOT EXISTS audit_correlation ON app_private.audit_events(correlation_id);
CREATE INDEX IF NOT EXISTS audit_outcome ON app_private.audit_events(outcome,id);


-- Migration: 202610290001_srs_followup.sql
-- Lookup indexes for persistent export queue and SRS feature workflows.
-- No historical orders, ledger entries, accounts or audit events are rewritten.
CREATE INDEX IF NOT EXISTS exports_queue_idx ON app_private.export_jobs(status, data_as_of);
CREATE INDEX IF NOT EXISTS feature_kind_owner_idx ON app_private.feature_records(kind, owner_id);

COMMIT;
