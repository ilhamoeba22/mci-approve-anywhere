const express = require('express');
const router = express.Router();
const { verifyToken, checkSupervisorLevel } = require('../middleware/auth');
const pembiayaanController = require('../controllers/pembiayaanController');

router.use(verifyToken);
router.use(checkSupervisorLevel);

router.get('/pending', pembiayaanController.getPendingPembiayaan);
router.get('/:nokontrak', pembiayaanController.getDetailPembiayaan);
router.post('/:nokontrak/approve', pembiayaanController.approvePembiayaan);
router.post('/:nokontrak/reject', pembiayaanController.rejectPembiayaan);

module.exports = router;
