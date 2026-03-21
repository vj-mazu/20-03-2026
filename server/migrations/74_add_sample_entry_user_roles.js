/**
 * Migration 74: Add Sample Entry to Purchase Workflow User Roles
 * 
 * Extends the user roles enum to support the new workflow:
 * - quality_supervisor: Reviews staff entries and adds quality parameters
 * - physical_supervisor: Receives allotted lots and adds physical inspection data
 * - inventory_staff: Adds weight and location data
 * - financial_account: View-only access to final data
 * 
 * Existing roles (staff, manager, admin) are retained for backward compatibility.
 * Admin role serves as Owner in the new workflow.
 */

const { sequelize } = require('../config/database');

async function up() {
  const queryInterface = sequelize.getQueryInterface();
  
  try {
    console.log('🔄 Migration 74: Adding Sample Entry user roles...');
    
    // Check if users table exists
    const [tables] = await sequelize.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      );
    `);
    
    if (!tables[0].exists) {
      console.log('⚠️  Users table does not exist yet, skipping role migration');
      return;
    }
    
    // Check if the enum type exists
    const [enumTypes] = await sequelize.query(`
      SELECT EXISTS (
        SELECT 1 FROM pg_type 
        WHERE typname = 'enum_users_role'
      );
    `);
    
    if (!enumTypes[0].exists) {
      console.log('⚠️  Enum type does not exist, will be created with table');
      return;
    }
    
    // Get current enum values
    const [currentValues] = await sequelize.query(`
      SELECT enumlabel 
      FROM pg_enum 
      WHERE enumtypid = (
        SELECT oid FROM pg_type WHERE typname = 'enum_users_role'
      );
    `);
    
    const existingRoles = currentValues.map(row => row.enumlabel);
    console.log('📋 Current roles:', existingRoles);
    
    // New roles to add
    const newRoles = [
      'quality_supervisor',
      'physical_supervisor',
      'inventory_staff',
      'financial_account'
    ];
    
    // Check if we need to recreate the enum (if it only has 3 roles)
    if (existingRoles.length === 3 && !existingRoles.includes('quality_supervisor')) {
      console.log('🔄 Recreating enum with all 7 roles...');
      
      // Step 1: Convert column to VARCHAR
      await sequelize.query(`
        ALTER TABLE users ALTER COLUMN role TYPE VARCHAR(50);
      `);
      console.log('✅ Converted role column to VARCHAR');
      
      // Step 2: Drop old enum
      await sequelize.query(`
        DROP TYPE IF EXISTS enum_users_role CASCADE;
      `);
      console.log('✅ Dropped old enum type');
      
      // Step 3: Create new enum with all roles
      await sequelize.query(`
        CREATE TYPE enum_users_role AS ENUM (
          'staff',
          'manager',
          'admin',
          'quality_supervisor',
          'physical_supervisor',
          'inventory_staff',
          'financial_account'
        );
      `);
      console.log('✅ Created new enum with all 7 roles');
      
      // Step 4: Convert column back to enum
      await sequelize.query(`
        ALTER TABLE users ALTER COLUMN role TYPE enum_users_role USING role::enum_users_role;
      `);
      console.log('✅ Converted role column back to enum');
      
      console.log('✅ Migration 74: All 7 roles added successfully');
    } else {
      // Add new roles one by one if they don't exist
      for (const role of newRoles) {
        if (!existingRoles.includes(role)) {
          await sequelize.query(`
            ALTER TYPE enum_users_role ADD VALUE IF NOT EXISTS '${role}';
          `);
          console.log(`✅ Added role: ${role}`);
        } else {
          console.log(`⏭️  Role already exists: ${role}`);
        }
      }
      
      console.log('✅ Migration 74: Sample Entry user roles added successfully');
    }
    
  } catch (error) {
    console.error('❌ Migration 74 error:', error.message);
    console.error('Full error:', error);
    throw error;
  }
}

async function down() {
  console.log('⚠️  Migration 74: Rollback not supported for enum values');
  console.log('   Removing enum values requires recreating the enum type');
  console.log('   which would require updating all existing data');
}

module.exports = { up, down };
