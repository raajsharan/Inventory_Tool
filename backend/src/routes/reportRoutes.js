const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const c = require('../controllers/reportController');

router.get('/sources', authenticate, c.sources);
router.post('/run', authenticate, c.run);

module.exports = router;
