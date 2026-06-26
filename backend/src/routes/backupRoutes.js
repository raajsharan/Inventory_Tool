const router = require('express').Router();
const multer = require('multer');
const { authorize } = require('../middleware/auth');
const ctrl = require('../controllers/backupController');

// memoryStorage buffers the whole upload in RAM, so cap it to avoid an OOM
// DoS. Keep this in sync with nginx `client_max_body_size`. Raise both if you
// genuinely need to restore larger dumps.
const MAX_UPLOAD = Number(process.env.MAX_RESTORE_UPLOAD_BYTES || 64 * 1024 * 1024);
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_UPLOAD } });
const adminOnly = authorize('admin');

router.get('/settings/:kind',  adminOnly, ctrl.getSettings);
router.put('/settings/:kind',  adminOnly, ctrl.updateSettings);
router.get('/runs/:kind',      adminOnly, ctrl.listRuns);
router.post('/pg/run',         adminOnly, ctrl.runPgNow);
router.post('/csv/run',        adminOnly, ctrl.runCsvNow);
router.post('/pg/restore',     adminOnly, upload.single('file'), ctrl.restoreDump);

router.get('/csv/files',        adminOnly, ctrl.listCsvFiles);
router.post('/csv/restore',     adminOnly, ctrl.restoreCsvFromHistory);
router.post('/csv/restore-upload', adminOnly, upload.single('file'), ctrl.restoreCsvUpload);

module.exports = router;
