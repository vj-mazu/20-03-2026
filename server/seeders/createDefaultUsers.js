const bcrypt = require('bcryptjs');
const User = require('../models/User');

const createDefaultUsers = async () => {
  try {
    // Check if any admin user exists
    const adminCount = await User.count({ where: { role: 'admin' } });

    if (adminCount === 0) {
      console.log('🔄 No admin user found. Creating default admin...');

      // Create default admin user
      await User.create({
        username: 'admin',
        password: await bcrypt.hash('admin123', 10),
        role: 'admin',
        isActive: true
      });

      console.log('✅ Default admin user created successfully');
      console.log('═══════════════════════════════════════════');
      console.log('   Username: admin');
      console.log('   Password: admin123');
      console.log('═══════════════════════════════════════════');
      console.log('⚠️  IMPORTANT: Change this password after first login!');
    } else {
      console.log('👥 Admin user already exists');
    }
  } catch (error) {
    console.error('❌ Error creating default users:', error.message);
  }
};

module.exports = createDefaultUsers;