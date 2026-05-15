const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const c = require('../controllers/customPageController');

router.get('/', authenticate, c.list);
router.get('/:id', authenticate, c.get);
router.post('/', authenticate, authorize('admin'), c.create);
router.delete('/:id', authenticate, authorize('admin'), c.remove);

router.get('/:id/records', authenticate, c.listRecords);
router.post('/:id/records', authenticate, authorize('admin','asset_manager'), c.createRecord);
router.put('/:id/records/:recordId', authenticate, authorize('admin','asset_manager'), c.updateRecord);
router.delete('/:id/records/:recordId', authenticate, authorize('admin'), c.deleteRecord);

module.exports = router;
