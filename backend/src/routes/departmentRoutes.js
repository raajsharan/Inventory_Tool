const router = require('express').Router();
const { param } = require('express-validator');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const c = require('../controllers/departmentController');

router.get('/', authenticate, c.list);
router.post('/', authenticate, authorize('admin'), c.create);
router.put('/:id', authenticate, authorize('admin'), param('id').isUUID(), validate, c.update);
router.delete('/:id', authenticate, authorize('admin'), param('id').isUUID(), validate, c.remove);

module.exports = router;
