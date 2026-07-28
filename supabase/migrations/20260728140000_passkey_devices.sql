-- Migration: WebAuthn / Passkey device security
-- Adds device_registrations and passkey_challenges tables

-- ── Device registrations ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS device_registrations (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_name    TEXT        NOT NULL,
  credential_id     TEXT        NOT NULL UNIQUE,
  public_key_bytes  TEXT        NOT NULL,   -- base64url-encoded COSE public key
  counter           BIGINT      NOT NULL DEFAULT 0,
  transports        JSONB       NOT NULL DEFAULT '[]',
  device_info       TEXT        NOT NULL DEFAULT '',
  status            TEXT        NOT NULL DEFAULT 'pending'
                                  CHECK (status IN ('pending','approved','rejected')),
  app_user_id       UUID        REFERENCES app_users(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_device_reg_credential_id ON device_registrations(credential_id);
CREATE INDEX IF NOT EXISTS idx_device_reg_status        ON device_registrations(status);
CREATE INDEX IF NOT EXISTS idx_device_reg_app_user      ON device_registrations(app_user_id);

-- ── Temporary WebAuthn challenges (5-minute TTL) ─────────────────────────────
CREATE TABLE IF NOT EXISTS passkey_challenges (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge   TEXT        NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '5 minutes'),
  used        BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_passkey_challenges_expires ON passkey_challenges(expires_at);

-- ── Auto-update updated_at on device_registrations ───────────────────────────
CREATE OR REPLACE FUNCTION update_device_reg_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_device_reg_updated_at ON device_registrations;
CREATE TRIGGER trg_device_reg_updated_at
  BEFORE UPDATE ON device_registrations
  FOR EACH ROW EXECUTE FUNCTION update_device_reg_updated_at();
