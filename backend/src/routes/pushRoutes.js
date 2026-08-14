const express = require('express');
const router = express.Router();
const { getVapidPublicKey, subscribePush } = require('../controllers/pushController');
const { verifyToken } = require('../middleware/auth');

router.get('/vapid-public-key', getVapidPublicKey);
router.post('/subscribe', verifyToken, subscribePush);

module.exports = router;
