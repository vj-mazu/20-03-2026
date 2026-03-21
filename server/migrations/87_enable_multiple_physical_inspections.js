/**
 * Migration: Enable Multiple Physical Inspections per Entry
 * 
 * Changes:
 * 1. Remove unique constraint on lot_allotment_id (allow multiple inspections)
 * 2. Add sample_entry_id for direct reference
 * 3. Split cutting into cutting1 and cutting2
 * 4. Add remarks field
 * 5. Add indexes for querying
 */

const { DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    console.log('Starting migration: Enable multiple physical inspections...');

    try {
      // 1. Remove unique constraint on lot_allotment_id
      console.log('Removing unique constraint on lot_allotment_id...');
      await queryInterface.removeIndex('physical_inspections', 'physical_inspections_lot_allotment_id_key')
        .catch(() => console.log('Unique index already removed or does not exist'));

      // 2. Add sample_entry_id column
      console.log('Adding sample_entry_id column...');
      await queryInterface.addColumn('physical_inspections', 'sample_entry_id', {
        type: DataTypes.UUID,
        allowNull: true, // Temporarily allow null for existing records
        references: {
          model: 'sample_entries',
          key: 'id'
        }
      }).catch(err => console.log('sample_entry_id column may already exist:', err.message));

      // 3. Backfill sample_entry_id from lot_allotments
      console.log('Backfilling sample_entry_id from lot_allotments...');
      await queryInterface.sequelize.query(`
        UPDATE physical_inspections pi
        SET sample_entry_id = la.sample_entry_id
        FROM lot_allotments la
        WHERE pi.lot_allotment_id = la.id
        AND pi.sample_entry_id IS NULL
      `);

      // 4. Make sample_entry_id NOT NULL after backfill
      console.log('Making sample_entry_id NOT NULL...');
      await queryInterface.changeColumn('physical_inspections', 'sample_entry_id', {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'sample_entries',
          key: 'id'
        }
      });

      // 5. Rename cutting to cutting1
      console.log('Renaming cutting to cutting1...');
      await queryInterface.renameColumn('physical_inspections', 'cutting', 'cutting1')
        .catch(err => console.log('Column may already be renamed:', err.message));

      // 6. Add cutting2 column
      console.log('Adding cutting2 column...');
      await queryInterface.addColumn('physical_inspections', 'cutting2', {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true, // Allow null for existing records
        defaultValue: 0
      }).catch(err => console.log('cutting2 column may already exist:', err.message));

      // 7. Add remarks column
      console.log('Adding remarks column...');
      await queryInterface.addColumn('physical_inspections', 'remarks', {
        type: DataTypes.TEXT,
        allowNull: true
      }).catch(err => console.log('remarks column may already exist:', err.message));

      // 8. Add is_complete flag (for tracking if all bags inspected)
      console.log('Adding is_complete column...');
      await queryInterface.addColumn('physical_inspections', 'is_complete', {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      }).catch(err => console.log('is_complete column may already exist:', err.message));

      // 9. Add indexes
      console.log('Adding indexes...');
      
      // Index for querying inspections by sample entry
      await queryInterface.addIndex('physical_inspections', ['sample_entry_id'], {
        name: 'idx_physical_inspections_sample_entry'
      }).catch(() => console.log('Index idx_physical_inspections_sample_entry already exists'));

      // Index for querying by lot allotment (non-unique now)
      await queryInterface.addIndex('physical_inspections', ['lot_allotment_id'], {
        name: 'idx_physical_inspections_lot_allotment'
      }).catch(() => console.log('Index idx_physical_inspections_lot_allotment already exists'));

      // Index for querying incomplete inspections
      await queryInterface.addIndex('physical_inspections', ['sample_entry_id', 'is_complete'], {
        name: 'idx_physical_inspections_completion'
      }).catch(() => console.log('Index idx_physical_inspections_completion already exists'));

      console.log('✓ Migration completed successfully!');
      console.log('Physical inspections can now have multiple records per entry.');

    } catch (error) {
      console.error('Migration failed:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    console.log('Rolling back migration: Enable multiple physical inspections...');

    try {
      // Remove indexes
      await queryInterface.removeIndex('physical_inspections', 'idx_physical_inspections_sample_entry')
        .catch(() => {});
      await queryInterface.removeIndex('physical_inspections', 'idx_physical_inspections_lot_allotment')
        .catch(() => {});
      await queryInterface.removeIndex('physical_inspections', 'idx_physical_inspections_completion')
        .catch(() => {});

      // Remove columns
      await queryInterface.removeColumn('physical_inspections', 'is_complete');
      await queryInterface.removeColumn('physical_inspections', 'remarks');
      await queryInterface.removeColumn('physical_inspections', 'cutting2');
      await queryInterface.renameColumn('physical_inspections', 'cutting1', 'cutting');
      await queryInterface.removeColumn('physical_inspections', 'sample_entry_id');

      // Restore unique constraint
      await queryInterface.addIndex('physical_inspections', ['lot_allotment_id'], {
        unique: true,
        name: 'physical_inspections_lot_allotment_id_key'
      });

      console.log('✓ Rollback completed successfully!');

    } catch (error) {
      console.error('Rollback failed:', error);
      throw error;
    }
  }
};
