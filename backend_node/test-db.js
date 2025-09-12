require('dotenv').config();
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  protocol: 'postgres',
  logging: console.log,
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  }
});

async function testConnection() {
  try {
    await sequelize.authenticate();
    console.log('✅ PostgreSQL connection has been established successfully.');
  } catch (error) {
    console.error('❌ Unable to connect to the database:', error);
  } finally {
    await sequelize.close();
  }
}

testConnection();
