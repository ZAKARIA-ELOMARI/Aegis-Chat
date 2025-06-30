const mongoose = require('mongoose');
const logger = require('../config/logger');

const connectDB = async () => {
  try {
    // Attempt to connect to the MongoDB cluster
    await mongoose.connect(process.env.MONGO_URI);
    logger.info('Successfully connected to MongoDB.');
  } catch (error) {
    // If there's an error, log it and exit the application
    logger.error('Error connecting to MongoDB:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;