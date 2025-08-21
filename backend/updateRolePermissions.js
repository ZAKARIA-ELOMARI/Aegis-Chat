const mongoose = require('mongoose');
const { Role, PERMISSIONS } = require('./models/role.model');
require('dotenv').config();

console.log('Starting permission update for existing roles...');

const updateRolePermissions = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    console.log('MongoDB URI:', mongoUri ? 'Found' : 'Not found');
    
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB for updating role permissions');

    // Update Super Admin role to include all permissions
    const superAdminRole = await Role.findOne({ name: 'Super Admin' });
    if (superAdminRole) {
      superAdminRole.permissions = [...PERMISSIONS]; // All permissions including new ones
      await superAdminRole.save();
      console.log(`Updated Super Admin role with permissions: [${superAdminRole.permissions.join(', ')}]`);
    } else {
      console.log('Super Admin role not found');
    }

    // Update Admin role to include the new security permission
    const adminRole = await Role.findOne({ name: 'Admin' });
    if (adminRole) {
      if (!adminRole.permissions.includes('VIEW_SECURITY_LOGS')) {
        adminRole.permissions.push('VIEW_SECURITY_LOGS');
        await adminRole.save();
        console.log(`Updated Admin role with permissions: [${adminRole.permissions.join(', ')}]`);
      } else {
        console.log('Admin role already has VIEW_SECURITY_LOGS permission');
      }
    } else {
      console.log('Admin role not found');
    }

    console.log('Permission update completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error updating role permissions:', error);
    process.exit(1);
  }
};

updateRolePermissions();
