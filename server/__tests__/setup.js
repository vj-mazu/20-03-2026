// Jest setup file for database tests
const { sequelize } = require('../config/database');

// Increase timeout for property-based tests
jest.setTimeout(60000);

// Setup database connection before all tests
beforeAll(async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connection established successfully.');
  } catch (error) {
    console.error('Unable to connect to the database:', error);
    throw error;
  }
});

// Clean up after all tests
afterAll(async () => {
  try {
    await sequelize.close();
    console.log('Database connection closed.');
  } catch (error) {
    console.error('Error closing database connection:', error);
  }
});