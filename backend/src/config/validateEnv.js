// Fail-fast validation of required secrets at process start.
// Refuses to boot with missing, too-short, or well-known sample values so a
// copied-from-.env.example config can never reach production silently.

const SAMPLE_ENCRYPTION_KEY =
  '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
const SAMPLE_JWT_SECRETS = ['replace-with-a-long-random-secret', 'changeme', 'secret'];

function fail(msg) {
  // eslint-disable-next-line no-console
  console.error(`\n[config] FATAL: ${msg}\n`);
  process.exit(1);
}

module.exports = function validateEnv() {
  const isProd = process.env.NODE_ENV === 'production';

  // --- Required in every environment ---
  for (const k of ['JWT_SECRET', 'ENCRYPTION_KEY', 'DB_PASSWORD']) {
    if (!process.env[k] || !String(process.env[k]).trim()) {
      fail(`${k} is not set. Generate one and add it to backend/.env.`);
    }
  }

  // --- JWT secret ---
  const jwt = process.env.JWT_SECRET;
  if (SAMPLE_JWT_SECRETS.includes(jwt)) {
    fail('JWT_SECRET is the published sample value. Set a unique secret.');
  }
  if (jwt.length < 32) {
    fail('JWT_SECRET must be at least 32 characters. Generate one with: '
      + 'node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"');
  }

  // --- AES-256-GCM encryption key ---
  const key = process.env.ENCRYPTION_KEY;
  if (key === SAMPLE_ENCRYPTION_KEY) {
    fail('ENCRYPTION_KEY is the published sample value — stored credentials would '
      + 'be trivially decryptable. Generate a real key with: '
      + 'node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
  }
  if (!/^[0-9a-fA-F]{64}$/.test(key)) {
    fail('ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes).');
  }

  // --- Production-only sanity checks ---
  if (isProd) {
    const origin = process.env.CORS_ORIGIN;
    if (!origin || origin === '*') {
      fail('In production, CORS_ORIGIN must be set to your frontend origin (not "*").');
    }
  }
};
