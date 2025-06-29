const User = require('../models/user.model');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken'); // <-- Import the new library


// @desc   Register a new user (employee)
// @route  POST /api/auth/register
// @access Private (to be restricted to Admins later)
exports.register = async (req, res) => {
  try {
    // Get username from the request body
    const { username } = req.body;

    // 1. Check if username is provided
    if (!username) {
      return res.status(400).json({ message: 'Please provide a username.' });
    }

    // 2. Check if user already exists
    const userExists = await User.findOne({ username });
    if (userExists) {
      return res.status(400).json({ message: 'User with that username already exists.' });
    }

    // 3. Generate a secure temporary password
    // For this example, a simple random string. In production, consider a stronger generator.
    const tempPassword = Math.random().toString(36).slice(-8);

    // 4. Hash the temporary password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(tempPassword, salt);

    // 5. Create the new user object using our model
    const user = await User.create({
      username,
      passwordHash,
      role: 'employee', // All users created via this route are employees
      status: 'pending'   // Status is 'pending' until they log in and change password
    });

    // 6. Respond with success and the new user's info
    if (user) {
      res.status(201).json({
        message: 'User registered successfully. Please provide them with their temporary password.',
        userId: user._id,
        username: user.username,
        tempPassword: tempPassword // Send this back so the admin can give it to the employee
      });
    } else {
      res.status(400).json({ message: 'Invalid user data.' });
    }

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error during user registration.' });
  }
};


// @desc   Authenticate a user & get token
// @route  POST /api/auth/login
// @access Public
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    // 1. Check if user exists
    const user = await User.findOne({ username });
    if (!user) {
      // Use a generic error message for security
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    // 2. Check if the provided password matches the stored hash
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      // Use the same generic message
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    // 3. User is authenticated. Create a JWT.
    const payload = {
      user: {
        id: user.id,      // Include user ID in the token
        role: user.role   // Include user role in the token
      },
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET, // Use the secret from our .env file
      { expiresIn: '24h' },   // The token will be valid for 24 hours
      (err, token) => {
        if (err) throw err;
        // 4. Send the token back to the client
        res.status(200).json({
          message: 'Login successful.',
          token: token,
          user: {
            id: user.id,
            username: user.username,
            role: user.role
          }
        });
      }
    );

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error during login.' });
  }
};

