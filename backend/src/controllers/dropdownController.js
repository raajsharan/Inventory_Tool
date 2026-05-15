const db = require('../config/db');
const ApiError = require('../utils/ApiError');

async function list(req, res, next) {
  try {
    const where = ['is_active = TRUE'];
    const params = [];
    if (req.query.category) { params.push(req.query.category); where.push(`category = $${params.length}`); }
    const { rows } = await db.query(
      `SELECT id, category, value, parent_value, sort_order
         FROM dropdown_master
        WHERE ${where.join(' AND ')}
        ORDER BY category, sort_order, value`,
      params
    );
    // group by category
    const grouped = {};
    for (const r of rows) {
      (grouped[r.category] ||= []).push(r);
    }
    res.json({ items: rows, grouped });
  } catch (e) { next(e); }
}

async function create(req, res, next) {
  try {
    const { category, value, parent_value, sort_order } = req.body;
    if (!category || !value) throw new ApiError(400, 'category and value are required');
    const { rows } = await db.query(
      `INSERT INTO dropdown_master (category, value, parent_value, sort_order)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [category, value, parent_value || null, sort_order || 0]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    if (e.code === '23505') return next(new ApiError(409, 'Duplicate dropdown value'));
    next(e);
  }
}

async function update(req, res, next) {
  try {
    const { value, parent_value, sort_order, is_active } = req.body;
    const { rows } = await db.query(
      `UPDATE dropdown_master
          SET value = COALESCE($1, value),
              parent_value = COALESCE($2, parent_value),
              sort_order = COALESCE($3, sort_order),
              is_active = COALESCE($4, is_active)
        WHERE id = $5 RETURNING *`,
      [value, parent_value, sort_order, is_active, req.params.id]
    );
    if (!rows.length) throw new ApiError(404, 'Not found');
    res.json(rows[0]);
  } catch (e) { next(e); }
}

async function remove(req, res, next) {
  try {
    const { rowCount } = await db.query(`DELETE FROM dropdown_master WHERE id = $1`, [req.params.id]);
    if (!rowCount) throw new ApiError(404, 'Not found');
    res.status(204).end();
  } catch (e) { next(e); }
}

module.exports = { list, create, update, remove };
