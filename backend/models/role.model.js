const mongoose = require('mongoose');

// Define all possible permissions in the system
const PERMISSIONS = [
  'CREATE_USER',
  'DEACTIVATE_USER',
  'RESET_USER_PASSWORD',
  'VIEW_SYSTEM_LOGS',
  'BROADCAST_MESSAGE',
  'MANAGE_ROLES' // A permission for managing roles themselves
];

const roleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true, // e.g., 'Super Admin', 'Employee', 'HR Manager'
  },
  permissions: [{
    type: String,
    enum: PERMISSIONS, // Ensures only valid permissions can be added
  }],
});

const Role = mongoose.model('Role', roleSchema);

module.exports = { Role, PERMISSIONS };