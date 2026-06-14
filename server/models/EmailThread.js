const mongoose = require('mongoose');

const emailThreadSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    googleThreadId: { type: String, required: true, unique: true },
    targetEmail: { type: String, required: true },
    subject: { type: String },
    lastMessageAt: { type: Date, default: Date.now },
    status: { type: String, enum: ['sent', 'replied', 'closed'], default: 'sent' }
}, { timestamps: true });

module.exports = mongoose.model('EmailThread', emailThreadSchema);
