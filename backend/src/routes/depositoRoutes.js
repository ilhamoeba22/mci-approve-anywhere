const express = require('express');
const router = express.Router();
const { verifyToken, checkSupervisorLevel } = require('../middleware/auth');
const depositoController = require('../controllers/depositoController');

router.use(verifyToken);
router.use(checkSupervisorLevel);

router.get('/pending', depositoController.getPendingDeposito);
router.get('/:nodep', depositoController.getDetailDeposito);
router.post('/:nodep/approve', depositoController.approveDeposito);
router.post('/:nodep/reject', depositoController.rejectDeposito);

module.exports = router;
