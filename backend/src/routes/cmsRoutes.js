const express = require('express');
const router = express.Router();
const { verifyToken, checkSupervisorLevel } = require('../middleware/auth');
const cmsController = require('../controllers/cmsController');

router.use(verifyToken);
router.use(checkSupervisorLevel);

router.post('/save-batch', cmsController.saveBatch);
router.get('/batches', cmsController.getBatches);
router.get('/batches/:id', cmsController.getBatchDetail);

module.exports = router;
