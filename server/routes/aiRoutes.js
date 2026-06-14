const express = require('express');
const router = express.Router();
const { generateEmail, getHistory, sendDirectEmail } = require('../controllers/aiController');
const { protect } = require('../middleware/authMiddleware');

router.post('/generate-email', protect, generateEmail);
router.get('/history', protect, getHistory);
router.post('/send-email', protect, sendDirectEmail);

module.exports = router;
