const express = require('express');
const router = express.Router();
const { getVapidPublicKey, subscribePush } = require('../controllers/pushController');
const { verifyToken } = require('../controllers/authController');

router.get('/vapid-public-key', getVapidPublicKey);
router.post('/subscribe', verifyToken, subscribePush);

module.exports = router;
