const mongoose = require('mongoose');

const emailMessageSchema = new mongoose.Schema({
    threadId: { type: mongoose.Schema.Types.ObjectId, ref: 'EmailThread', required: true },
    googleMessageId: { type: String, required: true, unique: true },
    from: { type: String, required: true },
    to: { type: String, required: true },
    snippet: { type: String },
    bodyText: { type: String },
    bodyHtml: { type: String },
    isFromUser: { type: Boolean, default: false },
    sentAt: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('EmailMessage', emailMessageSchema);
