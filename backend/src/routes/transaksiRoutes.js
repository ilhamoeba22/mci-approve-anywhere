const express = require('express');
const router = express.Router();
const { verifyToken, checkSupervisorLevel } = require('../middleware/auth');
const transaksiController = require('../controllers/transaksiController');

router.use(verifyToken);
router.use(checkSupervisorLevel);

router.get('/pending', transaksiController.getPendingTransaksi);
router.get('/:id', transaksiController.getDetailTransaksi);
router.post('/:id/approve', transaksiController.approveTransaksi);
router.post('/:id/reject', transaksiController.rejectTransaksi);

module.exports = router;
