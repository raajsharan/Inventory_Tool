const svc = require('../services/fieldVisibilityService');

async function listPages(_req, res, next) {
  try {
    res.json({ items: svc.pages() });
  } catch (e) { next(e); }
}

async function getOne(req, res, next) {
  try {
    res.json(await svc.get(req.params.pageKey));
  } catch (e) { next(e); }
}

async function update(req, res, next) {
  try {
    const hidden = Array.isArray(req.body.hidden) ? req.body.hidden : [];
    res.json(await svc.save(req.params.pageKey, hidden, req.user?.id));
  } catch (e) { next(e); }
}

module.exports = { listPages, getOne, update };
