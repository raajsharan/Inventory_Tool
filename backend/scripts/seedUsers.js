#!/usr/bin/env node
/**
 * Seeds the default users with real bcrypt hashes.
 * Usage:  node scripts/seedUsers.js
 * Reads DB credentials from backend/.env
 */
require('dotenv').config();
const bcrypt = require('bcrypt');
const db = require('../src/config/db');

const users = [
  { email: 'admin@example.com',   fullName: 'System Admin',  password: 'Admin@123',   role: 'admin' },
  { email: 'manager@example.com', fullName: 'Asset Manager', password: 'Manager@123', role: 'asset_manager' },
  { email: 'viewer@example.com',  fullName: 'Viewer User',   password: 'Viewer@123',  role: 'viewer' },
];

(async () => {
  try {
    for (const u of users) {
      const hash = await bcrypt.hash(u.password, 12);
      await db.query(
        `INSERT INTO users (email, full_name, password_hash, role)
         VALUES ($1,$2,$3,$4)
         ON CONFLICT (email) DO UPDATE
           SET full_name = EXCLUDED.full_name,
               password_hash = EXCLUDED.password_hash,
               role = EXCLUDED.role`,
        [u.email, u.fullName, hash, u.role]
      );
      console.log(`✓ seeded ${u.email} (${u.role}) — password: ${u.password}`);
    }
    console.log('\nDone. Change these passwords after first login.');
    process.exit(0);
  } catch (e) {
    console.error('Seed failed:', e);
    process.exit(1);
  }
})();
