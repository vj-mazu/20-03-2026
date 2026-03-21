/**
 * Create Default Admin User
 * Run this after recreating the database to create an admin user for login
 * 
 * Usage: node create-default-admin.js
 */

require('dotenv').config();
const bcrypt = require('bcryptjs');
const { sequelize } = require('./config/database');

async function createDefaultAdmin() {
  try {
    console.log('🔄 Creating default admin user...\n');

    // Test database connection
    await sequelize.authenticate();
    console.log('✅ Database connection established\n');

    // Check if users table exists
    const [tables] = await sequelize.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      );
    `);

    if (!tables[0].exists) {
      console.error('❌ Users table does not exist!');
      console.log('   Run the server first to create tables: npm run dev');
      process.exit(1);
    }

    // Check if admin user already exists
    const [existingAdmin] = await sequelize.query(`
      SELECT id, username, role FROM users WHERE username = 'admin';
    `);

    if (existingAdmin.length > 0) {
      console.log('⚠️  Admin user already exists:');
      console.log(`   Username: ${existingAdmin[0].username}`);
      console.log(`   Role: ${existingAdmin[0].role}`);
      console.log(`   ID: ${existingAdmin[0].id}\n`);
      
      const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
      });

      readline.question('Do you want to reset the admin password? (yes/no): ', async (answer) => {
        if (answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y') {
          const hashedPassword = await bcrypt.hash('admin123', 10);
          await sequelize.query(`
            UPDATE users 
            SET password = :password, "updatedAt" = NOW()
            WHERE username = 'admin';
          `, {
            replacements: { password: hashedPassword }
          });
          console.log('\n✅ Admin password reset successfully!');
          console.log('   Username: admin');
          console.log('   Password: admin123\n');
        } else {
          console.log('\n⏭️  Skipped password reset\n');
        }
        readline.close();
        process.exit(0);
      });
      return;
    }

    // Create admin user
    console.log('📝 Creating admin user...');
    const hashedPassword = await bcrypt.hash('admin123', 10);

    await sequelize.query(`
      INSERT INTO users (username, password, role, "isActive", "createdAt", "updatedAt")
      VALUES (:username, :password, :role, :isActive, NOW(), NOW());
    `, {
      replacements: {
        username: 'admin',
        password: hashedPassword,
        role: 'admin',
        isActive: true
      }
    });

    console.log('\n✅ Admin user created successfully!\n');
    console.log('═══════════════════════════════════');
    console.log('   Username: admin');
    console.log('   Password: admin123');
    console.log('═══════════════════════════════════\n');
    console.log('⚠️  IMPORTANT: Change this password after first login!\n');

    // Verify the user was created
    const [newAdmin] = await sequelize.query(`
      SELECT id, username, role, "isActive" FROM users WHERE username = 'admin';
    `);

    console.log('✅ Verification:');
    console.log(`   ID: ${newAdmin[0].id}`);
    console.log(`   Username: ${newAdmin[0].username}`);
    console.log(`   Role: ${newAdmin[0].role}`);
    console.log(`   Active: ${newAdmin[0].isActive}\n`);

    console.log('🎉 You can now login with these credentials!\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    console.error('\nFull error:', error);
    process.exit(1);
  }
}

createDefaultAdmin();
