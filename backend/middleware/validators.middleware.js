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
    // username must be a non-empty string
    body('username').notEmpty().withMessage('Username is required.'),
    // password must be a non-empty string
    body('password').notEmpty().withMessage('Password is required.'),
  ];
};

// Validation rules for setting the initial password
const setInitialPasswordRules = () => {
    return [
      body('username').notEmpty().withMessage('Username is required.'),
      body('tempPassword').notEmpty().withMessage('Temporary password is required.'),
      body('newPassword')
        .isLength({ min: 8 }).withMessage('New password must be at least 8 characters long.')
        .matches(/\d/).withMessage('Password must contain a number.')
        .matches(/[a-zA-Z]/).withMessage('Password must contain a letter.'),
    ];
};


module.exports = {
  handleValidationErrors,
  registerRules,
  loginRules,
  setInitialPasswordRules,
};