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
