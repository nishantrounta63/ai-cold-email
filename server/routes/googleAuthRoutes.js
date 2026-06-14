const express = require('express');
const router = express.Router();
const { getAuthUrl, oauthCallback, getConnectedAccount, disconnectAccount } = require('../controllers/googleAuthController');
const { protect } = require('../middleware/authMiddleware');

// Get URL to redirect user to Google
router.get('/url', protect, getAuthUrl);

// Handle callback from Google (not protected because it comes from Google)
router.get('/callback', oauthCallback);

// Get connected account status
router.get('/status', protect, getConnectedAccount);

// Disconnect account
router.delete('/disconnect', protect, disconnectAccount);

module.exports = router;
