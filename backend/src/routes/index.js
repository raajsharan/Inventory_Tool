const router = require('express').Router();

router.use('/auth',         require('./authRoutes'));
router.use('/dashboard',    require('./dashboardRoutes'));
router.use('/assets',       require('./assetRoutes'));
router.use('/dropdowns',    require('./dropdownRoutes'));
router.use('/departments',  require('./departmentRoutes'));
router.use('/users',        require('./userRoutes'));
router.use('/custom-pages', require('./customPageRoutes'));
router.use('/audit',        require('./auditRoutes'));
router.use('/imports',      require('./importRoutes'));

module.exports = router;
