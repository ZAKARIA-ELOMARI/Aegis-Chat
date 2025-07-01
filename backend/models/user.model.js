const mongoose = require('mongoose');

// This is the blueprint for a User in our database.
const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true, // A username is mandatory
    unique: true,   // Every username must be unique
    trim: true      // Removes any whitespace from the beginning and end
  },
  email: {
    type: String,
    required: [true, 'Please provide an email.'],
    unique: true,
    lowercase: true, // Store emails in a consistent format
    trim: true
  },
  passwordHash: {
    type: String,
    required: true  // The hashed password is mandatory
  },
  role: { // This field is changed
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Role',
    required: true,
  },
  status: {
    type: String,
    required: true,
    enum: ['pending', 'active', 'deactivated'], // 'pending' for new users, 'active' after first login
    default: 'pending'
  },
  passwordResetToken: String,
  passwordResetExpires: Date,

  publicKey: {
    type: String,
    default: null // It's null until the user's app provides it
  },
  twoFactorSecret: {
    type: String,
    default: null,
  },
  isTwoFactorEnabled: {
    type: Boolean,
    default: false,
  },
  refreshToken: { // Add this new field
    type: String,
  }
}, {
  // Adds 'createdAt' and 'updatedAt' timestamps automatically
  timestamps: true
});

userSchema.methods.createPasswordResetToken = function() {
  const resetToken = crypto.randomBytes(32).toString('hex');

  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  // Set the token to expire in 10 minutes
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

  // Return the unhashed token to be sent via email
  return resetToken;
};


// Create the model from the schema
const User = mongoose.model('User', userSchema);

// Export the model so we can use it in other files
module.exports = User;