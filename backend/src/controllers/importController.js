const excel = require('../services/excelService');
const audit = require('../services/auditService');
const db = require('../config/db');

async function downloadTemplate(_req, res, next) {
  try {
    const wb = await excel.buildTemplate();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="asset-import-template.xlsx"');
    await wb.xlsx.write(res);
    res.end();
  } catch (e) { next(e); }
}

async function exportAssets(req, res, next) {
  try {
    const wb = await excel.exportAssets({
      search: req.query.search,
      osType: req.query.osType,
      serverStatus: req.query.serverStatus,
      location: req.query.location,
      eolStatus: req.query.eolStatus,
    });
    await audit.log({ user: req.user, action: 'EXPORT', entityType: 'asset', ipAddress: req.ip });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="assets-export.xlsx"');
    await wb.xlsx.write(res);
    res.end();
  } catch (e) { next(e); }
}

async function importAssets(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const result = await excel.importWorkbook(req.file.buffer, req.user);
    await audit.log({ user: req.user, action: 'IMPORT', entityType: 'asset', details: { total: result.total, success: result.success, failed: result.failed }, ipAddress: req.ip });
    res.json(result);
  } catch (e) { next(e); }
}

async function importHistory(_req, res, next) {
  try {
    const { rows } = await db.query(
      `SELECT id, filename, total_rows, success_rows, failed_rows, imported_by, created_at
         FROM import_logs ORDER BY created_at DESC LIMIT 100`
    );
    res.json({ items: rows });
  } catch (e) { next(e); }
}

async function importDetail(req, res, next) {
  try {
    const { rows } = await db.query(`SELECT * FROM import_logs WHERE id = $1`, [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (e) { next(e); }
}

module.exports = { downloadTemplate, exportAssets, importAssets, importHistory, importDetail };
