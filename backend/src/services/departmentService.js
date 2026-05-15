const db = require('../config/db');
const ApiError = require('../utils/ApiError');

// Tables that store an `asset_tag` column we may need to scan for usage.
const ALLOWED_TABLES = new Set(['assets', 'beijing_assets']);
function safeTable(t) {
  return ALLOWED_TABLES.has(t) ? t : 'assets';
}

async function list({ activeOnly = false } = {}) {
  const where = activeOnly ? 'WHERE is_active = TRUE' : '';
  const { rows } = await db.query(
    `SELECT id, name, min_tag, max_tag, sort_order, is_active
       FROM department_tag_ranges
       ${where}
       ORDER BY sort_order, name`
  );
  return rows;
}

async function getByName(name) {
  if (!name) return null;
  const { rows } = await db.query(
    `SELECT id, name, min_tag, max_tag, is_active
       FROM department_tag_ranges
       WHERE name = $1`,
    [name]
  );
  return rows[0] || null;
}

async function create({ name, min_tag, max_tag, sort_order, is_active }) {
  if (!name || min_tag == null || max_tag == null) {
    throw new ApiError(400, 'name, min_tag and max_tag are required');
  }
  if (!(Number.isInteger(min_tag) && Number.isInteger(max_tag)) || min_tag < 0 || max_tag < min_tag) {
    throw new ApiError(400, 'Invalid range: min_tag and max_tag must be integers with min_tag ≤ max_tag');
  }
  try {
    const { rows } = await db.query(
      `INSERT INTO department_tag_ranges (name, min_tag, max_tag, sort_order, is_active)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [name.trim(), min_tag, max_tag, sort_order ?? 0, is_active ?? true]
    );
    return rows[0];
  } catch (e) {
    if (e.code === '23505') throw new ApiError(409, 'A department with that name already exists');
    throw e;
  }
}

async function update(id, { name, min_tag, max_tag, sort_order, is_active }) {
  if (min_tag != null && max_tag != null && (min_tag < 0 || max_tag < min_tag)) {
    throw new ApiError(400, 'Invalid range: min_tag must be ≥ 0 and ≤ max_tag');
  }
  try {
    const { rows } = await db.query(
      `UPDATE department_tag_ranges
          SET name        = COALESCE($1, name),
              min_tag     = COALESCE($2, min_tag),
              max_tag     = COALESCE($3, max_tag),
              sort_order  = COALESCE($4, sort_order),
              is_active   = COALESCE($5, is_active)
        WHERE id = $6
        RETURNING *`,
      [name?.trim() || null, min_tag ?? null, max_tag ?? null, sort_order ?? null, is_active ?? null, id]
    );
    if (!rows.length) throw new ApiError(404, 'Department not found');
    const r = rows[0];
    if (r.max_tag < r.min_tag) throw new ApiError(400, 'Invalid range: max_tag must be ≥ min_tag');
    return r;
  } catch (e) {
    if (e.code === '23505') throw new ApiError(409, 'A department with that name already exists');
    throw e;
  }
}

async function remove(id) {
  const { rowCount } = await db.query(`DELETE FROM department_tag_ranges WHERE id = $1`, [id]);
  if (!rowCount) throw new ApiError(404, 'Department not found');
}

function extractTagNumber(tag) {
  const m = String(tag || '').match(/\d+/);
  return m ? parseInt(m[0], 10) : NaN;
}

async function validateDepartmentTag(department, assetTag) {
  if (!department || !assetTag) return;
  const range = await getByName(department);
  if (!range) return;
  const n = extractTagNumber(assetTag);
  if (Number.isNaN(n)) {
    throw new ApiError(400, 'Invalid asset tag', { asset_tag: 'Asset tag must contain a number' });
  }
  if (n < range.min_tag || n > range.max_tag) {
    throw new ApiError(400, 'Asset tag out of range', {
      asset_tag: `Tag ${n} is outside ${department}'s range ${range.min_tag}–${range.max_tag}`,
    });
  }
}

async function nextAvailableTag(department, table = 'assets') {
  const range = await getByName(department);
  if (!range) throw new ApiError(400, 'Unknown department');
  const used = await usedTagsForRange(range, table);
  for (let i = range.min_tag; i <= range.max_tag; i++) {
    if (!used.has(i)) return i;
  }
  return null;
}

async function usedTagsForRange(range, table = 'assets') {
  const t = safeTable(table);
  const { rows } = await db.query(
    `SELECT DISTINCT NULLIF((regexp_match(asset_tag, '\\d+'))[1], '')::int AS n
       FROM ${t}
      WHERE asset_tag ~ '\\d'`
  );
  const used = new Set();
  for (const r of rows) {
    if (r.n !== null && r.n >= range.min_tag && r.n <= range.max_tag) used.add(r.n);
  }
  return used;
}

async function tagStats(department, table = 'assets') {
  const range = await getByName(department);
  if (!range) throw new ApiError(400, 'Unknown department');
  const used = await usedTagsForRange(range, table);
  const availableAll = [];
  let nextAvailable = null;
  for (let i = range.min_tag; i <= range.max_tag; i++) {
    if (!used.has(i)) {
      availableAll.push(i);
      if (nextAvailable === null) nextAvailable = i;
    }
  }
  const total = range.max_tag - range.min_tag + 1;
  return {
    department,
    min: range.min_tag,
    max: range.max_tag,
    total,
    used: used.size,
    available: availableAll.length,
    nextAvailable,
    availableSample: availableAll.slice(0, 20),
    availableAll: availableAll.slice(0, 5000),
  };
}

async function allTagStats(table = 'assets') {
  const ranges = await list({ activeOnly: false });
  const t = safeTable(table);
  // One query: count used tags per range.
  const { rows } = await db.query(
    `SELECT NULLIF((regexp_match(asset_tag, '\\d+'))[1], '')::int AS n
       FROM ${t}
      WHERE asset_tag ~ '\\d'`
  );
  const all = rows.map(r => r.n).filter(n => n !== null);
  return ranges.map(r => {
    let used = 0;
    for (const n of all) if (n >= r.min_tag && n <= r.max_tag) used++;
    const total = r.max_tag - r.min_tag + 1;
    return {
      ...r,
      total,
      used,
      available: Math.max(0, total - used),
      usedPct: total > 0 ? Math.round((used / total) * 100) : 0,
    };
  });
}

module.exports = {
  list,
  getByName,
  create,
  update,
  remove,
  validateDepartmentTag,
  nextAvailableTag,
  tagStats,
  allTagStats,
};
