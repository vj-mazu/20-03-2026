const { sequelize } = require('../config/database');

/**
 * Migration: Create edit_propagation_logs table
 * 
 * This table tracks all edit propagations for audit purposes
 */
async function createEditPropagationLogsTable() {
  try {
    console.log('🔄 Creating edit_propagation_logs table...');

    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS edit_propagation_logs (
        id SERIAL PRIMARY KEY,
        entity_type VARCHAR(50) NOT NULL,
        entity_id INTEGER NOT NULL,
        old_data JSONB,
        new_data JSONB,
        propagated_by INTEGER REFERENCES users(id),
        timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    // Create indexes for better query performance
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_edit_propagation_logs_entity 
      ON edit_propagation_logs(entity_type, entity_id);
    `);

    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_edit_propagation_logs_timestamp 
      ON edit_propagation_logs(timestamp DESC);
    `);

    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_edit_propagation_logs_propagated_by 
      ON edit_propagation_logs(propagated_by);
    `);

    console.log('✅ edit_propagation_logs table created successfully');

  } catch (error) {
    console.error('❌ Error creating edit_propagation_logs table:', error);
    throw error;
  }
}

module.exports = createEditPropagationLogsTable;