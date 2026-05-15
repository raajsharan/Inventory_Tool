const router = require('express').Router();
const multer = require('multer');
const { authenticate, authorize } = require('../middleware/auth');
const c = require('../controllers/customPageController');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.get('/', authenticate, c.list);
router.get('/:id', authenticate, c.get);
router.post('/', authenticate, authorize('admin'), c.create);
router.put('/:id', authenticate, authorize('admin'), c.update);
router.delete('/:id', authenticate, authorize('admin'), c.remove);

router.get('/:id/template', authenticate, authorize('admin', 'asset_manager'), c.downloadTemplate);
router.post(
  '/:id/records/import',
  authenticate,
  authorize('admin', 'asset_manager'),
  upload.single('file'),
  c.importRecords,
);

router.get('/:id/records', authenticate, c.listRecords);
router.post('/:id/records', authenticate, authorize('admin', 'asset_manager'), c.createRecord);
router.put('/:id/records/:recordId', authenticate, authorize('admin', 'asset_manager'), c.updateRecord);
router.delete('/:id/records/:recordId', authenticate, authorize('admin'), c.deleteRecord);

module.exports = router;
