const bcrypt = require('bcryptjs');
const { sequelize } = require('./config/database');
const User = require('./models/User');

async function createPhysicalSupervisor() {
  try {
    await sequelize.authenticate();
    console.log('Database connected successfully.');

    // Check if physical supervisor already exists
    const existing = await User.findOne({
      where: { username: 'physical_supervisor' }
    });

    if (existing) {
      console.log('⚠️  User "physical_supervisor" already exists!');
      console.log(`   Current role: ${existing.role}`);
      
      if (existing.role !== 'physical_supervisor') {
        console.log('\n   Updating role to "physical_supervisor"...');
        await existing.update({ role: 'physical_supervisor', isActive: true });
        console.log('✓ Role updated successfully!');
      }
    } else {
      // Create new physical supervisor
      const hashedPassword = await bcrypt.hash('1234', 10);
      
      const newUser = await User.create({
        username: 'physical_supervisor',
        password: hashedPassword,
        role: 'physical_supervisor',
        isActive: true
      });

      console.log('✓ Physical supervisor created successfully!');
      console.log(`   Username: ${newUser.username}`);
      console.log(`   Password: 1234`);
      console.log(`   Role: ${newUser.role}`);
    }

    // Show all physical supervisors
    console.log('\n=== ALL PHYSICAL SUPERVISORS ===\n');
    const allPhysicalSupervisors = await User.findAll({
      where: { role: 'physical_supervisor', isActive: true },
      attributes: ['id', 'username', 'role']
    });

    if (allPhysicalSupervisors.length === 0) {
      console.log('No physical supervisors found.');
    } else {
      allPhysicalSupervisors.forEach(user => {
        console.log(`✓ ${user.username} (ID: ${user.id})`);
      });
    }

    await sequelize.close();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

createPhysicalSupervisor();
