const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { initializeDatabase, SymptomRule, PatientData } = require('./database');
const { OpenAI } = require('openai');
const TelegramBot = require('node-telegram-bot-api');
const { google } = require('googleapis');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'node-backend' });
});


// Initialize OpenAI (you'll need to add OPENAI_API_KEY to your .env file)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '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'
});

// Initialize Telegram Bot (you'll need to add TELEGRAM_BOT_TOKEN to your .env file)
const telegramBot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN || 'your-telegram-bot-token', { polling: false });

// Google Calendar setup (you'll need to set up OAuth2 credentials)
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URL
);

// Set credentials (you'll need to handle OAuth2 flow in production)
oauth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN
});

const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

// Chat state management
const activeSessions = new Map();

// Initialize database
initializeDatabase();

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('start-chat', async () => {
    const sessionId = uuidv4();
    
    // Create new patient session
    const patientData = await PatientData.create({ sessionId });
    
    activeSessions.set(socket.id, {
      sessionId,
      stage: 'greeting',
      patientData,
      currentQuestionIndex: 0,
      currentSymptom: null,
      collectedSymptoms: [],
      awaitingSymptoms: false
    });

    const welcomeMessage = {
      message: "Hello! I'm your Tricog Health digital assistant. I'm here to help collect information about your symptoms before your consultation with our cardiologist. Let's start with some basic information. What is your name?",
      sender: 'bot',
      timestamp: new Date()
    };

    socket.emit('message', welcomeMessage);
  });

  socket.on('message', async (data) => {
    const session = activeSessions.get(socket.id);
    if (!session) {
      socket.emit('message', {
        message: "I'm sorry, but I don't have an active session. Please refresh the page and start again.",
        sender: 'bot',
        timestamp: new Date()
      });
      return;
    }

    // Echo user message
    socket.emit('message', {
      message: data.message,
      sender: 'user',
      timestamp: new Date()
    });

    try {
      const response = await processUserMessage(data.message, session);
      
      socket.emit('message', {
        message: response,
        sender: 'bot',
        timestamp: new Date()
      });

      // Check if consultation should be scheduled
      if (session.stage === 'completed') {
        await scheduleConsultation(session);
        await notifyDoctor(session);
      }

    } catch (error) {
      console.error('Error processing message:', error);
      socket.emit('message', {
        message: "I'm sorry, I encountered an error. Please try again or contact support if the problem persists.",
        sender: 'bot',
        timestamp: new Date()
      });
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    activeSessions.delete(socket.id);
  });
});

async function processUserMessage(message, session) {
  const { stage, patientData } = session;

  switch (stage) {
    case 'greeting':
      // Collect name
      await patientData.update({ name: message });
      session.stage = 'email';
      return `Nice to meet you, ${message}! Now, could you please provide your email address?`;

    case 'email':
      // Validate and collect email
      if (isValidEmail(message)) {
        await patientData.update({ email: message });
        session.stage = 'gender';
        return "Thank you! Could you please tell me your gender (Male/Female/Other)?";
      } else {
        return "Please provide a valid email address.";
      }

    case 'gender':
      await patientData.update({ gender: message });
      session.stage = 'symptoms';
      return `Thank you for providing your information! Now, I need to understand your symptoms to help our cardiologist prepare for your consultation. 

Please describe the main symptoms you're experiencing. For example, you might mention things like:
- Chest pain
- Shortness of breath  
- Fatigue
- Palpitations (heart racing)
- Dizziness

What symptoms are bothering you?`;

    case 'symptoms':
      return await processSymptoms(message, session);

    case 'follow-up-questions':
      return await processFollowUpAnswer(message, session);

    default:
      return "I'm not sure how to help with that. Could you please clarify?";
  }
}

async function processSymptoms(message, session) {
  // Use LLM to identify symptoms from user message
  const systemPrompt = `You are a medical symptom identifier. Your job is to identify cardiac-related symptoms from the user's message.

Available symptoms to identify:
- chest pain
- shortness of breath
- fatigue
- palpitations
- dizziness

Rules:
1. Only identify symptoms that are explicitly mentioned or clearly implied
2. Return ONLY the symptom names as a JSON array (e.g., ["chest pain", "fatigue"])
3. Use exact symptom names from the available list
4. If no valid symptoms are found, return an empty array

User message: "${message}"`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message }
      ],
      max_tokens: 100,
      temperature: 0.1
    });

    const identifiedSymptoms = JSON.parse(completion.choices[0].message.content);
    
    if (identifiedSymptoms.length === 0) {
      return "I couldn't identify any specific cardiac symptoms from your message. Could you please be more specific? For example, you might say 'I have chest pain' or 'I feel short of breath'.";
    }

    // Store identified symptoms
    session.collectedSymptoms = identifiedSymptoms;
    await session.patientData.update({ symptoms: identifiedSymptoms });

    // Start asking follow-up questions for the first symptom
    session.stage = 'follow-up-questions';
    session.currentSymptom = identifiedSymptoms[0];
    session.currentQuestionIndex = 0;

    const symptomRule = await SymptomRule.findByPk(session.currentSymptom);
    if (symptomRule) {
      const question = symptomRule.followUpQuestions[0];
      return `Thank you for sharing that. I've identified that you're experiencing: ${identifiedSymptoms.join(', ')}. 

Now I need to ask some specific questions about your ${session.currentSymptom}:

${question}`;
    }

    return "Thank you for sharing your symptoms. Let me prepare some follow-up questions for you.";

  } catch (error) {
    console.error('Error processing symptoms:', error);
    return "I encountered an error processing your symptoms. Could you please describe them again?";
  }
}

async function processFollowUpAnswer(message, session) {
  const { currentSymptom, currentQuestionIndex } = session;
  
  // Store the answer
  if (!session.patientData.responses) {
    session.patientData.responses = {};
  }
  
  const responses = session.patientData.responses || {};
  if (!responses[currentSymptom]) {
    responses[currentSymptom] = [];
  }
  responses[currentSymptom].push({
    question: session.currentQuestion,
    answer: message
  });
  
  await session.patientData.update({ responses });

  // Get the symptom rule
  const symptomRule = await SymptomRule.findByPk(currentSymptom);
  if (!symptomRule) {
    return "I encountered an error. Let me move to the next symptom.";
  }

  // Check if there are more questions for this symptom
  if (currentQuestionIndex + 1 < symptomRule.followUpQuestions.length) {
    session.currentQuestionIndex++;
    const nextQuestion = symptomRule.followUpQuestions[session.currentQuestionIndex];
    session.currentQuestion = nextQuestion;
    return nextQuestion;
  } else {
    // Move to next symptom or complete
    const currentSymptomIndex = session.collectedSymptoms.indexOf(currentSymptom);
    if (currentSymptomIndex + 1 < session.collectedSymptoms.length) {
      // Move to next symptom
      session.currentSymptom = session.collectedSymptoms[currentSymptomIndex + 1];
      session.currentQuestionIndex = 0;
      
      const nextSymptomRule = await SymptomRule.findByPk(session.currentSymptom);
      if (nextSymptomRule) {
        const firstQuestion = nextSymptomRule.followUpQuestions[0];
        session.currentQuestion = firstQuestion;
        return `Now let's talk about your ${session.currentSymptom}:

${firstQuestion}`;
      }
    } else {
      // All symptoms completed
      session.stage = 'completed';
      await session.patientData.update({ status: 'completed' });
      
      return `Thank you for providing all the information about your symptoms. I have collected detailed information about your ${session.collectedSymptoms.join(', ')}.

Our cardiologist will receive this information and will be better prepared for your consultation. I'm now scheduling an appointment for you and will send the details to our medical team.

You should receive a calendar invitation shortly. Is there anything else you'd like to add about your symptoms?`;
    }
  }

  return "Thank you for your response.";
}

async function scheduleConsultation(session) {
  try {
    const { patientData } = session;
    
    // Schedule for 1 hour from now (next available 15-minute slot)
    const now = new Date();
    const appointmentTime = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour later
    const endTime = new Date(appointmentTime.getTime() + 15 * 60 * 1000); // 15 minutes duration

    const event = {
      summary: `Tricog Health - Cardiology Consultation for ${patientData.name}`,
      description: `Patient: ${patientData.name}
Email: ${patientData.email}
Gender: ${patientData.gender}

Symptoms: ${patientData.symptoms.join(', ')}

Detailed Responses:
${Object.entries(patientData.responses || {}).map(([symptom, responses]) => 
  `${symptom.toUpperCase()}:\n${responses.map(r => `Q: ${r.question}\nA: ${r.answer}`).join('\n')}`
).join('\n\n')}`,
      start: {
        dateTime: appointmentTime.toISOString(),
        timeZone: 'UTC',
      },
      end: {
        dateTime: endTime.toISOString(),
        timeZone: 'UTC',
      },
      attendees: [
        { email: patientData.email },
        { email: process.env.DOCTOR_EMAIL || 'doctor@tricoghealth.com' }
      ],
    };

    const response = await calendar.events.insert({
      calendarId: 'primary',
      resource: event,
      sendUpdates: 'all'
    });

    await patientData.update({ appointmentScheduled: true });
    console.log('Calendar event created:', response.data.htmlLink);

  } catch (error) {
    console.error('Error scheduling consultation:', error);
  }
}

async function notifyDoctor(session) {
  try {
    const { patientData } = session;
    
    const message = `🏥 *New Patient Consultation Request*

👤 *Patient Information:*
Name: ${patientData.name}
Email: ${patientData.email}
Gender: ${patientData.gender}

🩺 *Reported Symptoms:*
${patientData.symptoms.join(', ')}

📋 *Detailed Responses:*
${Object.entries(patientData.responses || {}).map(([symptom, responses]) => 
  `*${symptom.toUpperCase()}:*\n${responses.map(r => `❓ ${r.question}\n💬 ${r.answer}`).join('\n')}`
).join('\n\n')}

📅 *Appointment:* Scheduled for next available slot
🆔 *Session ID:* ${patientData.sessionId}`;

    // Send to doctor's Telegram (replace with actual chat ID)
    await telegramBot.sendMessage(process.env.DOCTOR_TELEGRAM_ID || '123456789', message, { parse_mode: 'Markdown' });
    
  } catch (error) {
    console.error('Error sending Telegram notification:', error);
  }
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Tricog Health Assistant API is running' });
});

// Get all patients (for admin/doctor interface)
app.get('/api/patients', async (req, res) => {
  try {
    const patients = await PatientData.findAll({
      order: [['createdAt', 'DESC']]
    });
    res.json(patients);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Tricog Health Assistant server running on port ${PORT}`);
});
