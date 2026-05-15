const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const c = require('../controllers/fieldVisibilityController');

router.get('/', authenticate, c.listPages);
router.get('/:pageKey', authenticate, c.getOne);
router.put('/:pageKey', authenticate, authorize('admin'), c.update);

module.exports = router;
