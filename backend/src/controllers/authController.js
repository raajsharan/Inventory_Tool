const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const ApiError = require('../utils/ApiError');
const audit = require('../services/auditService');

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const { rows } = await db.query(
      `SELECT id, email, full_name, password_hash, role, is_active
         FROM users WHERE email = $1`,
      [email.toLowerCase()]
    );
    const user = rows[0];
    if (!user || !user.is_active) throw new ApiError(401, 'Invalid credentials');

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) throw new ApiError(401, 'Invalid credentials');

    await db.query(`UPDATE users SET last_login_at = NOW() WHERE id = $1`, [user.id]);

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.full_name },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '12h' }
    );

    await audit.log({
      user: { id: user.id, email: user.email },
      action: 'LOGIN',
      ipAddress: req.ip,
    });

    res.json({
      token,
      user: { id: user.id, email: user.email, fullName: user.full_name, role: user.role },
    });
  } catch (e) { next(e); }
}

async function me(req, res) {
  res.json({ user: req.user });
}

module.exports = { login, me };
