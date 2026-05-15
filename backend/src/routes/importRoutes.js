const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const c = require('../controllers/importController');

router.get('/', authenticate, authorize('admin','asset_manager'), c.importHistory);
router.get('/:id', authenticate, authorize('admin','asset_manager'), c.importDetail);

module.exports = router;
