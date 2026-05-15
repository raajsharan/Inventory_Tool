-- =====================================================================
-- Infrastructure Inventory Management Tool — PostgreSQL Schema
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------
-- users
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           VARCHAR(255) UNIQUE NOT NULL,
    full_name       VARCHAR(255) NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    role            VARCHAR(32) NOT NULL CHECK (role IN ('admin','asset_manager','viewer')),
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    last_login_at   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- ---------------------------------------------------------------------
-- dropdown_master
--   Holds dropdown options for OS Type, OS Version, Server Status, etc.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dropdown_master (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category        VARCHAR(64) NOT NULL,
    value           VARCHAR(255) NOT NULL,
    parent_value    VARCHAR(255),         -- e.g. OS Version belongs to an OS Type
    sort_order      INT NOT NULL DEFAULT 0,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (category, value, parent_value)
);

CREATE INDEX IF NOT EXISTS idx_dropdown_category ON dropdown_master(category);

-- ---------------------------------------------------------------------
-- department_tag_ranges
--   Admin-managed list of departments and their allowed asset-tag
--   numeric ranges. Replaces the previously hardcoded mapping.
--   Ranges may overlap across departments.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS department_tag_ranges (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(255) UNIQUE NOT NULL,
    min_tag         INT NOT NULL,
    max_tag         INT NOT NULL,
    sort_order      INT NOT NULL DEFAULT 0,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (min_tag >= 0 AND max_tag >= min_tag)
);

CREATE INDEX IF NOT EXISTS idx_dept_ranges_active ON department_tag_ranges(is_active);

INSERT INTO department_tag_ranges (name, min_tag, max_tag, sort_order) VALUES
  ('IT Team',                            1,    1000, 1),
  ('Platform Team',                      1000, 2000, 2),
  ('Boston Team (QA)',                   2000, 4000, 3),
  ('Toronto Team (QA)',                  2000, 4000, 4),
  ('Bomgar Team',                        2000, 4000, 5),
  ('Support & Service',                  4000, 5000, 6),
  ('Lab Team',                           5000, 6000, 7),
  ('Joey''s Team (Dev)',                 6000, 7000, 8),
  ('Architecture Team',                  7000, 8000, 9),
  ('PM, Support & NEA and other teams',  8000, 8500, 10),
  ('Security Team',                      8501, 9000, 11),
  ('POC Team',                           9000, 9500, 12)
ON CONFLICT (name) DO NOTHING;

-- ---------------------------------------------------------------------
-- assets
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS assets (
    id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vm_name                  VARCHAR(255) NOT NULL UNIQUE,
    os_hostname              VARCHAR(255),
    ip_address               VARCHAR(45)  NOT NULL UNIQUE,
    asset_type               VARCHAR(128),
    os_type                  VARCHAR(128),
    os_version               VARCHAR(128),
    assigned_user            VARCHAR(255),
    department               VARCHAR(255),
    business_purpose         TEXT,
    server_status            VARCHAR(64),
    patching_type            VARCHAR(64),
    server_patch_type        VARCHAR(64),
    patching_schedule        VARCHAR(128),
    location                 VARCHAR(128),
    eol_status               VARCHAR(64),
    serial_number            VARCHAR(128),
    ome_status               VARCHAR(64),
    hosted_ip                VARCHAR(45),
    asset_tag                VARCHAR(128) UNIQUE,
    asset_username           VARCHAR(255),
    asset_password_encrypted TEXT,         -- AES-256-GCM ciphertext
    additional_remarks       TEXT,
    manage_engine_installed  BOOLEAN NOT NULL DEFAULT FALSE,
    tenable_installed        BOOLEAN NOT NULL DEFAULT FALSE,
    idrac_enabled            BOOLEAN NOT NULL DEFAULT FALSE,
    created_by               UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_by               UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_assets_vm_name       ON assets(vm_name);
CREATE INDEX IF NOT EXISTS idx_assets_ip            ON assets(ip_address);
CREATE INDEX IF NOT EXISTS idx_assets_asset_tag     ON assets(asset_tag);
CREATE INDEX IF NOT EXISTS idx_assets_os_type       ON assets(os_type);
CREATE INDEX IF NOT EXISTS idx_assets_server_status ON assets(server_status);
CREATE INDEX IF NOT EXISTS idx_assets_location      ON assets(location);
CREATE INDEX IF NOT EXISTS idx_assets_eol_status    ON assets(eol_status);
CREATE INDEX IF NOT EXISTS idx_assets_department    ON assets(department);

-- ---------------------------------------------------------------------
-- custom_pages
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS custom_pages (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(128) NOT NULL UNIQUE,
    slug            VARCHAR(128) NOT NULL UNIQUE,
    description     TEXT,
    icon            VARCHAR(64),
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- custom_page_fields
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS custom_page_fields (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    page_id         UUID NOT NULL REFERENCES custom_pages(id) ON DELETE CASCADE,
    field_key       VARCHAR(128) NOT NULL,
    label           VARCHAR(255) NOT NULL,
    field_type      VARCHAR(32)  NOT NULL CHECK (field_type IN ('text','textarea','number','dropdown','toggle','date')),
    options         JSONB,                  -- for dropdown options
    is_required     BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order      INT NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (page_id, field_key)
);

CREATE INDEX IF NOT EXISTS idx_cpf_page_id ON custom_page_fields(page_id);

-- ---------------------------------------------------------------------
-- custom_page_records
--   JSONB document keyed by field_key
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS custom_page_records (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    page_id         UUID NOT NULL REFERENCES custom_pages(id) ON DELETE CASCADE,
    data            JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_by      UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cpr_page_id ON custom_page_records(page_id);
CREATE INDEX IF NOT EXISTS idx_cpr_data    ON custom_page_records USING GIN (data);

-- ---------------------------------------------------------------------
-- import_logs
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS import_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    filename        VARCHAR(255),
    total_rows      INT NOT NULL DEFAULT 0,
    success_rows    INT NOT NULL DEFAULT 0,
    failed_rows     INT NOT NULL DEFAULT 0,
    error_details   JSONB,                  -- [{row, errors:[]}]
    imported_by     UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_import_logs_created ON import_logs(created_at DESC);

-- ---------------------------------------------------------------------
-- audit_logs
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
    id              BIGSERIAL PRIMARY KEY,
    user_id         UUID REFERENCES users(id) ON DELETE SET NULL,
    user_email      VARCHAR(255),
    action          VARCHAR(64) NOT NULL,    -- LOGIN, CREATE, UPDATE, DELETE, IMPORT, EXPORT
    entity_type     VARCHAR(64),             -- asset, user, custom_page, ...
    entity_id       VARCHAR(64),
    details         JSONB,
    ip_address      VARCHAR(45),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_user    ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_entity  ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at DESC);

-- ---------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
    t TEXT;
BEGIN
    FOR t IN
        SELECT unnest(ARRAY['users','dropdown_master','assets','custom_pages','custom_page_records','department_tag_ranges'])
    LOOP
        EXECUTE format(
            'DROP TRIGGER IF EXISTS trg_%I_updated ON %I;
             CREATE TRIGGER trg_%I_updated BEFORE UPDATE ON %I
             FOR EACH ROW EXECUTE FUNCTION set_updated_at();',
            t, t, t, t
        );
    END LOOP;
END $$;
