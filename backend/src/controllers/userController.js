const bcrypt = require('bcrypt');
const db = require('../config/db');
const ApiError = require('../utils/ApiError');

async function list(_req, res, next) {
  try {
    const { rows } = await db.query(
      `SELECT id, email, full_name, role, is_active, last_login_at, created_at
         FROM users ORDER BY created_at DESC`
    );
    res.json({ items: rows });
  } catch (e) { next(e); }
}

async function create(req, res, next) {
  try {
    const { email, fullName, password, role } = req.body;
    if (!email || !password || !fullName || !role) throw new ApiError(400, 'Missing fields');
    if (!['admin','asset_manager','viewer'].includes(role)) throw new ApiError(400, 'Invalid role');
    const hash = await bcrypt.hash(password, 12);
    const { rows } = await db.query(
      `INSERT INTO users (email, full_name, password_hash, role)
       VALUES ($1,$2,$3,$4) RETURNING id, email, full_name, role, is_active, created_at`,
      [email.toLowerCase(), fullName, hash, role]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    if (e.code === '23505') return next(new ApiError(409, 'Email already exists'));
    next(e);
  }
}

async function update(req, res, next) {
  try {
    const { fullName, role, isActive, password } = req.body;
    const sets = [];
    const params = [];
    if (fullName !== undefined) { params.push(fullName); sets.push(`full_name = $${params.length}`); }
    if (role !== undefined)     { params.push(role);     sets.push(`role = $${params.length}`); }
    if (isActive !== undefined) { params.push(isActive); sets.push(`is_active = $${params.length}`); }
    if (password) {
      const hash = await bcrypt.hash(password, 12);
      params.push(hash); sets.push(`password_hash = $${params.length}`);
    }
    if (!sets.length) throw new ApiError(400, 'No fields to update');
    params.push(req.params.id);
    const { rows } = await db.query(
      `UPDATE users SET ${sets.join(',')} WHERE id = $${params.length}
       RETURNING id, email, full_name, role, is_active, last_login_at, created_at`,
      params
    );
    if (!rows.length) throw new ApiError(404, 'User not found');
    res.json(rows[0]);
  } catch (e) { next(e); }
}

async function remove(req, res, next) {
  try {
    const { rowCount } = await db.query(`DELETE FROM users WHERE id = $1`, [req.params.id]);
    if (!rowCount) throw new ApiError(404, 'User not found');
    res.status(204).end();
  } catch (e) { next(e); }
}

module.exports = { list, create, update, remove };
