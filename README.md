# Tricog Health Digital Assistant

A comprehensive AI-powered digital assistant for cardiologists and patients, designed to streamline symptom collection and appointment scheduling.

## 🏥 Features

- **AI-Powered Chat Interface**: Real-time chat with patients using OpenAI/Claude
- **Rule-Based Symptom Collection**: Follows structured database rules for symptom questioning
- **Automatic Scheduling**: Google Calendar integration for appointment booking
- **Doctor Notifications**: Telegram notifications to cardiologists
- **Real-time Communication**: WebSocket-based chat using Socket.io
- **Database Storage**: SQLite database for patient data and symptom rules

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- OpenAI API key (optional for demo)
- Telegram Bot Token (optional for demo)
- Google Calendar API credentials (optional for demo)

### Installation

1. **Clone and Navigate**
   ```bash
   cd my-react-app
   npm install
   ```

2. **Setup Environment Variables**
   Copy the example environment file:
   ```bash
   cp .env.example backend/.env
   ```
   
   Edit `backend/.env` with your API keys:
   ```env
   OPENAI_API_KEY=your-openai-api-key-here
   TELEGRAM_BOT_TOKEN=your-telegram-bot-token
   DOCTOR_TELEGRAM_ID=your-telegram-chat-id
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   GOOGLE_REFRESH_TOKEN=your-google-refresh-token
   DOCTOR_EMAIL=doctor@tricoghealth.com
   ```

3. **Start the Application**
   ```bash
   npm start
   ```
   
   This will start both:
   - Backend server on `http://localhost:3001`
   - Frontend React app on `http://localhost:5173`

### Alternative: Start Services Separately

**Backend only:**
```bash
npm run server
```

**Frontend only:**
```bash
npm run dev
```

## 📋 How It Works

### Patient Flow
1. Patient opens the web app
2. Clicks "Start Consultation" 
3. AI assistant asks for basic information (name, email, gender)
4. Patient describes their symptoms
5. AI identifies symptoms and asks follow-up questions from the database
6. System collects all responses and stores them
7. Appointment is automatically scheduled
8. Doctor receives Telegram notification with patient details

### Technical Flow
1. **Frontend**: React app with Socket.io client for real-time chat
2. **Backend**: Express server with Socket.io for WebSocket communication
3. **AI Processing**: OpenAI/Claude API for symptom identification and conversation
4. **Database**: SQLite with Sequelize ORM for data persistence
5. **Notifications**: Telegram Bot API for doctor alerts
6. **Scheduling**: Google Calendar API for appointment creation

## 🗃️ Database Schema

### Symptom Rules
```json
{
  "chest pain": {
    "follow_up_questions": [
      "When did the chest pain start?",
      "Is the pain constant or does it come and go?",
      "Does the pain get worse with activity or exercise?"
    ]
  }
}
```

### Patient Data
- Session ID
- Personal info (name, email, gender)
- Identified symptoms
- Question-answer pairs
- Appointment status

## 🔧 API Endpoints

- `GET /health` - Health check
- `GET /api/patients` - List all patients (admin)
- WebSocket events:
  - `start-chat` - Initialize new session
  - `message` - Send/receive messages

## 🛠️ Configuration

### OpenAI Setup
1. Get API key from https://platform.openai.com/
2. Add to `backend/.env`: `OPENAI_API_KEY=your-key`

### Telegram Bot Setup
1. Create bot with @BotFather on Telegram
2. Get bot token and add to `backend/.env`
3. Get your chat ID and add as `DOCTOR_TELEGRAM_ID`

### Google Calendar Setup
1. Create project in Google Cloud Console
2. Enable Calendar API
3. Create OAuth2 credentials
4. Get refresh token and add to `backend/.env`

## 📱 Demo Mode

The application works in demo mode without API keys:
- Symptom identification will use fallback logic
- Notifications will log to console
- Calendar events will be simulated

## 🏗️ Project Structure

```
my-react-app/
├── backend/
│   ├── server.js          # Main server file
│   ├── database.js        # Database models and setup
│   ├── package.json       # Backend dependencies
│   └── .env              # Environment variables
├── src/
│   ├── App.jsx           # Main React component
│   └── App.css           # Styles
├── package.json          # Frontend dependencies
└── README.md
```

## 🩺 Medical Symptoms Supported

- **Chest Pain**: Duration, intensity, triggers, radiation
- **Shortness of Breath**: Activity-related, duration, associated symptoms
- **Fatigue**: Severity, impact on daily activities
- **Palpitations**: Triggers, duration, associated symptoms  
- **Dizziness**: Onset, triggers, associated symptoms

## 🔒 Security Notes

- Never commit actual API keys to version control
- Use environment variables for all sensitive data
- Implement proper authentication in production
- Follow HIPAA compliance for medical data

## 📞 Support

For issues or questions about this Tricog Health Digital Assistant implementation, please check the configuration and ensure all API keys are properly set up.

## 🎯 Production Deployment

For production deployment:
1. Set up proper OAuth2 flow for Google Calendar
2. Configure secure environment variables
3. Implement user authentication
4. Add rate limiting and security headers
5. Use production database (PostgreSQL/MongoDB)
6. Set up monitoring and logging

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
