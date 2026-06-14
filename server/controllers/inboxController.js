const { google } = require('googleapis');
const User = require('../models/User');
const EmailThread = require('../models/EmailThread');
const EmailMessage = require('../models/EmailMessage');

const getGmailClient = async (userId) => {
    const user = await User.findById(userId);
    if (!user || !user.googleRefreshToken) {
        throw new Error('User not found or not connected to Gmail');
    }

    const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET
    );
    oauth2Client.setCredentials({ refresh_token: user.googleRefreshToken });
    return google.gmail({ version: 'v1', auth: oauth2Client });
};

// Sync and fetch inbox threads
exports.getThreads = async (req, res) => {
    try {
        const userId = req.user._id;
        let threads = await EmailThread.find({ userId }).sort({ lastMessageAt: -1 }).lean();

        // Optional: We can sync threads here, but to keep it fast, we'll just return what's in DB
        // A better approach is to sync specific threads or use webhooks.
        
        // For each thread, get the latest message snippet
        for (let thread of threads) {
            const latestMsg = await EmailMessage.findOne({ threadId: thread._id }).sort({ sentAt: -1 }).lean();
            if (latestMsg) {
                thread.latestSnippet = latestMsg.snippet || latestMsg.bodyText?.substring(0, 50);
                thread.lastMessageAt = latestMsg.sentAt;
            }
        }
        
        res.json({ threads });
    } catch (error) {
        console.error('Error fetching threads:', error);
        res.status(500).json({ message: 'Failed to fetch threads' });
    }
};

// Sync a specific thread from Gmail to get any new replies
exports.getThread = async (req, res) => {
    try {
        const threadId = req.params.id;
        const thread = await EmailThread.findOne({ _id: threadId, userId: req.user._id });
        
        if (!thread) {
            return res.status(404).json({ message: 'Thread not found' });
        }

        const gmail = await getGmailClient(req.user._id);

        // Fetch thread from Gmail
        const gmailThread = await gmail.users.threads.get({
            userId: 'me',
            id: thread.googleThreadId,
            format: 'full'
        });

        const messages = gmailThread.data.messages;
        
        // Update DB with any new messages we don't have
        for (const msg of messages) {
            const existingMsg = await EmailMessage.findOne({ googleMessageId: msg.id });
            if (!existingMsg) {
                const headers = msg.payload.headers;
                const fromHeader = headers.find(h => h.name === 'From')?.value || '';
                const toHeader = headers.find(h => h.name === 'To')?.value || '';
                const dateHeader = headers.find(h => h.name === 'Date')?.value;
                
                let bodyData = '';
                if (msg.payload.parts) {
                    const textPart = msg.payload.parts.find(p => p.mimeType === 'text/plain');
                    if (textPart && textPart.body.data) {
                        bodyData = Buffer.from(textPart.body.data, 'base64').toString();
                    }
                } else if (msg.payload.body.data) {
                    bodyData = Buffer.from(msg.payload.body.data, 'base64').toString();
                }

                // If the email is from the target recipient, it's NOT from the user.
                const isFromTarget = fromHeader.toLowerCase().includes(thread.targetEmail.toLowerCase());
                const isFromUser = !isFromTarget;
                await EmailMessage.create({
                    threadId: thread._id,
                    googleMessageId: msg.id,
                    from: fromHeader,
                    to: toHeader,
                    snippet: msg.snippet,
                    bodyText: bodyData,
                    isFromUser: isFromUser,
                    sentAt: dateHeader ? new Date(dateHeader) : new Date(parseInt(msg.internalDate))
                });
                
                // If it's a reply from someone else, update thread status
                if (!isFromUser) {
                    thread.status = 'replied';
                    thread.lastMessageAt = new Date(parseInt(msg.internalDate));
                    await thread.save();
                }
            }
        }

        // Return updated messages from DB
        const dbMessages = await EmailMessage.find({ threadId: thread._id }).sort({ sentAt: 1 });
        res.json({ thread, messages: dbMessages });

    } catch (error) {
        console.error('Error fetching thread:', error);
        res.status(500).json({ message: 'Failed to fetch thread' });
    }
};

exports.replyToThread = async (req, res) => {
    try {
        const { message } = req.body;
        const threadId = req.params.id;
        
        const thread = await EmailThread.findOne({ _id: threadId, userId: req.user._id });
        if (!thread) return res.status(404).json({ message: 'Thread not found' });
        
        const user = await User.findById(req.user._id);
        const gmail = await getGmailClient(user._id);

        // Fetch last message in DB to get Message-ID for threading headers
        const lastMsg = await EmailMessage.findOne({ threadId: thread._id }).sort({ sentAt: -1 });

        const utf8Subject = `=?utf-8?B?${Buffer.from(thread.subject.startsWith('Re:') ? thread.subject : 'Re: ' + thread.subject).toString('base64')}?=`;
        
        const messageParts = [
            `From: ${user.connectedEmail}`,
            `To: ${thread.targetEmail}`,
            'Content-Type: text/html; charset=utf-8',
            'MIME-Version: 1.0',
            `Subject: ${utf8Subject}`,
            // In-Reply-To and References are needed for Gmail to properly thread it, but simplified here
        ];
        
        const emailData = messageParts.join('\n') + '\n\n' + `<p>${message.replace(/\n/g, '<br/>')}</p>`;
        
        const encodedMessage = Buffer.from(emailData)
            .toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');

        const response = await gmail.users.messages.send({
            userId: 'me',
            requestBody: {
                raw: encodedMessage,
                threadId: thread.googleThreadId // Keeps it in the same thread
            },
        });

        // Save reply to DB
        await EmailMessage.create({
            threadId: thread._id,
            googleMessageId: response.data.id,
            from: user.connectedEmail,
            to: thread.targetEmail,
            snippet: message.substring(0, 50),
            bodyText: message,
            isFromUser: true,
            sentAt: new Date()
        });

        thread.lastMessageAt = new Date();
        await thread.save();

        res.json({ message: 'Reply sent successfully', messageId: response.data.id });
    } catch (error) {
        console.error('Error sending reply:', error);
        res.status(500).json({ message: 'Failed to send reply' });
    }
};
