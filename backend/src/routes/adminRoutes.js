const express = require('express');
const router = express.Router();
const { verifyToken, checkSupervisorLevel } = require('../middleware/auth');
const adminController = require('../controllers/adminController');

router.use(verifyToken);
// Superadmin level check (levelx === 'A')
router.use((req, res, next) => {
  if (!req.user || req.user.levelx !== 'A') {
    return res.status(403).json({
      status: 'error',
      message: 'Akses ditolak: Fitur ini hanya dapat diakses oleh Superadmin (Level A)'
    });
  }
  next();
});

router.get('/db-config', adminController.getDbConfig);
router.post('/db-config/test', adminController.testDbConfig);
router.post('/db-config/switch', adminController.updateDbConfig);

module.exports = router;
