const mongoose = require('mongoose');

// This is the blueprint for a User in our database.
const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true, // A username is mandatory
    unique: true,   // Every username must be unique
    trim: true      // Removes any whitespace from the beginning and end
  },
  passwordHash: {
    type: String,
    required: true  // The hashed password is mandatory
  },
  role: {
    type: String,
    required: true,
    enum: ['employee', 'admin'], // The role must be one of these two values
    default: 'employee'         // If not specified, the user is an 'employee'
  },
  status: {
    type: String,
    required: true,
    enum: ['pending', 'active'], // 'pending' for new users, 'active' after first login
    default: 'pending'
  },
  publicKey: {
    type: String,
    default: null // It's null until the user's app provides it
  }
}, {
  // Adds 'createdAt' and 'updatedAt' timestamps automatically
  timestamps: true
});

// Create the model from the schema
const User = mongoose.model('User', userSchema);

// Export the model so we can use it in other files
module.exports = User;