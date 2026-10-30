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
