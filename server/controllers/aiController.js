const axios = require('axios');
const EmailHistory = require('../models/EmailHistory');
const sendEmail = require('../utils/emailService');
const User = require('../models/User');

exports.generateEmail = async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ message: 'Prompt is required' });
    }

    if (typeof prompt !== 'string') {
      return res.status(400).json({ message: 'Prompt must be a string' });
    }

    if (prompt.trim().length === 0) {
      return res.status(400).json({ message: 'Prompt cannot be empty' });
    }

    if (prompt.length > 2000) {
      return res.status(400).json({ message: 'Prompt cannot exceed 2000 characters' });
    }

    // Call Groq API (Free tier - No quota issues!)
    const groqApiKey = process.env.GROQ_API_KEY;
    if (!groqApiKey) {
      return res.status(500).json({ message: 'AI service is not configured' });
    }

    const systemPrompt = `You are an expert job outreach strategist.

Your task is to generate a HIGH-CONVERTING cold email to a recruiter for a job opportunity.

IMPORTANT:
- Even if the user gives only 2–4 words, assume realistic context.
- Do NOT ask for clarification.
- Make professional assumptions.
- Avoid generic phrases.
- Keep it concise and structured.

====================================================
OUTPUT FORMAT (STRICT)
====================================================

Return ONLY valid JSON:

{
  "subject": "",
  "emailBody": "",
  "linkedInDM": "",
  "followUpEmail": ""
}

No markdown.
No explanations.
Only JSON.

====================================================
CONTEXT ASSUMPTIONS
====================================================

Assume:
- Candidate has 2+ years experience
- Strong in DSA and system design
- Has worked on backend APIs or scalable systems
- Has contributed to production-level features
- Actively seeking Software Engineer roles

If prompt is short like:
"SDE role"
"Backend engineer"
"Startup job"
"Product company"

Create intelligent assumptions about:
- Scaling challenges
- Hiring urgency
- Performance or system reliability issues
- Team growth

====================================================
SUBJECT LINE RULES
====================================================

• 6–9 words
• Must sound confident
• No generic phrases like:
  - "Quick question"
  - "Looking for opportunity"
  - "Job application"
• Should highlight value or experience

Example styles:
"Backend engineer with 2+ yrs scaling APIs"
"Engineer focused on scalable system design"
"Software engineer improving system performance"

====================================================
EMAIL BODY STRUCTURE (STRICT)
====================================================

Keep 60–90 words.

Line 1: Personalized observation about hiring  
Line 2: Mention common hiring/scaling challenge  
Line 3-4: Candidate's experience and strengths  
Line 5: Specific impact or contribution  
Line 6: Clear CTA  
Line 7: Sign-off with name and title  

Tone:
• Confident
• Professional
• Not desperate
• No emojis
• No hype words

====================================================
LINKEDIN DM STRUCTURE
====================================================

30–50 words.
Short, conversational.
Observation + value + soft ask.

====================================================
FOLLOW-UP EMAIL STRUCTURE
====================================================

50–80 words.
New angle.
Emphasize long-term value.
Professional urgency.
Clear CTA.

====================================================

Return ONLY valid JSON.`;
    
    const fullPrompt = `${systemPrompt}\n\nUser REQUEST: "${prompt.trim()}"\n\nGenerate STRONG cold email even if prompt is short. Make smart assumptions. Return ONLY valid JSON:\n{"subject": "...", "emailBody": "...", "linkedInDM": "...", "followUpEmail": "..."}`;
    const aiResponse = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "user",
            content: fullPrompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1024
      },
      {
        headers: {
          'Authorization': `Bearer ${groqApiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    // Parse the Groq response
    if (!aiResponse.data.choices || !aiResponse.data.choices[0] || !aiResponse.data.choices[0].message) {
      throw new Error('Invalid response from Groq API');
    }

    const generatedText = aiResponse.data.choices[0].message.content;
    
    // Extract JSON from the response
    const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
    let parsedResponse;
    
    try {
      parsedResponse = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(generatedText);
    } catch (parseError) {
      console.error('JSON parse error:', parseError, 'Generated text:', generatedText);
      return res.status(500).json({ 
        message: 'Failed to parse AI response', 
        error: 'The AI generated invalid JSON. Please try again.' 
      });
    }

    const emailData = {
      subject: parsedResponse.subject || "New Opportunity",
      emailBody: parsedResponse.emailBody || "",
      linkedInDM: parsedResponse.linkedInDM || "",
      followUpEmail: parsedResponse.followUpEmail || ""
    };

    // Validate response data
    if (!emailData.subject || !emailData.emailBody) {
      return res.status(500).json({ 
        message: 'AI generated incomplete email data. Please try again.' 
      });
    }

    // Save to history
    const historyEntry = await EmailHistory.create({
      userId: req.user._id,
      prompt: prompt.trim(),
      subject: emailData.subject,
      emailBody: emailData.emailBody,
      linkedInDM: emailData.linkedInDM,
      followUpEmail: emailData.followUpEmail
    });

    res.status(200).json(historyEntry);
  } catch (error) {
    console.error('AI Generation Error:', error.response?.data || error.message);
    
    if (error.response?.status === 429) {
      return res.status(429).json({ 
        message: 'Too many requests. Please wait a moment before trying again.',
        error: 'Rate limit exceeded'
      });
    }

    res.status(500).json({ 
      message: 'Failed to generate email', 
      error: error.response?.data?.error?.message || error.message 
    });
  }
};

exports.getHistory = async (req, res) => {
  try {
    const history = await EmailHistory.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.status(200).json(history);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch history' });
  }
};

const { google } = require('googleapis');

exports.sendDirectEmail = async (req, res) => {
  try {
    const { email, subject, message } = req.body;

    if (!email || !subject || !message) {
      return res.status(400).json({ message: 'Email, subject, and message are required' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.match(emailRegex)) {
      return res.status(400).json({ message: 'Please provide a valid email address' });
    }

    const user = await User.findById(req.user._id);

    if (!user.googleRefreshToken) {
        return res.status(400).json({ message: 'Please connect your Gmail account first in the dashboard.' });
    }

    const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET
    );
    oauth2Client.setCredentials({ refresh_token: user.googleRefreshToken });

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`;
    const messageParts = [
        `From: ${user.connectedEmail}`,
        `To: ${email}`,
        'Content-Type: text/html; charset=utf-8',
        'MIME-Version: 1.0',
        `Subject: ${utf8Subject}`,
        '',
        `<p>${message.replace(/\n/g, '<br/>')}</p>`,
    ];
    const emailData = messageParts.join('\n');
    const encodedMessage = Buffer.from(emailData)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

    const response = await gmail.users.messages.send({
        userId: 'me',
        requestBody: {
            raw: encodedMessage,
        },
    });

    const EmailThread = require('../models/EmailThread');
    const EmailMessage = require('../models/EmailMessage');

    // Get the full message from Gmail to get the exact threadId
    const sentMessage = await gmail.users.messages.get({
        userId: 'me',
        id: response.data.id
    });

    const threadId = sentMessage.data.threadId;

    // Create a new thread in our DB
    const newThread = await EmailThread.create({
        userId: user._id,
        googleThreadId: threadId,
        targetEmail: email,
        subject: subject,
        lastMessageAt: new Date()
    });

    // Save the message
    await EmailMessage.create({
        threadId: newThread._id,
        googleMessageId: response.data.id,
        from: user.connectedEmail,
        to: email,
        snippet: sentMessage.data.snippet,
        bodyText: message,
        bodyHtml: `<p>${message.replace(/\n/g, '<br/>')}</p>`,
        isFromUser: true,
        sentAt: new Date()
    });

    res.status(200).json({ message: 'Email sent successfully via Gmail API', messageId: response.data.id });
  } catch (error) {
    console.error('Error sending direct email via Gmail:', error);
    res.status(500).json({ message: 'Failed to send email. You might need to re-connect your Gmail.', error: error.message });
  }
};
