const express = require('express');
const router = express.Router();
const { verifyToken, checkSupervisorLevel } = require('../middleware/auth');
const tabunganController = require('../controllers/tabunganController');

router.use(verifyToken);
router.use(checkSupervisorLevel);

router.get('/pending', tabunganController.getPendingTabungan);
router.get('/:notab', tabunganController.getDetailTabungan);
router.post('/:notab/approve', tabunganController.approveTabungan);
router.post('/:notab/reject', tabunganController.rejectTabungan);

module.exports = router;
