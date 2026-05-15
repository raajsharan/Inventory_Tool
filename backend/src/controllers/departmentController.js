const svc = require('../services/departmentService');

async function list(req, res, next) {
  try {
    const activeOnly = req.query.activeOnly === '1' || req.query.activeOnly === 'true';
    res.json({ items: await svc.list({ activeOnly }) });
  } catch (e) { next(e); }
}

async function create(req, res, next) {
  try {
    const created = await svc.create({
      name: req.body.name,
      min_tag: req.body.min_tag ?? req.body.minTag,
      max_tag: req.body.max_tag ?? req.body.maxTag,
      sort_order: req.body.sort_order ?? req.body.sortOrder,
      is_active: req.body.is_active ?? req.body.isActive,
    });
    res.status(201).json(created);
  } catch (e) { next(e); }
}

async function update(req, res, next) {
  try {
    const updated = await svc.update(req.params.id, {
      name: req.body.name,
      min_tag: req.body.min_tag ?? req.body.minTag,
      max_tag: req.body.max_tag ?? req.body.maxTag,
      sort_order: req.body.sort_order ?? req.body.sortOrder,
      is_active: req.body.is_active ?? req.body.isActive,
    });
    res.json(updated);
  } catch (e) { next(e); }
}

async function remove(req, res, next) {
  try {
    await svc.remove(req.params.id);
    res.status(204).end();
  } catch (e) { next(e); }
}

module.exports = { list, create, update, remove };
