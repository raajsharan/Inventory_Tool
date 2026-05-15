const db = require('../config/db');
const ApiError = require('../utils/ApiError');

const ASSET_FIELDS = [
  { key: 'vm_name',                 label: 'VM Name',                section: 'Identity',                 required: true },
  { key: 'os_hostname',             label: 'OS Hostname',            section: 'Identity' },
  { key: 'ip_address',              label: 'IP Address',             section: 'Identity',                 required: true },
  { key: 'asset_type',              label: 'Asset Type',             section: 'Identity' },
  { key: 'os_type',                 label: 'OS Type',                section: 'Identity' },
  { key: 'os_version',              label: 'OS Version',             section: 'Identity' },
  { key: 'assigned_user',           label: 'Assigned User',          section: 'Ownership' },
  { key: 'department',              label: 'Department',             section: 'Ownership' },
  { key: 'business_purpose',        label: 'Business Purpose',       section: 'Ownership' },
  { key: 'server_status',           label: 'Server Status',          section: 'Operations' },
  { key: 'patching_type',           label: 'Patching Type',          section: 'Operations' },
  { key: 'server_patch_type',       label: 'Server Patch Type',      section: 'Operations' },
  { key: 'patching_schedule',       label: 'Patching Schedule',      section: 'Operations' },
  { key: 'location',                label: 'Location',               section: 'Operations' },
  { key: 'eol_status',              label: 'EOL Status',             section: 'Operations' },
  { key: 'ome_status',              label: 'OME Status',             section: 'Operations' },
  { key: 'hosted_ip',               label: 'Hosted IP',              section: 'Operations' },
  { key: 'serial_number',           label: 'Serial Number',          section: 'Asset Tagging & Credentials' },
  { key: 'asset_username',          label: 'Asset Username',         section: 'Asset Tagging & Credentials' },
  { key: 'asset_password',          label: 'Asset Password',         section: 'Asset Tagging & Credentials' },
  { key: 'asset_tag',               label: 'Asset Tag',              section: 'Asset Tagging & Credentials', required: true },
  { key: 'additional_remarks',      label: 'Additional Remarks',     section: 'Asset Tagging & Credentials' },
  { key: 'manage_engine_installed', label: 'ManageEngine Installed', section: 'Tools' },
  { key: 'tenable_installed',       label: 'Tenable Installed',      section: 'Tools' },
  { key: 'idrac_enabled',           label: 'iDRAC Enabled',          section: 'Tools' },
];

const PAGES = {
  assets:         { key: 'assets',         label: 'Asset Inventory',         fields: ASSET_FIELDS },
  beijing_assets: { key: 'beijing_assets', label: 'Beijing Asset Inventory', fields: ASSET_FIELDS },
};

function pages() {
  return Object.values(PAGES).map(p => ({ key: p.key, label: p.label, fields: p.fields }));
}

async function get(pageKey) {
  if (!PAGES[pageKey]) throw new ApiError(400, 'Unknown page');
  const { rows } = await db.query(
    `SELECT hidden FROM page_field_visibility WHERE page_key = $1`,
    [pageKey]
  );
  const hidden = rows[0]?.hidden || [];
  return {
    page: PAGES[pageKey].key,
    label: PAGES[pageKey].label,
    fields: PAGES[pageKey].fields,
    hidden,
  };
}

async function save(pageKey, hidden, userId) {
  if (!PAGES[pageKey]) throw new ApiError(400, 'Unknown page');
  const validKeys = new Set(PAGES[pageKey].fields.map(f => f.key));
  const required  = new Set(PAGES[pageKey].fields.filter(f => f.required).map(f => f.key));
  const cleaned = Array.from(new Set(
    (Array.isArray(hidden) ? hidden : [])
      .filter(k => validKeys.has(k) && !required.has(k))
  ));
  await db.query(
    `INSERT INTO page_field_visibility (page_key, hidden, updated_by, updated_at)
     VALUES ($1, $2::jsonb, $3, NOW())
     ON CONFLICT (page_key) DO UPDATE
       SET hidden = EXCLUDED.hidden,
           updated_by = EXCLUDED.updated_by,
           updated_at = NOW()`,
    [pageKey, JSON.stringify(cleaned), userId || null]
  );
  return get(pageKey);
}

module.exports = { pages, get, save, PAGES };
