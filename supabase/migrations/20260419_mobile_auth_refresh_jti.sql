-- Mobile auth: add latest_refresh_jti for single-device refresh token rotation
-- This column stores the jti (JWT ID) of the most recently issued refresh token.
-- On refresh, the server rejects tokens whose jti doesn't match, enforcing single-device sessions.
-- Setting this to NULL revokes all refresh tokens for that user (used by logout).

ALTER TABLE users ADD COLUMN IF NOT EXISTS latest_refresh_jti UUID DEFAULT NULL;

COMMENT ON COLUMN users.latest_refresh_jti IS 'JWT ID of the latest mobile refresh token. NULL = no active mobile session.';
