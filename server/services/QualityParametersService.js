const QualityParametersRepository = require('../repositories/QualityParametersRepository');
const ValidationService = require('../services/ValidationService');
const AuditService = require('../services/AuditService');
const SampleEntryRepository = require('../repositories/SampleEntryRepository');
const WorkflowEngine = require('../services/WorkflowEngine');

class QualityParametersService {
  /**
   * Reset all quality parameter fields (for recheck)
   * @param {number} sampleEntryId - Sample entry ID
   * @param {number} userId - User ID performing the reset
   * @returns {Promise<boolean>} Success status
   */
  async resetQualityParameters(sampleEntryId, userId) {
    try {
      const current = await QualityParametersRepository.findBySampleEntryId(sampleEntryId);
      if (!current) return false;

      const emptyFields = {
        moisture: 0,
        tempMoisture: 0,
        dryMoisture: 0,
        cutting1: 0,
        cutting2: 0,
        bend1: 0,
        bend2: 0,
        mix: '',
        mixS: '',
        mixL: '',
        kandu: '',
        oil: '',
        sk: '',
        grainsCount: 0,
        wbR: 0,
        wbBk: 0,
        wbT: 0,
        paddyWb: 0,
        reportedBy: '', // non-null constraint
        smellHas: false,
        smellType: '',
        smixEnabled: false,
        lmixEnabled: false,
        paddyWbEnabled: false,
        wbEnabled: false,
        dryMoistureEnabled: false,
        is100Grams: false,
        uploadFileUrl: null,
        // Raw fields
        moistureRaw: '',
        dryMoistureRaw: '',
        cutting1Raw: '',
        cutting2Raw: '',
        bend1Raw: '',
        bend2Raw: '',
        mixRaw: '',
        mixSRaw: '',
        mixLRaw: '',
        kanduRaw: '',
        oilRaw: '',
        skRaw: '',
        grainsCountRaw: '',
        wbRRaw: '',
        wbBkRaw: '',
        wbTRaw: '',
        paddyWbRaw: ''
      };

      const updated = await QualityParametersRepository.update(current.id, emptyFields);
      if (updated) {
        await AuditService.logUpdate(userId, 'quality_parameters', current.id, current, updated);
      }
      return !!updated;
    } catch (error) {
      console.error('Error resetting quality parameters:', error);
      throw error;
    }
  }

  /**
   * Add quality parameters to a sample entry
   * @param {Object} qualityData - Quality parameters data
   * @param {number} userId - User ID adding the parameters
   * @param {string} userRole - User role
   * @returns {Promise<Object>} Created quality parameters
   */
  async addQualityParameters(qualityData, userId, userRole) {
    try {
      // Validate input data
      const validation = ValidationService.validateQualityParameters(qualityData);
      if (!validation.valid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }

      // Auto-fill reportedBy with current user
      qualityData.reportedByUserId = userId;

      // Create quality parameters
      const quality = await QualityParametersRepository.create(qualityData);

      // Log audit trail
      await AuditService.logCreate(userId, 'quality_parameters', quality.id, quality);

      // Fetch the sample entry to check its status
      const sampleEntry = await SampleEntryRepository.findById(qualityData.sampleEntryId);
      const workflowStatus = String(sampleEntry?.workflowStatus || '').toUpperCase();
      const lotSelectionDecision = String(sampleEntry?.lotSelectionDecision || '').toUpperCase();

      // Transition workflow to LOT_SELECTION (from STAFF_ENTRY) once quality is added
      if (sampleEntry) {
        let transitioned = false;
        if (workflowStatus === 'STAFF_ENTRY') {
          const nextStatus = 'LOT_SELECTION';
          console.log(`[QUALITY] Transitioning fresh entry ${qualityData.sampleEntryId} from STAFF_ENTRY to ${nextStatus}`);
          await WorkflowEngine.transitionTo(
            qualityData.sampleEntryId,
            nextStatus,
            userId,
            userRole
          );
          transitioned = true;
        } else if (workflowStatus === 'QUALITY_CHECK') {
          // Auto-transition logic for rechecks
          try {
            const SampleEntryAuditLog = require('../models/SampleEntryAuditLog');
            const transitions = await SampleEntryAuditLog.findAll({
              where: {
                tableName: 'sample_entries',
                actionType: 'WORKFLOW_TRANSITION',
                recordId: qualityData.sampleEntryId
              },
              order: [['createdAt', 'DESC']],
              limit: 50,
              raw: true
            });

            const latestRecheck = transitions.find(log => log?.metadata?.recheckRequested === true);
             
            if (latestRecheck?.metadata?.recheckType === 'both') {
              console.log(`[QUALITY] Auto-transitioning 'BOTH' recheck lot ${sampleEntry.id} to COOKING_REPORT`);
              await WorkflowEngine.transitionTo(
                qualityData.sampleEntryId,
                'COOKING_REPORT',
                userId,
                userRole,
                { recheckType: 'both', qualityParametersId: quality.id, autoTransitionFromBoth: true }
              );
              transitioned = true;
            } else if (latestRecheck?.metadata?.recheckType === 'quality' || latestRecheck?.metadata?.recheckType === 'standard_recheck') {
              console.log(`[QUALITY] Auto-transitioning 'QUALITY' recheck lot ${qualityData.sampleEntryId} from QUALITY_CHECK to LOT_SELECTION`);
              await WorkflowEngine.transitionTo(
                qualityData.sampleEntryId,
                'LOT_SELECTION',
                userId,
                userRole
              );
              transitioned = true;
            }
          } catch (auditErr) {
            console.log(`[QUALITY] Skipping auto-transition: ${auditErr.message}`);
          }
        }

        if (!transitioned && lotSelectionDecision === 'FAIL' && ['QUALITY_CHECK', 'FINAL_REPORT', 'LOT_ALLOTMENT'].includes(workflowStatus)) {
          console.log(`[QUALITY] Transitioning resample entry ${qualityData.sampleEntryId} from ${workflowStatus} to LOT_SELECTION`);
          await WorkflowEngine.transitionTo(
            qualityData.sampleEntryId,
            'LOT_SELECTION',
            userId,
            userRole,
            { resampleQualitySaved: true }
          );
          transitioned = true;
        }

        if (!transitioned) {
          console.log(`[QUALITY] Skipping transition for ${qualityData.sampleEntryId}: current status is ${sampleEntry?.workflowStatus}`);
        }
      }

      return quality;
    } catch (error) {
      console.error('Error adding quality parameters:', error);
      throw error;
    }
  }

  /**
   * Get quality parameters by sample entry ID
   * @param {number} sampleEntryId - Sample entry ID
   * @returns {Promise<Object|null>} Quality parameters or null
   */
  async getQualityParametersBySampleEntry(sampleEntryId) {
    return await QualityParametersRepository.findBySampleEntryId(sampleEntryId);
  }

  /**
   * Update quality parameters
   * @param {number} id - Quality parameters ID
   * @param {Object} updates - Fields to update
   * @param {number} userId - User ID performing the update
   * @returns {Promise<Object|null>} Updated quality parameters or null
   */
  async updateQualityParameters(id, updates, userId, userRole) {
    try {
      // Get current quality parameters
      const current = await QualityParametersRepository.findBySampleEntryId(updates.sampleEntryId);
      if (!current) {
        throw new Error('Quality parameters not found');
      }

      // Validate updates
      const validation = ValidationService.validateQualityParameters(updates);
      if (!validation.valid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }

      // Update quality parameters
      const updated = await QualityParametersRepository.update(id, updates);

      // Log audit trail
      await AuditService.logUpdate(userId, 'quality_parameters', id, current, updated);

      // If upgrading from 100g to full quality (is100Grams=false), transition workflow
      if (userRole) {
        try {
          const sampleEntry = await SampleEntryRepository.findById(updates.sampleEntryId);
          const workflowStatus = String(sampleEntry?.workflowStatus || '').toUpperCase();
          const lotSelectionDecision = String(sampleEntry?.lotSelectionDecision || '').toUpperCase();
          if (
            sampleEntry
            && (
              workflowStatus === 'STAFF_ENTRY'
              || (lotSelectionDecision === 'FAIL' && ['QUALITY_CHECK', 'FINAL_REPORT', 'LOT_ALLOTMENT'].includes(workflowStatus))
            )
          ) {
            await WorkflowEngine.transitionTo(
              updates.sampleEntryId,
              'LOT_SELECTION',
              userId,
              userRole,
              lotSelectionDecision === 'FAIL' ? { resampleQualitySaved: true } : {}
            );
          }
        } catch (weErr) {
          console.log(`[QUALITY] WE transition failed: ${weErr.message}`);
        }
      }

      return updated;
    } catch (error) {
      console.error('Error updating quality parameters:', error);
      throw error;
    }
  }
}

module.exports = new QualityParametersService();
