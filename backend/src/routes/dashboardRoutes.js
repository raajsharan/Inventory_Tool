const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const c = require('../controllers/dashboardController');

router.get('/summary', authenticate, c.summary);

module.exports = router;
