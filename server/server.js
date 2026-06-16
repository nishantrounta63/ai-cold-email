const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const aiRoutes = require('./routes/aiRoutes');
const googleAuthRoutes = require('./routes/googleAuthRoutes');

// Load environment variables
dotenv.config();

// Validate required environment variables
const requiredEnvVars = ['MONGODB_URI', 'JWT_SECRET', 'GEMINI_API_KEY'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
    console.warn(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
}

// Connect to MongoDB
connectDB();

const app = express();

app.use(cors({
    origin: process.env.FRONTEND_URL || true,
    credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));


const inboxRoutes = require('./routes/inboxRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/auth/google', googleAuthRoutes);
app.use('/api/inbox', inboxRoutes);

// Disable static file serving in production (Vercel handles it via vercel.json)
if (process.env.NODE_ENV !== 'production') {
    const __dirnamePath = path.resolve();
    const clientBuildPath = path.join(__dirnamePath, '..', 'client', 'dist');
    app.use(express.static(clientBuildPath));
    app.get('*', (req, res) => {
        if (!req.path.startsWith('/api')) {
            res.sendFile(path.join(clientBuildPath, 'index.html'));
        }
    });
}

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Server Error', error: err.message });
});

const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

// Export for Vercel Serverless
module.exports = app;