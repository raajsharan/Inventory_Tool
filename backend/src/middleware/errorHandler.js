const ApiError = require('../utils/ApiError');

// eslint-disable-next-line no-unused-vars
module.exports = (err, req, res, _next) => {
  const status = err.status || 500;
  // eslint-disable-next-line no-console
  if (status >= 500) console.error('[error]', err);

  // Never leak internal error text (e.g. raw pg/SQL messages) to clients on
  // 5xx. Only expose messages/details that came from an intentional ApiError.
  const isApiError = err instanceof ApiError || typeof err.status === 'number';
  if (status >= 500 || !isApiError) {
    return res.status(status >= 500 ? status : 500).json({ error: 'Internal Server Error' });
  }
  res.status(status).json({
    error: err.message || 'Error',
    details: err.details,
  });
};
