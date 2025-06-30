const winston = require('winston');
require('winston-mongodb');

const options = {
  // Transport for storing logs in the console
  console: {
    level: 'debug', // Log all messages of level 'debug' and above
    handleExceptions: true,
    json: false,
    colorize: true,
    format: winston.format.simple(),
  },
  // Transport for storing logs in MongoDB
  mongodb: {
    level: 'info', // Log all messages of level 'info' and above
    db: process.env.MONGO_URI,
    collection: 'logs', // Name of the collection to store logs
    options: { useUnifiedTopology: true },
    format: winston.format.combine(
      winston.format.timestamp(), // Add a timestamp to each log
      winston.format.json()     // Log in JSON format
    ),
  },
};

// Create a new Winston logger with the transports we defined
const logger = winston.createLogger({
  transports: [
    new winston.transports.Console(options.console),
    new winston.transports.MongoDB(options.mongodb),
  ],
  exitOnError: false, // Do not exit on handled exceptions
});

// Create a stream object with a 'write' function that will be used by morgan
logger.stream = {
  write: function(message, encoding) {
    // Use the 'info' log level so the output will be picked up by both transports
    logger.info(message.trim());
  },
};

module.exports = logger;