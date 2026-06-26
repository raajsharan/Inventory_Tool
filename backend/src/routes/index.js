const router = require('express').Router();
const { authenticate, requirePageAccess, blockUntilPasswordChanged } = require('../middleware/auth');

// Shorthand: authenticated + (optional) page-access + password-change gate.
const guard = (pageKey) => pageKey
  ? [authenticate, blockUntilPasswordChanged, requirePageAccess(pageKey)]
  : [authenticate, blockUntilPasswordChanged];

router.use('/auth',             require('./authRoutes'));
router.use('/dashboard',        guard('dashboard'),              require('./dashboardRoutes'));

router.use('/assets',           guard('assets'),                 require('./assetRoutes'));
router.use('/beijing-assets',   guard('beijing_assets'),         require('./beijingAssetRoutes'));
router.use('/ext-assets',       guard('ext_assets'),             require('./extAssetRoutes'));
router.use('/physical-esxi',    guard('physical_esxi_servers'),  require('./physicalEsxiRoutes'));

router.use('/dropdowns',        guard('admin/dropdowns'),        require('./dropdownRoutes'));
router.use('/departments',      guard('admin/tag-ranges'),       require('./departmentRoutes'));
router.use('/users',            guard('admin/users'),            require('./userRoutes'));
router.use('/custom-pages',     guard(),                         require('./customPageRoutes'));
router.use('/audit',            guard('admin/audit'),            require('./auditRoutes'));
router.use('/imports',          guard('admin/imports'),          require('./importRoutes'));
router.use('/reports',          guard('reports'),                require('./reportRoutes'));
router.use('/field-visibility', guard('admin/field-visibility'), require('./fieldVisibilityRoutes'));
router.use('/page-access',      guard('admin/page-access'),      require('./pageAccessRoutes'));
router.use('/builtin-pages',    guard(),                         require('./builtinPagesRoutes'));
router.use('/inventory-fields', guard(),                         require('./inventoryFieldsRoutes'));
router.use('/backup',           guard('admin/backup'),           require('./backupRoutes'));
router.use('/branding',         require('./brandingRoutes'));    // public GET; mutations authenticate internally
router.use('/recycle-bin',      guard('admin/recycle-bin'),      require('./recycleBinRoutes'));

module.exports = router;
