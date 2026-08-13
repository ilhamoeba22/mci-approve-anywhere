const express = require('express');
const router = express.Router();
const { verifyToken, checkSupervisorLevel } = require('../middleware/auth');
const tutupKantorController = require('../controllers/tutupKantorController');

router.use(verifyToken);
router.use(checkSupervisorLevel);

router.get('/status', tutupKantorController.getStatusTutupKantor);

module.exports = router;
