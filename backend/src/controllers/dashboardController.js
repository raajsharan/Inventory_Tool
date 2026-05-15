const db = require('../config/db');

async function summary(_req, res, next) {
  try {
    const totalQ = db.query(`SELECT COUNT(*)::int AS c FROM assets`);
    const osQ = db.query(`
      SELECT COALESCE(os_type,'Unspecified') AS key, COUNT(*)::int AS value
        FROM assets GROUP BY 1 ORDER BY 2 DESC`);
    const statusQ = db.query(`
      SELECT COALESCE(server_status,'Unspecified') AS key, COUNT(*)::int AS value
        FROM assets GROUP BY 1 ORDER BY 2 DESC`);
    const locQ = db.query(`
      SELECT COALESCE(location,'Unspecified') AS key, COUNT(*)::int AS value
        FROM assets GROUP BY 1 ORDER BY 2 DESC`);
    const eolQ = db.query(`
      SELECT COALESCE(eol_status,'Unspecified') AS key, COUNT(*)::int AS value
        FROM assets GROUP BY 1 ORDER BY 2 DESC`);
    const missingSecQ = db.query(`
      SELECT COUNT(*)::int AS c FROM assets
        WHERE manage_engine_installed = FALSE OR tenable_installed = FALSE`);
    const recentQ = db.query(`
      SELECT id, vm_name, ip_address, os_type, server_status, location, created_at
        FROM assets ORDER BY created_at DESC LIMIT 10`);

    const [total, byOs, byStatus, byLocation, byEol, missingSec, recent] = await Promise.all([
      totalQ, osQ, statusQ, locQ, eolQ, missingSecQ, recentQ
    ]);

    res.json({
      total: total.rows[0].c,
      byOsType: byOs.rows,
      byServerStatus: byStatus.rows,
      byLocation: byLocation.rows,
      byEolStatus: byEol.rows,
      missingSecurityTools: missingSec.rows[0].c,
      recentAssets: recent.rows,
    });
  } catch (e) { next(e); }
}

module.exports = { summary };
