require('dotenv').config();
require('./src/config/validateEnv')();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');

const swaggerSpec = require('./src/config/swagger');
const errorHandler = require('./src/middleware/errorHandler');
const routes = require('./src/routes');
const { pool } = require('./src/config/db');

const app = express();

// Behind nginx — trust the first proxy hop so req.ip / X-Forwarded-For and the
// rate limiter see the real client address rather than 127.0.0.1.
app.set('trust proxy', Number(process.env.TRUST_PROXY_HOPS || 1));

app.use(helmet());

// CORS: auth is via the Authorization header (no cookies), so credentials are
// not needed. Default to a closed origin rather than a permissive wildcard.
const corsOrigin = process.env.CORS_ORIGIN || (process.env.NODE_ENV === 'production' ? false : '*');
app.use(cors({ origin: corsOrigin }));

app.use(express.json({ limit: process.env.JSON_BODY_LIMIT || '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Global rate limit (login has its own stricter limiter in authRoutes).
app.use('/api', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_MAX || 1000),
  standardHeaders: true,
  legacyHeaders: false,
}));

// Liveness — process is up.
app.get('/health', (_req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));
// Readiness — process can reach the database.
app.get('/ready', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ready' });
  } catch (e) {
    res.status(503).json({ status: 'unavailable', error: e.message });
  }
});

app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use('/api', routes);

app.use((req, res) => res.status(404).json({ error: 'Not found', path: req.path }));
app.use(errorHandler);

const PORT = process.env.PORT || 4000;
let server;

(async () => {
  try {
    await require('./src/bootstrap/ensureSuperadmin')();
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[bootstrap] failed:', e);
  }
  try {
    await require('./src/services/backupScheduler').start();
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[backup-scheduler] failed to start:', e);
  }
  server = app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`[inventory-api] listening on :${PORT} (${process.env.NODE_ENV || 'development'})`);
  });
})();

// --- Graceful shutdown (systemd sends SIGTERM on restart) ---
let shuttingDown = false;
async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  // eslint-disable-next-line no-console
  console.log(`[inventory-api] ${signal} received — shutting down`);
  const forceExit = setTimeout(() => {
    // eslint-disable-next-line no-console
    console.error('[inventory-api] forced exit after timeout');
    process.exit(1);
  }, 10000);
  forceExit.unref();
  try {
    try { require('./src/services/backupScheduler').stop(); } catch {}
    if (server) await new Promise((resolve) => server.close(resolve));
    await pool.end();
    clearTimeout(forceExit);
    process.exit(0);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[inventory-api] error during shutdown:', e);
    process.exit(1);
  }
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  // eslint-disable-next-line no-console
  console.error('[inventory-api] unhandledRejection:', reason);
});
process.on('uncaughtException', (err) => {
  // eslint-disable-next-line no-console
  console.error('[inventory-api] uncaughtException:', err);
  shutdown('uncaughtException');
});

module.exports = app;
