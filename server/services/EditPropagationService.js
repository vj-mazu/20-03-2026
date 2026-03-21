const { sequelize } = require('../config/database');
const { Op } = require('sequelize');
const Arrival = require('../models/Arrival');
const RiceProduction = require('../models/RiceProduction');
const Outturn = require('../models/Outturn');
const { Kunchinittu, Warehouse } = require('../models/Location');
const cacheService = require('./cacheService');

/**
 * Edit Propagation Service
 * 
 * This service handles the propagation of edits across the rice mill system.
 * When rice movements are edited, it ensures all related data is updated correctly:
 * - Paddy stock recalculation when rice productions change
 * - Hamali entry proportional updates
 * - Stock balance recalculation
 * - Cache invalidation
 */
class EditPropagationService {
  
  /**
   * Propagate rice production edit changes
   * @param {number} riceProductionId - ID of the rice production entry
   * @param {Object} oldData - Previous data before edit
   * @param {Object} newData - New data after edit
   * @param {number} userId - User who made the edit
   */
  static async propagateRiceProductionEdit(riceProductionId, oldData, newData, userId) {
    console.log(`🔄 Propagating rice production edit for ID: ${riceProductionId}`);
    
    try {
      await sequelize.transaction(async (transaction) => {
        // 1. Update paddy stock if paddyBagsDeducted changed
        if (oldData.paddyBagsDeducted !== newData.paddyBagsDeducted) {
          await this.updatePaddyStockForRiceProduction(
            newData.outturnId, 
            oldData.paddyBagsDeducted, 
            newData.paddyBagsDeducted,
            transaction
          );
        }

        // 2. Update hamali entries proportionally if bags changed
        if (oldData.bags !== newData.bags) {
          await this.updateHamaliEntriesProportionally(
            riceProductionId,
            'rice_production',
            oldData.bags,
            newData.bags,
            transaction
          );
        }

        // 3. Recalculate outturn yield if production quantities changed
        if (oldData.quantityQuintals !== newData.quantityQuintals || 
            oldData.paddyBagsDeducted !== newData.paddyBagsDeducted) {
          await this.recalculateOutturnYield(newData.outturnId, transaction);
        }

        // 4. Update rice stock balances
        await this.updateRiceStockBalances(
          newData.locationCode,
          newData.productType,
          newData.variety,
          transaction
        );

        // 5. Log the propagation for audit
        await this.logEditPropagation({
          entityType: 'rice_production',
          entityId: riceProductionId,
          oldData,
          newData,
          propagatedBy: userId,
          timestamp: new Date()
        }, transaction);
      });

      // 6. Invalidate related caches
      await this.invalidateRelatedCaches('rice_production', newData);

      console.log(`✅ Rice production edit propagation completed for ID: ${riceProductionId}`);
      
    } catch (error) {
      console.error(`❌ Error propagating rice production edit:`, error);
      throw new Error(`Failed to propagate rice production edit: ${error.message}`);
    }
  }

  /**
   * Propagate rice stock movement edit changes
   * @param {number} movementId - ID of the rice stock movement
   * @param {Object} oldData - Previous data before edit
   * @param {Object} newData - New data after edit
   * @param {number} userId - User who made the edit
   */
  static async propagateRiceStockMovementEdit(movementId, oldData, newData, userId) {
    console.log(`🔄 Propagating rice stock movement edit for ID: ${movementId}`);
    
    try {
      await sequelize.transaction(async (transaction) => {
        // 1. Update hamali entries proportionally if bags changed
        if (oldData.bags !== newData.bags) {
          await this.updateHamaliEntriesProportionally(
            movementId,
            'rice_stock_movement',
            oldData.bags,
            newData.bags,
            transaction
          );
        }

        // 2. Update stock balances for both old and new locations
        if (oldData.locationCode !== newData.locationCode) {
          // Update old location
          await this.updateRiceStockBalances(
            oldData.locationCode,
            oldData.productType,
            oldData.variety,
            transaction
          );
          
          // Update new location
          await this.updateRiceStockBalances(
            newData.locationCode,
            newData.productType,
            newData.variety,
            transaction
          );
        } else {
          // Same location, just update quantities
          await this.updateRiceStockBalances(
            newData.locationCode,
            newData.productType,
            newData.variety,
            transaction
          );
        }

        // 3. Handle palti operation changes
        if (newData.movementType === 'palti' || oldData.movementType === 'palti') {
          await this.handlePaltiEditPropagation(movementId, oldData, newData, transaction);
        }

        // 4. Log the propagation for audit
        await this.logEditPropagation({
          entityType: 'rice_stock_movement',
          entityId: movementId,
          oldData,
          newData,
          propagatedBy: userId,
          timestamp: new Date()
        }, transaction);
      });

      // 5. Invalidate related caches
      await this.invalidateRelatedCaches('rice_stock_movement', newData);

      console.log(`✅ Rice stock movement edit propagation completed for ID: ${movementId}`);
      
    } catch (error) {
      console.error(`❌ Error propagating rice stock movement edit:`, error);
      throw new Error(`Failed to propagate rice stock movement edit: ${error.message}`);
    }
  }

  /**
   * Update paddy stock when rice production changes
   */
  static async updatePaddyStockForRiceProduction(outturnId, oldPaddyBags, newPaddyBags, transaction) {
    console.log(`📊 Updating paddy stock for outturn ${outturnId}: ${oldPaddyBags} → ${newPaddyBags} bags`);
    
    // The paddy bags deducted is automatically handled by the rice production model
    // We just need to ensure the outturn's available paddy calculation is correct
    
    const outturn = await Outturn.findByPk(outturnId, { transaction });
    if (outturn) {
      // Recalculate total paddy available vs used
      const totalPaddyBags = await Arrival.sum('bags', {
        where: {
          outturnId: outturnId,
          movementType: { [Op.in]: ['production-shifting', 'purchase'] },
          status: 'approved',
          adminApprovedBy: { [Op.not]: null }
        },
        transaction
      }) || 0;

      const usedPaddyBags = await RiceProduction.sum('paddyBagsDeducted', {
        where: {
          outturnId: outturnId,
          status: { [Op.in]: ['pending', 'approved'] }
        },
        transaction
      }) || 0;

      const availablePaddyBags = totalPaddyBags - usedPaddyBags;
      
      console.log(`📊 Outturn ${outturnId} paddy summary: Total=${totalPaddyBags}, Used=${usedPaddyBags}, Available=${availablePaddyBags}`);
      
      // Update outturn metadata if needed
      await outturn.update({
        lastStockCalculation: new Date()
      }, { transaction });
    }
  }

  /**
   * Update hamali entries proportionally when quantities change
   */
  static async updateHamaliEntriesProportionally(entityId, entityType, oldBags, newBags, transaction) {
    if (oldBags === 0 || oldBags === newBags) return;
    
    console.log(`🔄 Updating hamali entries proportionally: ${oldBags} → ${newBags} bags`);
    
    const ratio = newBags / oldBags;
    
    // Update rice hamali entries
    const riceHamaliTable = entityType === 'rice_production' ? 'rice_hamali_entries' : 'rice_stock_hamali_entries';
    const entityIdField = entityType === 'rice_production' ? 'rice_production_id' : 'rice_movement_id';
    
    await sequelize.query(`
      UPDATE ${riceHamaliTable}
      SET 
        bags = ROUND(bags * :ratio),
        total_amount = ROUND(total_amount * :ratio, 2),
        updated_at = NOW()
      WHERE ${entityIdField} = :entityId
    `, {
      replacements: { ratio, entityId },
      type: sequelize.QueryTypes.UPDATE,
      transaction
    });
    
    console.log(`✅ Hamali entries updated with ratio: ${ratio}`);
  }

  /**
   * Recalculate outturn yield percentage
   */
  static async recalculateOutturnYield(outturnId, transaction) {
    console.log(`📊 Recalculating yield for outturn ${outturnId}`);
    
    try {
      // Get total paddy input
      const totalPaddyBags = await Arrival.sum('bags', {
        where: {
          outturnId: outturnId,
          movementType: { [Op.in]: ['production-shifting', 'purchase'] },
          status: 'approved',
          adminApprovedBy: { [Op.not]: null }
        },
        transaction
      }) || 0;

      // Get total rice output (in quintals)
      const totalRiceQuintals = await RiceProduction.sum('quantityQuintals', {
        where: {
          outturnId: outturnId,
          status: 'approved'
        },
        transaction
      }) || 0;

      // Calculate yield percentage: (rice quintals / paddy quintals) * 100
      // Assuming 1 bag = 26kg = 0.26 quintals
      const paddyQuintals = totalPaddyBags * 0.26;
      const yieldPercentage = paddyQuintals > 0 ? (totalRiceQuintals / paddyQuintals) * 100 : 0;

      // Update outturn with new yield
      await Outturn.update({
        yieldPercentage: Math.round(yieldPercentage * 100) / 100, // Round to 2 decimal places
        lastYieldCalculation: new Date()
      }, {
        where: { id: outturnId },
        transaction
      });

      console.log(`✅ Outturn ${outturnId} yield updated: ${yieldPercentage.toFixed(2)}%`);
      
    } catch (error) {
      console.error(`❌ Error recalculating outturn yield:`, error);
      // Don't throw - this is not critical for the main operation
    }
  }

  /**
   * Update rice stock balances for a location
   */
  static async updateRiceStockBalances(locationCode, productType, variety, transaction) {
    console.log(`📊 Updating rice stock balances for ${locationCode} - ${productType} - ${variety}`);
    
    // This is handled automatically by the database queries in the stock calculation endpoints
    // We just need to invalidate caches so fresh data is fetched
    
    // Mark the location for cache invalidation
    this._locationsToInvalidate = this._locationsToInvalidate || new Set();
    this._locationsToInvalidate.add(locationCode);
  }

  /**
   * Handle palti operation edit propagation
   */
  static async handlePaltiEditPropagation(movementId, oldData, newData, transaction) {
    console.log(`🔄 Handling palti edit propagation for movement ${movementId}`);
    
    // For palti operations, we need to update both source and target packaging balances
    if (oldData.sourcePackagingId !== newData.sourcePackagingId ||
        oldData.targetPackagingId !== newData.targetPackagingId ||
        oldData.bags !== newData.bags) {
      
      // Update stock balances for all affected packaging types
      const packagingIds = [
        oldData.sourcePackagingId,
        oldData.targetPackagingId,
        newData.sourcePackagingId,
        newData.targetPackagingId
      ].filter(Boolean);
      
      for (const packagingId of packagingIds) {
        // Mark for cache invalidation
        this._packagingToInvalidate = this._packagingToInvalidate || new Set();
        this._packagingToInvalidate.add(packagingId);
      }
    }
  }

  /**
   * Log edit propagation for audit trail
   */
  static async logEditPropagation(logData, transaction) {
    try {
      await sequelize.query(`
        INSERT INTO edit_propagation_logs (
          entity_type,
          entity_id,
          old_data,
          new_data,
          propagated_by,
          timestamp,
          created_at
        ) VALUES (
          :entityType,
          :entityId,
          :oldData,
          :newData,
          :propagatedBy,
          :timestamp,
          NOW()
        )
      `, {
        replacements: {
          entityType: logData.entityType,
          entityId: logData.entityId,
          oldData: JSON.stringify(logData.oldData),
          newData: JSON.stringify(logData.newData),
          propagatedBy: logData.propagatedBy,
          timestamp: logData.timestamp
        },
        type: sequelize.QueryTypes.INSERT,
        transaction
      });
    } catch (error) {
      // Log but don't fail the main operation
      console.warn('⚠️ Failed to log edit propagation:', error.message);
    }
  }

  /**
   * Invalidate related caches after edit propagation
   */
  static async invalidateRelatedCaches(entityType, data) {
    console.log(`🗑️ Invalidating caches for ${entityType} edit`);
    
    try {
      // Invalidate general caches
      await cacheService.delPattern('rice-stock:*');
      await cacheService.delPattern('rice-movements:*');
      await cacheService.delPattern('dashboard:*');
      await cacheService.delPattern('stock:*');
      
      // Invalidate location-specific caches
      if (this._locationsToInvalidate) {
        for (const locationCode of this._locationsToInvalidate) {
          await cacheService.delPattern(`location:${locationCode}:*`);
        }
        this._locationsToInvalidate.clear();
      }
      
      // Invalidate packaging-specific caches
      if (this._packagingToInvalidate) {
        for (const packagingId of this._packagingToInvalidate) {
          await cacheService.delPattern(`packaging:${packagingId}:*`);
        }
        this._packagingToInvalidate.clear();
      }
      
      // Invalidate outturn-specific caches if applicable
      if (data.outturnId) {
        await cacheService.delPattern(`outturn:${data.outturnId}:*`);
      }
      
      console.log(`✅ Cache invalidation completed`);
      
    } catch (error) {
      console.warn('⚠️ Cache invalidation failed (non-critical):', error.message);
    }
  }

  /**
   * Validate edit propagation prerequisites
   */
  static async validateEditPropagation(entityType, entityId, newData) {
    console.log(`🔍 Validating edit propagation for ${entityType} ID: ${entityId}`);
    
    const errors = [];
    
    try {
      if (entityType === 'rice_production') {
        // Validate outturn exists and is not cleared
        if (newData.outturnId) {
          const outturn = await Outturn.findByPk(newData.outturnId);
          if (!outturn) {
            errors.push('Outturn not found');
          } else if (outturn.isCleared) {
            errors.push('Cannot edit rice production for cleared outturn');
          }
        }
        
        // Validate sufficient paddy stock
        if (newData.paddyBagsDeducted && newData.outturnId) {
          const totalPaddyBags = await Arrival.sum('bags', {
            where: {
              outturnId: newData.outturnId,
              movementType: { [Op.in]: ['production-shifting', 'purchase'] },
              status: 'approved',
              adminApprovedBy: { [Op.not]: null }
            }
          }) || 0;

          const usedPaddyBags = await RiceProduction.sum('paddyBagsDeducted', {
            where: {
              outturnId: newData.outturnId,
              status: { [Op.in]: ['pending', 'approved'] },
              id: { [Op.ne]: entityId } // Exclude current production
            }
          }) || 0;

          const availablePaddyBags = totalPaddyBags - usedPaddyBags;
          
          if (newData.paddyBagsDeducted > availablePaddyBags) {
            errors.push(`Insufficient paddy bags. Available: ${availablePaddyBags}, Required: ${newData.paddyBagsDeducted}`);
          }
        }
      }
      
      if (entityType === 'rice_stock_movement') {
        // Validate location exists
        if (newData.locationCode) {
          // This would require a locations table query - implement as needed
        }
        
        // Validate packaging exists
        if (newData.packagingId) {
          // This would require a packagings table query - implement as needed
        }
      }
      
    } catch (error) {
      errors.push(`Validation error: ${error.message}`);
    }
    
    if (errors.length > 0) {
      throw new Error(`Edit propagation validation failed: ${errors.join(', ')}`);
    }
    
    console.log(`✅ Edit propagation validation passed`);
  }

  /**
   * Get edit propagation history for an entity
   */
  static async getEditPropagationHistory(entityType, entityId) {
    try {
      const history = await sequelize.query(`
        SELECT 
          id,
          entity_type,
          entity_id,
          old_data,
          new_data,
          propagated_by,
          timestamp,
          created_at
        FROM edit_propagation_logs
        WHERE entity_type = :entityType AND entity_id = :entityId
        ORDER BY created_at DESC
        LIMIT 50
      `, {
        replacements: { entityType, entityId },
        type: sequelize.QueryTypes.SELECT
      });
      
      return history.map(log => ({
        ...log,
        oldData: JSON.parse(log.old_data || '{}'),
        newData: JSON.parse(log.new_data || '{}')
      }));
      
    } catch (error) {
      console.error('Error fetching edit propagation history:', error);
      return [];
    }
  }
}

module.exports = EditPropagationService;