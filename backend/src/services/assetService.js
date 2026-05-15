const db = require('../config/db');
const crypto = require('../utils/crypto');
const ApiError = require('../utils/ApiError');

// Department → allowed asset-tag numeric range (inclusive). Ranges may overlap across teams.
const DEPARTMENT_TAG_RANGES = {
  'IT Team':                            { min: 1,    max: 1000 },
  'Platform Team':                      { min: 1000, max: 2000 },
  'Boston Team (QA)':                   { min: 2000, max: 4000 },
  'Toronto Team (QA)':                  { min: 2000, max: 4000 },
  'Bomgar Team':                        { min: 2000, max: 4000 },
  'Support & Service':                  { min: 4000, max: 5000 },
  'Lab Team':                           { min: 5000, max: 6000 },
  "Joey's Team (Dev)":                  { min: 6000, max: 7000 },
  'Architecture Team':                  { min: 7000, max: 8000 },
  'PM, Support & NEA and other teams':  { min: 8000, max: 8500 },
  'Security Team':                      { min: 8501, max: 9000 },
  'POC Team':                           { min: 9000, max: 9500 },
};

function validateDepartmentTag(department, assetTag) {
  if (!department || !assetTag) return;
  const range = DEPARTMENT_TAG_RANGES[department];
  if (!range) return; // unknown/legacy department — skip
  const m = String(assetTag).match(/\d+/);
  const n = m ? parseInt(m[0], 10) : NaN;
  if (Number.isNaN(n)) {
    throw new ApiError(400, 'Invalid asset tag', { asset_tag: 'Asset tag must contain a number' });
  }
  if (n < range.min || n > range.max) {
    throw new ApiError(400, 'Asset tag out of range', {
      asset_tag: `Tag ${n} is outside ${department}'s range ${range.min}–${range.max}`,
    });
  }
}

const ASSET_COLUMNS = [
  'vm_name','os_hostname','ip_address','asset_type','os_type','os_version',
  'assigned_user','department','business_purpose','server_status','patching_type',
  'server_patch_type','patching_schedule','location','eol_status','serial_number',
  'ome_status','hosted_ip','asset_tag','asset_username','additional_remarks',
  'manage_engine_installed','tenable_installed','idrac_enabled'
];

function mapBody(body) {
  const row = {};
  for (const c of ASSET_COLUMNS) {
    const camel = c.replace(/_([a-z])/g, (_, ch) => ch.toUpperCase());
    if (body[camel] !== undefined)      row[c] = body[camel];
    else if (body[c] !== undefined)     row[c] = body[c];
  }
  if (body.assetPassword !== undefined || body.asset_password !== undefined) {
    row.asset_password_encrypted = crypto.encrypt(body.assetPassword ?? body.asset_password);
  }
  return row;
}

async function checkDuplicates({ vm_name, ip_address, asset_tag, excludeId }) {
  const conds = [];
  const params = [];
  if (vm_name)    { params.push(vm_name);    conds.push(`vm_name = $${params.length}`); }
  if (ip_address) { params.push(ip_address); conds.push(`ip_address = $${params.length}`); }
  if (asset_tag)  { params.push(asset_tag);  conds.push(`asset_tag = $${params.length}`); }
  if (!conds.length) return;
  let sql = `SELECT vm_name, ip_address, asset_tag FROM assets WHERE (${conds.join(' OR ')})`;
  if (excludeId) { params.push(excludeId); sql += ` AND id <> $${params.length}`; }
  const { rows } = await db.query(sql, params);
  const dupes = {};
  for (const r of rows) {
    if (vm_name && r.vm_name === vm_name)       dupes.vm_name = 'duplicate VM name';
    if (ip_address && r.ip_address === ip_address) dupes.ip_address = 'duplicate IP address';
    if (asset_tag && r.asset_tag === asset_tag) dupes.asset_tag = 'duplicate asset tag';
  }
  if (Object.keys(dupes).length) {
    throw new ApiError(409, 'Duplicate values', dupes);
  }
}

async function create(body, userId) {
  const row = mapBody(body);
  validateDepartmentTag(row.department, row.asset_tag);
  await checkDuplicates({
    vm_name: row.vm_name,
    ip_address: row.ip_address,
    asset_tag: row.asset_tag,
  });
  row.created_by = userId;
  row.updated_by = userId;
  const cols = Object.keys(row);
  const vals = Object.values(row);
  const placeholders = cols.map((_, i) => `$${i + 1}`).join(',');
  const { rows } = await db.query(
    `INSERT INTO assets (${cols.join(',')}) VALUES (${placeholders}) RETURNING *`,
    vals
  );
  return scrub(rows[0]);
}

async function update(id, body, userId) {
  const row = mapBody(body);
  if (!Object.keys(row).length) throw new ApiError(400, 'No fields to update');
  if (row.department !== undefined || row.asset_tag !== undefined) {
    const existing = await db.query(`SELECT department, asset_tag FROM assets WHERE id = $1`, [id]);
    if (!existing.rows.length) throw new ApiError(404, 'Asset not found');
    const effDept = row.department !== undefined ? row.department : existing.rows[0].department;
    const effTag  = row.asset_tag  !== undefined ? row.asset_tag  : existing.rows[0].asset_tag;
    validateDepartmentTag(effDept, effTag);
  }
  await checkDuplicates({
    vm_name: row.vm_name,
    ip_address: row.ip_address,
    asset_tag: row.asset_tag,
    excludeId: id,
  });
  row.updated_by = userId;
  const cols = Object.keys(row);
  const vals = Object.values(row);
  const set = cols.map((c, i) => `${c} = $${i + 1}`).join(',');
  vals.push(id);
  const { rows } = await db.query(
    `UPDATE assets SET ${set} WHERE id = $${vals.length} RETURNING *`,
    vals
  );
  if (!rows.length) throw new ApiError(404, 'Asset not found');
  return scrub(rows[0]);
}

async function remove(id) {
  const { rowCount } = await db.query(`DELETE FROM assets WHERE id = $1`, [id]);
  if (!rowCount) throw new ApiError(404, 'Asset not found');
}

async function get(id) {
  const { rows } = await db.query(`SELECT * FROM assets WHERE id = $1`, [id]);
  if (!rows.length) throw new ApiError(404, 'Asset not found');
  return scrub(rows[0]);
}

async function list({ search, osType, serverStatus, location, eolStatus, page = 1, pageSize = 20, sortBy = 'created_at', sortDir = 'desc' }) {
  const where = [];
  const params = [];
  if (search) {
    params.push(`%${search}%`);
    const i = params.length;
    where.push(`(vm_name ILIKE $${i} OR os_hostname ILIKE $${i} OR ip_address ILIKE $${i} OR assigned_user ILIKE $${i} OR department ILIKE $${i})`);
  }
  if (osType)       { params.push(osType);       where.push(`os_type = $${params.length}`); }
  if (serverStatus) { params.push(serverStatus); where.push(`server_status = $${params.length}`); }
  if (location)     { params.push(location);     where.push(`location = $${params.length}`); }
  if (eolStatus)    { params.push(eolStatus);    where.push(`eol_status = $${params.length}`); }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const safeSort = ['vm_name','ip_address','os_type','server_status','location','eol_status','created_at','updated_at'].includes(sortBy) ? sortBy : 'created_at';
  const safeDir = String(sortDir).toLowerCase() === 'asc' ? 'ASC' : 'DESC';
  const offset = (page - 1) * pageSize;

  const [items, count] = await Promise.all([
    db.query(
      `SELECT * FROM assets ${whereSql}
       ORDER BY ${safeSort} ${safeDir}
       LIMIT ${pageSize} OFFSET ${offset}`,
      params
    ),
    db.query(`SELECT COUNT(*)::int AS c FROM assets ${whereSql}`, params),
  ]);

  return {
    items: items.rows.map(scrub),
    total: count.rows[0].c,
    page,
    pageSize,
  };
}

async function tagStats(department) {
  const range = DEPARTMENT_TAG_RANGES[department];
  if (!range) throw new ApiError(400, 'Unknown department');
  const { rows } = await db.query(
    `SELECT DISTINCT NULLIF((regexp_match(asset_tag, '\\d+'))[1], '')::int AS n
       FROM assets
      WHERE asset_tag ~ '\\d'`
  );
  const used = new Set();
  for (const r of rows) {
    if (r.n !== null && r.n >= range.min && r.n <= range.max) used.add(r.n);
  }
  const availableAll = [];
  let nextAvailable = null;
  for (let i = range.min; i <= range.max; i++) {
    if (!used.has(i)) {
      availableAll.push(i);
      if (nextAvailable === null) nextAvailable = i;
    }
  }
  const total = range.max - range.min + 1;
  return {
    department,
    min: range.min,
    max: range.max,
    total,
    used: used.size,
    available: availableAll.length,
    nextAvailable,
    availableSample: availableAll.slice(0, 20),
    availableAll: availableAll.slice(0, 5000),
  };
}

function scrub(row) {
  const { asset_password_encrypted, ...rest } = row;
  return { ...rest, hasPassword: !!asset_password_encrypted };
}

module.exports = { create, update, remove, get, list, ASSET_COLUMNS, DEPARTMENT_TAG_RANGES, validateDepartmentTag, tagStats };
