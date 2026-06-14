const express = require('express');
const router = express.Router();
const { getThreads, getThread, replyToThread } = require('../controllers/inboxController');
const { protect } = require('../middleware/authMiddleware');

router.get('/', protect, getThreads);
router.get('/:id', protect, getThread);
router.post('/:id/reply', protect, replyToThread);

module.exports = router;
