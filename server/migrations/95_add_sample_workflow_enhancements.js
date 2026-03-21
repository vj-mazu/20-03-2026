/**
 * Migration 95: Sample Workflow Enhancements
 * 
 * Adds new fields for:
 * 1. sample_entries: packaging, sample_collected_by, sample_given_to_office, entry sub-type
 * 2. quality_parameters: bend1/bend2 pair, smix_enabled, lmix_enabled, paddy_wb_enabled
 * 3. cooking_reports: recheck_count, has_remarks
 * 4. sample_entry_offerings: full offering/price data table
 */

const { sequelize } = require('../config/database');

module.exports = {
  async up() {
    const qi = sequelize.getQueryInterface();

    // ── 1. sample_entries: new columns ──
    const seCols = await qi.describeTable('sample_entries').catch(() => ({}));

    if (!seCols.packaging) {
      await sequelize.query(`ALTER TABLE sample_entries ADD COLUMN packaging VARCHAR(10) DEFAULT '75'`);
    }
    if (!seCols.sample_collected_by) {
      await sequelize.query(`ALTER TABLE sample_entries ADD COLUMN sample_collected_by VARCHAR(200)`);
    }
    if (!seCols.sample_given_to_office) {
      await sequelize.query(`ALTER TABLE sample_entries ADD COLUMN sample_given_to_office BOOLEAN DEFAULT false`);
    }

    // Update entry_type enum to include new sub-types
    try {
      await sequelize.query(`ALTER TYPE "enum_sample_entries_entry_type" ADD VALUE IF NOT EXISTS 'NEW_PADDY_SAMPLE'`);
      await sequelize.query(`ALTER TYPE "enum_sample_entries_entry_type" ADD VALUE IF NOT EXISTS 'READY_LORRY'`);
      await sequelize.query(`ALTER TYPE "enum_sample_entries_entry_type" ADD VALUE IF NOT EXISTS 'LOCATION_SAMPLE'`);
    } catch (e) {
      console.log('  ℹ️ Entry type enum values may already exist');
    }

    // ── 2. quality_parameters: new columns ──
    const qpCols = await qi.describeTable('quality_parameters').catch(() => ({}));

    if (!qpCols.bend_1) {
      await sequelize.query(`ALTER TABLE quality_parameters ADD COLUMN bend_1 DECIMAL(5,2) DEFAULT 0`);
    }
    if (!qpCols.bend_2) {
      await sequelize.query(`ALTER TABLE quality_parameters ADD COLUMN bend_2 DECIMAL(5,2) DEFAULT 0`);
    }
    if (!qpCols.smix_enabled) {
      await sequelize.query(`ALTER TABLE quality_parameters ADD COLUMN smix_enabled BOOLEAN DEFAULT false`);
    }
    if (!qpCols.lmix_enabled) {
      await sequelize.query(`ALTER TABLE quality_parameters ADD COLUMN lmix_enabled BOOLEAN DEFAULT false`);
    }
    if (!qpCols.paddy_wb_enabled) {
      await sequelize.query(`ALTER TABLE quality_parameters ADD COLUMN paddy_wb_enabled BOOLEAN DEFAULT false`);
    }

    // ── 3. cooking_reports: new columns ──
    const crCols = await qi.describeTable('cooking_reports').catch(() => ({}));

    if (!crCols.recheck_count) {
      await sequelize.query(`ALTER TABLE cooking_reports ADD COLUMN recheck_count INTEGER DEFAULT 0`);
    }
    if (!crCols.has_remarks) {
      await sequelize.query(`ALTER TABLE cooking_reports ADD COLUMN has_remarks BOOLEAN DEFAULT false`);
    }

    // ── 4. sample_entry_offerings table ──
    const tables = await qi.showAllTables();
    if (!tables.includes('sample_entry_offerings')) {
      await sequelize.query(`
        CREATE TABLE sample_entry_offerings (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          sample_entry_id UUID NOT NULL REFERENCES sample_entries(id) ON DELETE CASCADE,
          offer_rate DECIMAL(10,2),
          sute DECIMAL(10,2) DEFAULT 0,
          sute_unit VARCHAR(20) DEFAULT 'per_bag',
          base_rate_type VARCHAR(20),
          base_rate_unit VARCHAR(20) DEFAULT 'per_bag',
          hamali DECIMAL(10,2) DEFAULT 0,
          hamali_unit VARCHAR(20) DEFAULT 'per_bag',
          hamali_by VARCHAR(20) DEFAULT 'admin',
          moisture_value DECIMAL(10,2) DEFAULT 0,
          brokerage DECIMAL(10,2) DEFAULT 0,
          brokerage_unit VARCHAR(20) DEFAULT 'per_bag',
          brokerage_by VARCHAR(20) DEFAULT 'admin',
          lf DECIMAL(10,2) DEFAULT 0,
          lf_unit VARCHAR(20) DEFAULT 'per_bag',
          egb_type VARCHAR(20) DEFAULT 'mill',
          egb_value DECIMAL(10,2) DEFAULT 0,
          final_price DECIMAL(10,2),
          is_finalized BOOLEAN DEFAULT false,
          created_by INTEGER REFERENCES users(id),
          updated_by INTEGER REFERENCES users(id),
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
        )
      `);

      // Indexes
      await sequelize.query(`CREATE INDEX idx_seo_sample_entry ON sample_entry_offerings(sample_entry_id)`);
      await sequelize.query(`CREATE INDEX idx_seo_finalized ON sample_entry_offerings(is_finalized)`);
    }

    console.log('✅ Migration 95: Sample workflow enhancements completed');
  }
};
