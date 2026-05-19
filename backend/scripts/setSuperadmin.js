#!/usr/bin/env node
/**
 * Create or rotate the superadmin user.
 *
 * Usage:
 *   node scripts/setSuperadmin.js <email> <password>
 *   node scripts/setSuperadmin.js              (interactive — password is hidden)
 *
 * Or via npm:
 *   npm run set-superadmin -- <email> <password>
 *   npm run set-superadmin                     (interactive)
 *
 * Idempotent: re-running with the same email rotates the password in place.
 * Takes effect immediately — no backend restart required.
 */
require('dotenv').config();
const bcrypt = require('bcrypt');
const readline = require('readline');
const db = require('../src/config/db');

function prompt(question, { hidden = false } = {}) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    if (!hidden) {
      rl.question(question, (answer) => { rl.close(); resolve(answer.trim()); });
      return;
    }
    // Mask password input — write nothing to stdout while typing.
    const stdin = process.stdin;
    process.stdout.write(question);
    let value = '';
    stdin.setRawMode && stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');
    const onData = (chunk) => {
      for (const ch of chunk) {
        if (ch === '\n' || ch === '\r' || ch === '') {
          stdin.setRawMode && stdin.setRawMode(false);
          stdin.pause();
          stdin.removeListener('data', onData);
          process.stdout.write('\n');
          rl.close();
          return resolve(value);
        }
        if (ch === '') process.exit(130);     // Ctrl-C
        if (ch === '' || ch === '\b') {
          if (value.length) value = value.slice(0, -1);
        } else {
          value += ch;
        }
      }
    };
    stdin.on('data', onData);
  });
}

(async () => {
  try {
    let email = (process.argv[2] || '').trim();
    let password = process.argv[3] || '';

    if (!email)    email = await prompt('Superadmin email: ');
    if (!password) password = await prompt('Superadmin password: ', { hidden: true });

    if (!email || !email.includes('@')) {
      console.error('A valid email is required.');
      process.exit(1);
    }
    if (!password || password.length < 8) {
      console.error('Password must be at least 8 characters.');
      process.exit(1);
    }

    const hash = await bcrypt.hash(password, 12);
    await db.query(
      `INSERT INTO users (email, full_name, password_hash, role, is_active)
       VALUES ($1, 'Superadmin', $2, 'superadmin', TRUE)
       ON CONFLICT (email) DO UPDATE
         SET password_hash = EXCLUDED.password_hash,
             role          = 'superadmin',
             is_active     = TRUE`,
      [email.toLowerCase(), hash]
    );
    console.log(`\n✓ Superadmin set: ${email.toLowerCase()}`);
    console.log('  Effective immediately — log in with the new password.');
    process.exit(0);
  } catch (e) {
    console.error('Failed:', e.message || e);
    process.exit(1);
  }
})();
