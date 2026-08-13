const express = require('express');
const router = express.Router();
const { verifyToken, checkSupervisorLevel } = require('../middleware/auth');
const auditController = require('../controllers/auditController');

router.use(verifyToken);
router.use(checkSupervisorLevel);

router.get('/logs', auditController.getAuditLogs);
router.get('/users', auditController.getAuditUsers);
router.get('/export', auditController.exportAuditCsv);

module.exports = router;
