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

// Create a transports array that always includes the console
const transports = [
  new winston.transports.Console(options.console),
];

// Only add MongoDB transport if NOT in test environment
if (process.env.NODE_ENV !== 'test') {
  transports.push(new winston.transports.MongoDB(options.mongodb));
}

// Create the logger with our conditional transports
const logger = winston.createLogger({
  transports,
  exitOnError: false,
});

logger.stream = {
  write: function(message, encoding) {
    logger.info(message.trim());
  },
};

module.exports = logger;