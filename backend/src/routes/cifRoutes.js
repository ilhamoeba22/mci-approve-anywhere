const express = require('express');
const router = express.Router();
const { verifyToken, checkSupervisorLevel } = require('../middleware/auth');
const cifController = require('../controllers/cifController');

router.use(verifyToken);
router.use(checkSupervisorLevel);

router.get('/perorangan/pending', cifController.getPendingPerorangan);
router.get('/perorangan/:nocif', cifController.getDetailPerorangan);
router.post('/perorangan/:nocif/approve', cifController.approvePerorangan);
router.post('/perorangan/:nocif/reject', cifController.rejectPerorangan);

router.get('/badanhukum/pending', cifController.getPendingBadanHukum);
router.get('/badanhukum/:nocif', cifController.getDetailBadanHukum);
router.post('/badanhukum/:nocif/approve', cifController.approveBadanHukum);
router.post('/badanhukum/:nocif/reject', cifController.rejectBadanHukum);

module.exports = router;
