const db = require('../config/db');
const ApiError = require('../utils/ApiError');
const audit = require('../services/auditService');

function slugify(s) {
  return String(s || '').toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

async function list(_req, res, next) {
  try {
    const { rows } = await db.query(
      `SELECT cp.*, COALESCE(json_agg(cpf.* ORDER BY cpf.sort_order) FILTER (WHERE cpf.id IS NOT NULL), '[]') AS fields
         FROM custom_pages cp
         LEFT JOIN custom_page_fields cpf ON cpf.page_id = cp.id
        WHERE cp.is_active = TRUE
        GROUP BY cp.id
        ORDER BY cp.created_at ASC`
    );
    res.json({ items: rows });
  } catch (e) { next(e); }
}

async function get(req, res, next) {
  try {
    const { rows } = await db.query(
      `SELECT cp.*, COALESCE(json_agg(cpf.* ORDER BY cpf.sort_order) FILTER (WHERE cpf.id IS NOT NULL), '[]') AS fields
         FROM custom_pages cp
         LEFT JOIN custom_page_fields cpf ON cpf.page_id = cp.id
        WHERE cp.id::text = $1 OR cp.slug = $1
        GROUP BY cp.id`,
      [req.params.id]
    );
    if (!rows.length) throw new ApiError(404, 'Page not found');
    res.json(rows[0]);
  } catch (e) { next(e); }
}

async function create(req, res, next) {
  const client = await db.getClient();
  try {
    const { name, description, icon, fields } = req.body;
    if (!name) throw new ApiError(400, 'name is required');
    if (!Array.isArray(fields) || !fields.length) throw new ApiError(400, 'At least one field is required');

    await client.query('BEGIN');
    const slug = slugify(name);
    const page = await client.query(
      `INSERT INTO custom_pages (name, slug, description, icon, created_by)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [name, slug, description || null, icon || null, req.user.id]
    );

    for (let i = 0; i < fields.length; i++) {
      const f = fields[i];
      if (!f.label || !f.field_type) throw new ApiError(400, `Field #${i+1} requires label and field_type`);
      const key = slugify(f.field_key || f.label).replace(/-/g, '_');
      await client.query(
        `INSERT INTO custom_page_fields (page_id, field_key, label, field_type, options, is_required, sort_order)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [page.rows[0].id, key, f.label, f.field_type, f.options ? JSON.stringify(f.options) : null, !!f.is_required, i]
      );
    }
    await client.query('COMMIT');
    await audit.log({ user: req.user, action: 'CREATE', entityType: 'custom_page', entityId: page.rows[0].id, details: { name }, ipAddress: req.ip });
    res.status(201).json(page.rows[0]);
  } catch (e) {
    await client.query('ROLLBACK');
    if (e.code === '23505') return next(new ApiError(409, 'Page name already exists'));
    next(e);
  } finally { client.release(); }
}

async function remove(req, res, next) {
  try {
    const { rowCount } = await db.query(`DELETE FROM custom_pages WHERE id = $1`, [req.params.id]);
    if (!rowCount) throw new ApiError(404, 'Not found');
    await audit.log({ user: req.user, action: 'DELETE', entityType: 'custom_page', entityId: req.params.id, ipAddress: req.ip });
    res.status(204).end();
  } catch (e) { next(e); }
}

async function listRecords(req, res, next) {
  try {
    const page = Number(req.query.page) || 1;
    const pageSize = Math.min(Number(req.query.pageSize) || 50, 500);
    const offset = (page - 1) * pageSize;
    const [items, count] = await Promise.all([
      db.query(
        `SELECT id, data, created_at, updated_at FROM custom_page_records
          WHERE page_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
        [req.params.id, pageSize, offset]
      ),
      db.query(`SELECT COUNT(*)::int AS c FROM custom_page_records WHERE page_id = $1`, [req.params.id]),
    ]);
    res.json({ items: items.rows, total: count.rows[0].c, page, pageSize });
  } catch (e) { next(e); }
}

async function createRecord(req, res, next) {
  try {
    const { rows } = await db.query(
      `INSERT INTO custom_page_records (page_id, data, created_by, updated_by)
       VALUES ($1,$2,$3,$3) RETURNING *`,
      [req.params.id, JSON.stringify(req.body.data || {}), req.user.id]
    );
    await audit.log({ user: req.user, action: 'CREATE', entityType: 'custom_page_record', entityId: rows[0].id, ipAddress: req.ip });
    res.status(201).json(rows[0]);
  } catch (e) { next(e); }
}

async function updateRecord(req, res, next) {
  try {
    const { rows } = await db.query(
      `UPDATE custom_page_records SET data = $1, updated_by = $2
        WHERE id = $3 AND page_id = $4 RETURNING *`,
      [JSON.stringify(req.body.data || {}), req.user.id, req.params.recordId, req.params.id]
    );
    if (!rows.length) throw new ApiError(404, 'Record not found');
    await audit.log({ user: req.user, action: 'UPDATE', entityType: 'custom_page_record', entityId: rows[0].id, ipAddress: req.ip });
    res.json(rows[0]);
  } catch (e) { next(e); }
}

async function deleteRecord(req, res, next) {
  try {
    const { rowCount } = await db.query(
      `DELETE FROM custom_page_records WHERE id = $1 AND page_id = $2`,
      [req.params.recordId, req.params.id]
    );
    if (!rowCount) throw new ApiError(404, 'Record not found');
    await audit.log({ user: req.user, action: 'DELETE', entityType: 'custom_page_record', entityId: req.params.recordId, ipAddress: req.ip });
    res.status(204).end();
  } catch (e) { next(e); }
}

module.exports = { list, get, create, remove, listRecords, createRecord, updateRecord, deleteRecord };
