const mongoose = require('mongoose');
const { Role, PERMISSIONS } = require('./models/role.model');
require('dotenv').config();

console.log('Starting role seeding process...');

const seedRoles = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    console.log('MongoDB URI:', mongoUri ? 'Found' : 'Not found');
    
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB for seeding roles');

    // Check if roles already exist
    const existingRoles = await Role.find();
    if (existingRoles.length > 0) {
      console.log('Roles already exist, skipping seeding');
      process.exit(0);
    }

    // Create default roles
    const defaultRoles = [
      {
        name: 'Super Admin',
        permissions: [...PERMISSIONS] // All permissions
      },
      {
        name: 'Admin',
        permissions: ['CREATE_USER', 'DEACTIVATE_USER', 'RESET_USER_PASSWORD', 'VIEW_SYSTEM_LOGS']
      },
      {
        name: 'HR Manager',
        permissions: ['CREATE_USER', 'DEACTIVATE_USER', 'RESET_USER_PASSWORD']
      },
      {
        name: 'Employee',
        permissions: [] // No special permissions
      }
    ];

    for (const roleData of defaultRoles) {
      const role = new Role(roleData);
      await role.save();
      console.log(`Created role: ${role.name} with permissions: [${role.permissions.join(', ')}]`);
    }

    console.log('Role seeding completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding roles:', error);
    process.exit(1);
  }
};

seedRoles();
