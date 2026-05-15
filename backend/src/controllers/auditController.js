const audit = require('../services/auditService');

async function list(req, res, next) {
  try {
    res.json(await audit.list({
      page: Number(req.query.page) || 1,
      pageSize: Math.min(Number(req.query.pageSize) || 50, 200),
      action: req.query.action,
      entityType: req.query.entityType,
      userId: req.query.userId,
    }));
  } catch (e) { next(e); }
}

module.exports = { list };
