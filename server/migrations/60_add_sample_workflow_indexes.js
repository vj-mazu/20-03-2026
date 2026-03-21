/**
 * Migration: Add performance indexes for sample entry workflow tables
 * 
 * These indexes are critical for handling 3M+ records efficiently.
 * Without them, queries for AllottedSupervisors, SampleBook, and
 * PhysicalInspection pages degrade to full table scans.
 */
const { sequelize } = require('../config/database');

const INDEXES = [
    // Sample entries - most queried table
    {
        name: 'idx_sample_entries_workflow_date',
        sql: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sample_entries_workflow_date ON sample_entries("workflowStatus", "createdAt" DESC)'
    },
    {
        name: 'idx_sample_entries_supervisor',
        sql: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sample_entries_supervisor ON sample_entries("assignedSupervisorId", "workflowStatus")'
    },
    // Physical inspections - joined on every trip detail
    {
        name: 'idx_physical_inspections_entry',
        sql: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_physical_inspections_entry ON physical_inspections("sampleEntryId", "createdAt" DESC)'
    },
    // Offerings - joined on every detail view
    {
        name: 'idx_offerings_entry',
        sql: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_offerings_entry ON sample_entry_offerings("sampleEntryId")'
    },
    // Quality parameters - joined on every detail view
    {
        name: 'idx_quality_params_entry',
        sql: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quality_params_entry ON quality_parameters("sampleEntryId")'
    },
    // Lot allotments - joined on allotted supervisors page
    {
        name: 'idx_lot_allotments_entry',
        sql: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_lot_allotments_entry ON lot_allotments("sampleEntryId")'
    },
    // Audit logs - queried by entry and date
    {
        name: 'idx_audit_logs_entry',
        sql: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_entry ON sample_entry_audit_logs("sampleEntryId", "createdAt" DESC)'
    }
];

module.exports = {
    up: async () => {
        for (const index of INDEXES) {
            try {
                // CONCURRENTLY requires being outside a transaction
                await sequelize.query(index.sql);
                console.log(`  ✅ Index ${index.name} created`);
            } catch (error) {
                if (error.message.includes('already exists') || error.message.includes('does not exist')) {
                    // Table or index doesn't exist yet — skip silently
                } else {
                    console.log(`  ⚠️ Index ${index.name}: ${error.message}`);
                }
            }
        }
    }
};
