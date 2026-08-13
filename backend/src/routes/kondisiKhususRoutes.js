const express = require('express');
const router = express.Router();
const { verifyToken, checkSupervisorLevel } = require('../middleware/auth');
const kondisiKhususController = require('../controllers/kondisiKhususController');

router.use(verifyToken);
router.use(checkSupervisorLevel);

router.get('/pending', kondisiKhususController.getPendingKondisiKhusus);
router.get('/:id', kondisiKhususController.getDetailKondisiKhusus);
router.post('/:id/approve', kondisiKhususController.approveKondisiKhusus);
router.post('/:id/reject', kondisiKhususController.rejectKondisiKhusus);

module.exports = router;
