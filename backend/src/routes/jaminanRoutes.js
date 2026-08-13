const express = require('express');
const router = express.Router();
const { verifyToken, checkSupervisorLevel } = require('../middleware/auth');
const jaminanController = require('../controllers/jaminanController');

router.use(verifyToken);
router.use(checkSupervisorLevel);

router.get('/pending', jaminanController.getPendingJaminan);
router.get('/:noreg', jaminanController.getDetailJaminan);
router.post('/:noreg/approve', jaminanController.approveJaminan);
router.post('/:noreg/reject', jaminanController.rejectJaminan);

module.exports = router;
