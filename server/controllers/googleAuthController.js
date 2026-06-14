const { google } = require('googleapis');
const User = require('../models/User');

const getOauth2Client = () => {
  // Using backend URL for redirect URI since this is a backend route receiving the callback
  const redirectUri = `${process.env.PORT ? 'http://localhost:' + process.env.PORT : 'http://localhost:5001'}/api/auth/google/callback`;
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUri
  );
};

exports.getAuthUrl = (req, res) => {
  try {
    console.log("Generating Auth URL for user:", req.user._id);
    const oauth2Client = getOauth2Client();
    const scopes = [
      'https://www.googleapis.com/auth/gmail.modify',
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/userinfo.email'
    ];

    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: scopes,
      state: req.user._id.toString() // Pass user ID to know who is connecting
    });
    
    console.log("Generated URL:", url);
    res.json({ url });
  } catch (error) {
    console.error("Error generating OAuth URL:", error);
    res.status(500).json({ message: "Failed to generate OAuth URL" });
  }
};

exports.oauthCallback = async (req, res) => {
  const { code, state } = req.query;
  const userId = state;

  if (!code || !userId) {
    return res.status(400).send('Invalid request');
  }

  try {
    const oauth2Client = getOauth2Client();
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Get user's email
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();
    const email = userInfo.data.email;

    // Save tokens to user
    await User.findByIdAndUpdate(userId, {
      googleAccessToken: tokens.access_token,
      googleRefreshToken: tokens.refresh_token,
      connectedEmail: email
    });

    // Redirect back to frontend settings/dashboard
    res.redirect(`${process.env.FRONTEND_URL}/dashboard?connected=success`);
  } catch (error) {
    console.error('OAuth Callback Error:', error);
    res.redirect(`${process.env.FRONTEND_URL}/dashboard?connected=error`);
  }
};

exports.getConnectedAccount = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (user.connectedEmail) {
      res.json({ connected: true, email: user.connectedEmail });
    } else {
      res.json({ connected: false });
    }
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch account status' });
  }
};

exports.disconnectAccount = async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, {
      $unset: { googleAccessToken: 1, googleRefreshToken: 1, connectedEmail: 1 }
    });
    res.json({ message: 'Account disconnected successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to disconnect account' });
  }
};
