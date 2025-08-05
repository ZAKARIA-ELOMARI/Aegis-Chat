const { body, validationResult } = require('express-validator');

// Middleware to handle the result of the validation chains
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// Validation rules for user registration
const registerRules = () => {
  return [
    // username must be a non-empty string and is trimmed of whitespace
    body('username')
      .trim()
      .notEmpty().withMessage('Username is required.')
      .isLength({ min: 3 }).withMessage('Username must be at least 3 characters long.'),
  ];
};

// Validation rules for user login
const loginRules = () => {
  return [
    // email must be a valid email
    body('email').isEmail().withMessage('Please provide a valid email.'),
    // password must be a non-empty string
    body('password').notEmpty().withMessage('Password is required.'),
  ];
};

// Validation rules for setting the initial password
const setInitialPasswordRules = () => {
    return [
      // We only need to validate the newPassword, since the user is identified by the tempToken.
      body('newPassword')
        .isStrongPassword({
            minLength: 8,
            minLowercase: 1,
            minUppercase: 1,
            minNumbers: 1,
            minSymbols: 1,
        }).withMessage('Password must be at least 8 characters long and contain at least one lowercase letter, one uppercase letter, one number, and one special character.'),
    ];
};

// Validation rules for password reset
const resetPasswordRules = () => {
    return [
      body('newPassword')
        .isStrongPassword({
            minLength: 8,
            minLowercase: 1,
            minUppercase: 1,
            minNumbers: 1,
            minSymbols: 1,
        }).withMessage('Password must be at least 8 characters long and contain at least one lowercase letter, one uppercase letter, one number, and one special character.'),
    ];
};


module.exports = {
  handleValidationErrors,
  registerRules,
  loginRules,
  setInitialPasswordRules,
  resetPasswordRules,
};