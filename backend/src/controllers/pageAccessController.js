const svc = require('../services/pageAccessService');

async function getAll(_req, res, next) {
  try { res.json(await svc.list()); } catch (e) { next(e); }
}

async function update(req, res, next) {
  try {
    const updates = Array.isArray(req.body.updates) ? req.body.updates : [];
    res.json(await svc.setMatrix(updates, req.user?.id));
  } catch (e) { next(e); }
}

module.exports = { getAll, update };
