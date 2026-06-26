const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: Number(process.env.DB_POOL_MAX || 20),
  idleTimeoutMillis: 30000,
  // Fail fast instead of hanging forever when the DB is unreachable.
  connectionTimeoutMillis: Number(process.env.DB_CONNECT_TIMEOUT_MS || 10000),
  // Cap runaway queries so one can't pin a pooled connection indefinitely.
  statement_timeout: Number(process.env.DB_STATEMENT_TIMEOUT_MS || 30000),
});

pool.on('error', (err) => {
  // eslint-disable-next-line no-console
  console.error('[pg] idle client error', err);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  getClient: () => pool.connect(),
  pool,
};
