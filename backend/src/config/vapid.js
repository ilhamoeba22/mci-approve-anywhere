const webpush = require('web-push');

// Generate or use VAPID keys
let vapidKeys = {
  publicKey: process.env.VAPID_PUBLIC_KEY || 'BEl62iUYgUivxIkv69yViEuiBIa20Y1R58Sef-tWfS93kLqJ_WJgD5d0r90n2qZ5F6S0x3d0R90n2qZ5F6S0x3d',
  privateKey: process.env.VAPID_PRIVATE_KEY || 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2'
};

try {
  const generated = webpush.generateVAPIDKeys();
  vapidKeys = generated;
} catch (e) {
  console.warn('[VAPID] Web-push keys fallback initialized.');
}

webpush.setVapidDetails(
  'mailto:it@bprshikmciyk.co.id',
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

module.exports = {
  webpush,
  vapidKeys
};
