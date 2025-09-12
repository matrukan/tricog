const { Sequelize, DataTypes } = require('sequelize');
const path = require('path');

// Initialize PostgreSQL database
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  protocol: 'postgres',
  logging: false,
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  }
});


// Symptom Rules Model
const SymptomRule = sequelize.define('SymptomRule', {
  symptom: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    primaryKey: true
  },
  followUpQuestions: {
    type: DataTypes.TEXT,
    allowNull: false,
    get() {
      const rawValue = this.getDataValue('followUpQuestions');
      return rawValue ? JSON.parse(rawValue) : [];
    },
    set(value) {
      this.setDataValue('followUpQuestions', JSON.stringify(value));
    }
  }
});

// Patient Data Model
const PatientData = sequelize.define('PatientData', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  sessionId: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: true
  },
  email: {
    type: DataTypes.STRING,
    allowNull: true
  },
  gender: {
    type: DataTypes.STRING,
    allowNull: true
  },
  symptoms: {
    type: DataTypes.TEXT,
    allowNull: true,
    get() {
      const rawValue = this.getDataValue('symptoms');
      return rawValue ? JSON.parse(rawValue) : [];
    },
    set(value) {
      this.setDataValue('symptoms', JSON.stringify(value));
    }
  },
  responses: {
    type: DataTypes.TEXT,
    allowNull: true,
    get() {
      const rawValue = this.getDataValue('responses');
      return rawValue ? JSON.parse(rawValue) : {};
    },
    set(value) {
      this.setDataValue('responses', JSON.stringify(value));
    }
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: 'active' // active, completed, scheduled
  },
  appointmentScheduled: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
});

// Initialize database and seed symptom rules
async function initializeDatabase() {
  try {
    await sequelize.authenticate();
    console.log('Database connection established successfully.');
    
    await sequelize.sync({ force: false });
    console.log('Database tables created successfully.');
    
    // Seed symptom rules
    await seedSymptomRules();
    
  } catch (error) {
    console.error('Unable to connect to the database:', error);
  }
}

async function seedSymptomRules() {
  const symptomRules = [
    {
      symptom: 'chest pain',
      followUpQuestions: [
        'When did the chest pain start?',
        'Is the pain constant or does it come and go?',
        'Does the pain get worse with activity or exercise?',
        'Can you describe the type of pain (sharp, dull, burning, pressure)?',
        'Does the pain radiate to your arm, neck, jaw, or back?',
        'On a scale of 1-10, how would you rate the pain intensity?'
      ]
    },
    {
      symptom: 'shortness of breath',
      followUpQuestions: [
        'How long have you been experiencing shortness of breath?',
        'Does it occur during rest or only with activity?',
        'Do you have any other symptoms like cough or wheezing?',
        'Does lying flat make the breathing worse?',
        'Have you noticed any swelling in your legs or feet?',
        'Do you wake up at night feeling short of breath?'
      ]
    },
    {
      symptom: 'fatigue',
      followUpQuestions: [
        'How long have you been feeling unusually tired?',
        'Is the fatigue constant or does it come and go?',
        'Does the fatigue interfere with your daily activities?',
        'Do you feel tired even after resting or sleeping?',
        'Have you noticed any changes in your appetite or weight?',
        'Are you experiencing any dizziness or lightheadedness?'
      ]
    },
    {
      symptom: 'palpitations',
      followUpQuestions: [
        'When do you notice your heart racing or pounding?',
        'How long do the palpitation episodes last?',
        'Do you feel dizzy or lightheaded during these episodes?',
        'Are the palpitations triggered by specific activities or emotions?',
        'Do you experience any chest discomfort with the palpitations?',
        'Have you had any fainting episodes?'
      ]
    },
    {
      symptom: 'dizziness',
      followUpQuestions: [
        'When did the dizziness start?',
        'Does the dizziness occur when you stand up quickly?',
        'Do you feel like the room is spinning (vertigo)?',
        'Are you taking any new medications?',
        'Have you experienced any recent changes in hearing?',
        'Do you feel nauseous with the dizziness?'
      ]
    }
  ];

  for (const rule of symptomRules) {
    try {
      await SymptomRule.findOrCreate({
        where: { symptom: rule.symptom },
        defaults: rule
      });
    } catch (error) {
      console.log(`Symptom rule for "${rule.symptom}" already exists or error occurred:`, error.message);
    }
  }
  
  console.log('Symptom rules seeded successfully.');
}

module.exports = {
  sequelize,
  SymptomRule,
  PatientData,
  initializeDatabase
};
