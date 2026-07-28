-- ═══════════════════════════════════════════════════════════════════════════════
-- PROJECT TMS — SECURITY SCHEMA SQL
-- Covers: Windows Hello / Passkey device security + multi-user device assignment
-- ═══════════════════════════════════════════════════════════════════════════════
-- Two sections:
--   PART A — Supabase / PostgreSQL  (run in Supabase SQL editor)
--   PART B — Microsoft SQL Server   (run in SSMS or Azure Data Studio)
-- ═══════════════════════════════════════════════════════════════════════════════


-- ╔═════════════════════════════════════════════════════════════════════════════╗
-- ║  PART A — SUPABASE / POSTGRESQL                                            ║
-- ╚═════════════════════════════════════════════════════════════════════════════╝

-- ── 1. WebAuthn device registrations ─────────────────────────────────────────
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
  app_user_id       UUID        REFERENCES app_users(id) ON DELETE SET NULL,  -- legacy, kept for compat
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_device_reg_credential_id ON device_registrations(credential_id);
CREATE INDEX IF NOT EXISTS idx_device_reg_status        ON device_registrations(status);
CREATE INDEX IF NOT EXISTS idx_device_reg_app_user      ON device_registrations(app_user_id);

-- ── 2. Temporary WebAuthn challenges (5-minute TTL) ──────────────────────────
CREATE TABLE IF NOT EXISTS passkey_challenges (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge   TEXT        NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '5 minutes'),
  used        BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_passkey_challenges_expires ON passkey_challenges(expires_at);

-- ── 3. Multi-user device assignments (junction table) ─────────────────────────
--    One approved device can be assigned to multiple app user accounts.
--    Only those users will be able to log in from that device.
--    If no rows exist for a device, any user may log in (open policy).
CREATE TABLE IF NOT EXISTS device_user_assignments (
  id                     UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  device_registration_id UUID        NOT NULL REFERENCES device_registrations(id) ON DELETE CASCADE,
  app_user_id            UUID        NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  assigned_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (device_registration_id, app_user_id)
);

CREATE INDEX IF NOT EXISTS idx_dua_device ON device_user_assignments(device_registration_id);
CREATE INDEX IF NOT EXISTS idx_dua_user   ON device_user_assignments(app_user_id);

-- ── 4. Migrate any existing single-user assignments ───────────────────────────
INSERT INTO device_user_assignments (device_registration_id, app_user_id)
SELECT id, app_user_id
FROM device_registrations
WHERE app_user_id IS NOT NULL
ON CONFLICT (device_registration_id, app_user_id) DO NOTHING;

-- ── 5. Auto-update updated_at trigger ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_device_reg_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_device_reg_updated_at ON device_registrations;
CREATE TRIGGER trg_device_reg_updated_at
  BEFORE UPDATE ON device_registrations
  FOR EACH ROW EXECUTE FUNCTION update_device_reg_updated_at();

-- ── 6. Cleanup: expire old challenges (run periodically or as a cron) ──────────
-- DELETE FROM passkey_challenges WHERE expires_at < NOW() - INTERVAL '1 day';

-- ── 7. Useful admin queries ───────────────────────────────────────────────────

-- List all pending device requests
-- SELECT dr.requester_name, dr.device_info, dr.created_at
-- FROM device_registrations dr WHERE dr.status = 'pending' ORDER BY dr.created_at;

-- List approved devices with their allowed users
-- SELECT dr.requester_name, dr.status, au.username, au.full_name, dua.assigned_at
-- FROM device_registrations dr
-- LEFT JOIN device_user_assignments dua ON dua.device_registration_id = dr.id
-- LEFT JOIN app_users au ON au.id = dua.app_user_id
-- WHERE dr.status = 'approved'
-- ORDER BY dr.requester_name, au.username;


-- ╔═════════════════════════════════════════════════════════════════════════════╗
-- ║  PART B — MICROSOFT SQL SERVER (T-SQL)                                     ║
-- ╚═════════════════════════════════════════════════════════════════════════════╝

/*

-- ── 1. WebAuthn device registrations ─────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'device_registrations')
BEGIN
  CREATE TABLE device_registrations (
    id                UNIQUEIDENTIFIER  PRIMARY KEY DEFAULT NEWID(),
    requester_name    NVARCHAR(255)     NOT NULL,
    credential_id     NVARCHAR(1024)    NOT NULL,
    public_key_bytes  NVARCHAR(MAX)     NOT NULL,   -- base64url COSE key
    counter           BIGINT            NOT NULL DEFAULT 0,
    transports        NVARCHAR(MAX)     NOT NULL DEFAULT '[]',  -- JSON array
    device_info       NVARCHAR(MAX)     NOT NULL DEFAULT '',
    status            NVARCHAR(20)      NOT NULL DEFAULT 'pending'
                        CONSTRAINT chk_device_status CHECK (status IN ('pending','approved','rejected')),
    app_user_id       UNIQUEIDENTIFIER  NULL REFERENCES app_users(id) ON DELETE SET NULL,
    created_at        DATETIMEOFFSET    NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    updated_at        DATETIMEOFFSET    NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    last_used_at      DATETIMEOFFSET    NULL,
    CONSTRAINT uq_device_credential UNIQUE (credential_id)
  );

  CREATE INDEX idx_device_reg_credential_id ON device_registrations(credential_id);
  CREATE INDEX idx_device_reg_status        ON device_registrations(status);
  CREATE INDEX idx_device_reg_app_user      ON device_registrations(app_user_id);
END;

-- ── 2. WebAuthn challenges (5-minute TTL) ─────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'passkey_challenges')
BEGIN
  CREATE TABLE passkey_challenges (
    id          UNIQUEIDENTIFIER  PRIMARY KEY DEFAULT NEWID(),
    challenge   NVARCHAR(512)     NOT NULL,
    expires_at  DATETIMEOFFSET    NOT NULL DEFAULT DATEADD(MINUTE, 5, SYSDATETIMEOFFSET()),
    used        BIT               NOT NULL DEFAULT 0,
    created_at  DATETIMEOFFSET    NOT NULL DEFAULT SYSDATETIMEOFFSET()
  );

  CREATE INDEX idx_passkey_challenges_expires ON passkey_challenges(expires_at);
END;

-- ── 3. Multi-user device assignments ──────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'device_user_assignments')
BEGIN
  CREATE TABLE device_user_assignments (
    id                     UNIQUEIDENTIFIER  PRIMARY KEY DEFAULT NEWID(),
    device_registration_id UNIQUEIDENTIFIER  NOT NULL
                             REFERENCES device_registrations(id) ON DELETE CASCADE,
    app_user_id            UNIQUEIDENTIFIER  NOT NULL
                             REFERENCES app_users(id),
    assigned_at            DATETIMEOFFSET    NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    CONSTRAINT uq_device_user UNIQUE (device_registration_id, app_user_id)
  );

  CREATE INDEX idx_dua_device ON device_user_assignments(device_registration_id);
  CREATE INDEX idx_dua_user   ON device_user_assignments(app_user_id);
END;

-- ── 4. Migrate existing single-user assignments ───────────────────────────────
INSERT INTO device_user_assignments (device_registration_id, app_user_id)
SELECT id, app_user_id
FROM device_registrations
WHERE app_user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM device_user_assignments dua
    WHERE dua.device_registration_id = device_registrations.id
      AND dua.app_user_id = device_registrations.app_user_id
  );

-- ── 5. Auto-update updated_at via trigger ─────────────────────────────────────
IF EXISTS (SELECT 1 FROM sys.triggers WHERE name = 'trg_device_reg_updated_at')
  DROP TRIGGER trg_device_reg_updated_at;
GO

CREATE TRIGGER trg_device_reg_updated_at
ON device_registrations
AFTER UPDATE
AS
BEGIN
  SET NOCOUNT ON;
  UPDATE device_registrations
  SET updated_at = SYSDATETIMEOFFSET()
  FROM device_registrations dr
  INNER JOIN inserted i ON dr.id = i.id;
END;
GO

-- ── 6. Cleanup expired challenges ─────────────────────────────────────────────
-- DELETE FROM passkey_challenges WHERE expires_at < DATEADD(DAY, -1, SYSDATETIMEOFFSET());

-- ── 7. Useful admin queries ───────────────────────────────────────────────────

-- Pending requests
-- SELECT requester_name, device_info, created_at
-- FROM device_registrations WHERE status = 'pending' ORDER BY created_at;

-- Approved devices with allowed users
-- SELECT dr.requester_name, dr.status, au.username, au.full_name, dua.assigned_at
-- FROM device_registrations dr
-- LEFT JOIN device_user_assignments dua ON dua.device_registration_id = dr.id
-- LEFT JOIN app_users au ON au.id = dua.app_user_id
-- WHERE dr.status = 'approved'
-- ORDER BY dr.requester_name, au.username;

*/
