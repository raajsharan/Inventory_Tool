const svc = require('../services/reportService');

async function sources(_req, res, next) {
  try {
    res.json({ items: await svc.sources() });
  } catch (e) { next(e); }
}

async function run(req, res, next) {
  try {
    const result = await svc.run({
      source: req.body.source,
      columns: Array.isArray(req.body.columns) ? req.body.columns : [],
      filters: Array.isArray(req.body.filters) ? req.body.filters : [],
      limit: req.body.limit,
    });
    res.json(result);
  } catch (e) { next(e); }
}

module.exports = { sources, run };
