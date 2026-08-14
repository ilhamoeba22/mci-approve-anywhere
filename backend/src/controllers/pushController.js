const { webpush, vapidKeys } = require('../config/vapid');

// Memory store for active push subscriptions
const subscriptions = new Map();

function getVapidPublicKey(req, res) {
  res.json({
    status: 'success',
    publicKey: vapidKeys.publicKey
  });
}

function subscribePush(req, res) {
  const subscription = req.body;
  const userId = (req.user && req.user.userid) ? req.user.userid : 'GENERAL';

  if (!subscription || !subscription.endpoint) {
    return res.status(400).json({ status: 'error', message: 'Subscription data required' });
  }

  subscriptions.set(subscription.endpoint, {
    userId,
    subscription,
    updatedAt: new Date()
  });

  console.log(`[PushController] User '${userId}' subscribed to Web Push Notifications.`);

  res.status(201).json({
    status: 'success',
    message: 'Push subscription saved'
  });
}

function sendNotificationToAll(payload) {
  const notifications = [];
  
  subscriptions.forEach(({ subscription, userId }) => {
    const p = webpush.sendNotification(subscription, JSON.stringify(payload))
      .catch(err => {
        if (err.statusCode === 410 || err.statusCode === 404) {
          console.log(`[PushController] Subscription expired for user '${userId}', removing.`);
          subscriptions.delete(subscription.endpoint);
        } else {
          console.warn(`[PushController] Error sending push to '${userId}':`, err.message);
        }
      });
    notifications.push(p);
  });

  return Promise.all(notifications);
}

module.exports = {
  getVapidPublicKey,
  subscribePush,
  sendNotificationToAll,
  subscriptions
};
