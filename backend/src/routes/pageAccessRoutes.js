const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const c = require('../controllers/pageAccessController');

router.get('/', authenticate, c.getAll);
router.put('/', authenticate, authorize('admin'), c.update);

module.exports = router;
