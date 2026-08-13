const express = require('express');
const router = express.Router();
const { verifyToken, checkSupervisorLevel } = require('../middleware/auth');
const asetController = require('../controllers/asetController');

router.use(verifyToken);
router.use(checkSupervisorLevel);

router.get('/pending', asetController.getPendingAset);
router.get('/:kdaset', asetController.getDetailAset);
router.post('/:kdaset/approve', asetController.approveAset);
router.post('/:kdaset/reject', asetController.rejectAset);

module.exports = router;
