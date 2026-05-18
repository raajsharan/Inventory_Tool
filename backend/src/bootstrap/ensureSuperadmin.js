const bcrypt = require('bcrypt');
const db = require('../config/db');

// Idempotent bootstrap. Opt-in: when SUPERADMIN_EMAIL + SUPERADMIN_PASSWORD
// are set in the environment, ensure that user exists with role='superadmin'.
// Re-running with a different password rotates it. No password ever lives in
// the repo.
module.exports = async function ensureSuperadmin() {
  const email = (process.env.SUPERADMIN_EMAIL || '').trim().toLowerCase();
  const password = process.env.SUPERADMIN_PASSWORD;
  if (!email || !password) {
    // eslint-disable-next-line no-console
    console.log('[bootstrap] SUPERADMIN_EMAIL/SUPERADMIN_PASSWORD not set — skipping superadmin bootstrap');
    return;
  }
  try {
    const hash = await bcrypt.hash(password, 12);
    await db.query(
      `INSERT INTO users (email, full_name, password_hash, role, is_active)
       VALUES ($1, 'Superadmin', $2, 'superadmin', TRUE)
       ON CONFLICT (email) DO UPDATE
         SET password_hash = EXCLUDED.password_hash,
             role          = 'superadmin',
             is_active     = TRUE`,
      [email, hash]
    );
    // eslint-disable-next-line no-console
    console.log(`[bootstrap] superadmin ensured for ${email}`);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[bootstrap] ensureSuperadmin failed:', e.message);
  }
};
