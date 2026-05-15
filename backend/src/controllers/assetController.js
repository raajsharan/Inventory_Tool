const svc = require('../services/assetService');
const audit = require('../services/auditService');

async function list(req, res, next) {
  try {
    const result = await svc.list({
      search: req.query.search,
      osType: req.query.osType,
      serverStatus: req.query.serverStatus,
      location: req.query.location,
      eolStatus: req.query.eolStatus,
      page: Number(req.query.page) || 1,
      pageSize: Math.min(Number(req.query.pageSize) || 20, 200),
      sortBy: req.query.sortBy,
      sortDir: req.query.sortDir,
    });
    res.json(result);
  } catch (e) { next(e); }
}

async function get(req, res, next) {
  try { res.json(await svc.get(req.params.id)); } catch (e) { next(e); }
}

async function create(req, res, next) {
  try {
    const asset = await svc.create(req.body, req.user.id);
    await audit.log({ user: req.user, action: 'CREATE', entityType: 'asset', entityId: asset.id, details: { vm_name: asset.vm_name }, ipAddress: req.ip });
    res.status(201).json(asset);
  } catch (e) { next(e); }
}

async function update(req, res, next) {
  try {
    const asset = await svc.update(req.params.id, req.body, req.user.id);
    await audit.log({ user: req.user, action: 'UPDATE', entityType: 'asset', entityId: asset.id, details: { vm_name: asset.vm_name }, ipAddress: req.ip });
    res.json(asset);
  } catch (e) { next(e); }
}

async function remove(req, res, next) {
  try {
    await svc.remove(req.params.id);
    await audit.log({ user: req.user, action: 'DELETE', entityType: 'asset', entityId: req.params.id, ipAddress: req.ip });
    res.status(204).end();
  } catch (e) { next(e); }
}

module.exports = { list, get, create, update, remove };
