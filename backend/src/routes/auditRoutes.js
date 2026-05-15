const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const c = require('../controllers/auditController');

router.use(authenticate, authorize('admin'));
router.get('/', c.list);

module.exports = router;
