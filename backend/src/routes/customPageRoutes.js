const router = require('express').Router();
const multer = require('multer');
const { authenticate, authorize } = require('../middleware/auth');
const c = require('../controllers/customPageController');
const db = require('../config/db');
const pageAccess = require('../services/pageAccessService');
const ApiError = require('../utils/ApiError');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// Per-:id RBAC: resolve slug, then enforce page_access for `custom:<slug>`.
async function requireCustomPageAccess(req, _res, next) {
  try {
    if (!req.user) return next(new ApiError(401, 'Unauthenticated'));
    if (req.user.role === 'superadmin') return next();
    const idOrSlug = req.params.id;
    if (!idOrSlug) return next();
    // Treat values that look like UUIDs as ids, else as slugs.
    const isUuid = /^[0-9a-f-]{8,}$/i.test(idOrSlug) && idOrSlug.includes('-');
    const { rows } = await db.query(
      isUuid
        ? `SELECT slug FROM custom_pages WHERE id::text = $1`
        : `SELECT slug FROM custom_pages WHERE slug = $1`,
      [idOrSlug]
    );
    if (!rows.length) return next(); // let downstream return 404
    const ok = await pageAccess.can(req.user.role, `custom:${rows[0].slug}`);
    if (!ok) return next(new ApiError(403, 'Page access denied for your role'));
    return next();
  } catch (e) { return next(e); }
}

// List + create are page-agnostic (admin-only for create).
router.get('/', authenticate, c.list);
router.post('/', authenticate, authorize('admin'), c.create);

// Everything keyed by :id passes through the per-slug RBAC check.
router.get('/:id', authenticate, requireCustomPageAccess, c.get);
router.put('/:id', authenticate, authorize('admin'), requireCustomPageAccess, c.update);
router.delete('/:id', authenticate, authorize('admin'), requireCustomPageAccess, c.remove);

router.get('/:id/template', authenticate, authorize('admin', 'asset_manager'), requireCustomPageAccess, c.downloadTemplate);
router.post(
  '/:id/records/import',
  authenticate,
  authorize('admin', 'asset_manager'),
  requireCustomPageAccess,
  upload.single('file'),
  c.importRecords,
);

router.get('/:id/records', authenticate, requireCustomPageAccess, c.listRecords);
router.post('/:id/records', authenticate, authorize('admin', 'asset_manager'), requireCustomPageAccess, c.createRecord);
router.put('/:id/records/:recordId', authenticate, authorize('admin', 'asset_manager'), requireCustomPageAccess, c.updateRecord);
router.delete('/:id/records/:recordId', authenticate, authorize('admin'), requireCustomPageAccess, c.deleteRecord);

module.exports = router;
