# AI Cold Mail Generator & CRM

An intelligent, full-stack application that leverages Google's Gemini AI to generate personalized cold emails and uses the Gmail API to send them directly from your connected inbox. This application also features a built-in CRM system to track your sent emails, sync incoming replies, and maintain conversational threads—all in one place!

## 🚀 Features

- **Gemini AI Email Generation**: Generate highly customized, professional cold emails instantly by providing a target audience and product description.
- **Google OAuth 2.0 Integration**: Securely connect your personal or professional Gmail account.
- **Direct Email Sending**: Send the AI-generated emails directly from your connected Gmail address using the official Gmail API (no external SMTP needed).
- **Two-Way Inbox CRM**: 
  - Automatically tracks the thread ID of every cold email sent.
  - Syncs incoming replies from recipients directly into the app dashboard.
  - Chat-like (WhatsApp style) interface to read the entire conversation.
- **In-App Replies**: Reply back to clients seamlessly without ever leaving the application.

## 🛠️ Tech Stack

### Frontend
- **React.js** with Vite
- **Tailwind CSS** for modern, responsive UI
- **React Router** for navigation
- **React Hot Toast** for notifications
- **Heroicons** for SVG icons

### Backend
- **Node.js & Express.js**
- **MongoDB & Mongoose** (Database for Users, Threads, and Messages)
- **Googleapis** (Gmail API & OAuth2)
- **Google Generative AI SDK** (Gemini AI)
- **JSON Web Tokens (JWT)** for internal app authentication

## 📦 Local Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/nishantrounta63/ai-cold-email.git
   cd ai-cold-email
   ```

2. **Install all dependencies:**
   ```bash
   npm run install-all
   ```

3. **Set up Environment Variables:**
   Create a `.env` file in both the `/client` and `/server` directories.
   
   **In `/server/.env`:**
   ```env
   PORT=5001
   MONGO_URI=your_mongodb_connection_string
   JWT_SECRET=your_secret_key
   GEMINI_API_KEY=your_gemini_api_key
   GOOGLE_CLIENT_ID=your_google_cloud_client_id
   GOOGLE_CLIENT_SECRET=your_google_cloud_client_secret
   ```
   **In `/client/.env`:**
   ```env
   VITE_API_URL=http://localhost:5001/api
   ```

4. **Run the Development Server:**
   ```bash
   npm run dev
   ```
   This will start both the backend server and the frontend React application concurrently.

## 🌍 Deployment

This repository is configured to be easily deployed as a Monorepo on [Render](https://render.com).

1. Connect your GitHub repository to a new Render **Web Service**.
2. **Build Command**: `npm run build`
3. **Start Command**: `npm start`
4. Add all your server `.env` variables into the Render Environment Variables tab, and ensure you add `NODE_ENV=production`.

## 📝 License
This project is open-source and available under the MIT License.
