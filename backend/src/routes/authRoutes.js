const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verifyToken } = require('../middleware/auth');

// Public routes
router.get('/databases', authController.getAvailableDatabases);
router.post('/login', authController.login);
router.post('/refresh', authController.refreshToken);

// Protected routes
router.get('/me', verifyToken, authController.getMe);
router.post('/logout', verifyToken, authController.logout);

module.exports = router;
