const { sequelize } = require('../config/database');

/**
 * Migration to drop RAG system tables
 * Drops: rag_configs, rag_query_logs, rag_indexing_status
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Drop tables in reverse order of creation to handle foreign key constraints
    
    // Drop rag_indexing_status (no foreign keys)
    await queryInterface.sequelize.query(`
      DROP TABLE IF EXISTS rag_indexing_status CASCADE;
    `);
    console.log('✅ Dropped rag_indexing_status table');
    
    // Drop rag_query_logs (has foreign key to users)
    await queryInterface.sequelize.query(`
      DROP TABLE IF EXISTS rag_query_logs CASCADE;
    `);
    console.log('✅ Dropped rag_query_logs table');
    
    // Drop rag_configs (has foreign key to users)
    await queryInterface.sequelize.query(`
      DROP TABLE IF EXISTS rag_configs CASCADE;
    `);
    console.log('✅ Dropped rag_configs table');
    
    console.log('✅ RAG tables dropped successfully');
  },

  down: async (queryInterface, Sequelize) => {
    // This would recreate the tables, but we're removing RAG permanently
    // So we'll just log a message
    console.log('⚠️ Cannot restore RAG tables - they have been permanently removed');
    console.log('ℹ️ If you need to restore RAG tables, use the create_rag_tables migration');
  }
};
