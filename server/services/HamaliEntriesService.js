const { Op } = require('sequelize');
const HamaliEntry = require('../models/HamaliEntry');
const Arrival = require('../models/Arrival');
const User = require('../models/User');
const { Kunchinittu, Warehouse } = require('../models/Location');
const HamaliRatesService = require('./HamaliRatesService');
const Outturn = require('../models/Outturn');

class HamaliEntriesService {
  /**
   * Create hamali entry with rate snapshot
   * @param {Object} entryData - Entry data
   * @param {number} userId - User ID creating the entry
   * @param {string} userRole - User role (staff/manager/admin)
   * @returns {Promise<Object>} Created hamali entry
   */
  async createEntry(entryData, userId, userRole) {
    try {
      // Validate entry data
      const validation = this.validateEntry(entryData);
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }

      // Check if arrival exists
      const arrival = await Arrival.findByPk(entryData.arrivalId, {
        include: [
          { model: Kunchinittu, as: 'toKunchinittu', attributes: ['name', 'code'] },
          { model: Kunchinittu, as: 'fromKunchinittu', attributes: ['name', 'code'] },
          { model: Warehouse, as: 'toWarehouse', attributes: ['name', 'code'] },
          { model: Warehouse, as: 'fromWarehouse', attributes: ['name', 'code'] }
        ]
      });

      if (!arrival) {
        throw new Error('Arrival record not found');
      }

      // Check if hamali entry already exists for this arrival
      const existingEntry = await HamaliEntry.findOne({
        where: { arrivalId: entryData.arrivalId }
      });

      if (existingEntry) {
        throw new Error('Hamali entry already exists for this arrival');
      }

      // Get current rates (snapshot)
      const currentRates = await HamaliRatesService.getCurrentRates();

      // Calculate totals
      const calculations = this.calculateEntryTotals(entryData, arrival.bags, currentRates);

      // Auto-approve if created by manager or admin
      const isAutoApproved = userRole === 'manager' || userRole === 'admin';

      // Create entry
      const entry = await HamaliEntry.create({
        arrivalId: entryData.arrivalId,
        date: arrival.date,
        
        // Loading Hamali
        hasLoadingHamali: entryData.hasLoadingHamali || false,
        loadingBags: entryData.hasLoadingHamali ? arrival.bags : null,
        loadingRate: entryData.hasLoadingHamali ? currentRates.loadingRate : null,
        loadingTotal: calculations.loadingTotal || null,
        
        // Unloading Hamali
        hasUnloadingHamali: entryData.hasUnloadingHamali || false,
        unloadingType: entryData.unloadingType || null,
        unloadingBags: entryData.hasUnloadingHamali ? arrival.bags : null,
        unloadingRate: calculations.unloadingRate || null,
        unloadingTotal: calculations.unloadingTotal || null,
        
        // Loose Tumbiddu
        hasLooseTumbiddu: entryData.hasLooseTumbiddu || false,
        looseBags: entryData.looseBags || null,
        looseRate: entryData.hasLooseTumbiddu ? currentRates.looseTumbidduRate : null,
        looseTotal: calculations.looseTotal || null,
        
        // Total
        grandTotal: calculations.grandTotal,
        
        // Status and approval
        status: isAutoApproved ? 'approved' : 'pending',
        approvedBy: isAutoApproved ? userId : null,
        approvedAt: isAutoApproved ? new Date() : null,
        
        createdBy: userId
      });

      // Fetch complete entry with associations
      return await this.getEntryById(entry.id);
    } catch (error) {
      console.error('Error creating hamali entry:', error);
      throw new Error(`Failed to create hamali entry: ${error.message}`);
    }
  }

  /**
   * Calculate entry totals
   * @param {Object} entryData - Entry data
   * @param {number} arrivalBags - Bags from arrival record
   * @param {Object} rates - Current rates
   * @returns {Object} Calculated totals
   */
  calculateEntryTotals(entryData, arrivalBags, rates) {
    let loadingTotal = 0;
    let unloadingTotal = 0;
    let unloadingRate = null;
    let looseTotal = 0;

    if (entryData.hasLoadingHamali) {
      loadingTotal = arrivalBags * rates.loadingRate;
    }

    if (entryData.hasUnloadingHamali) {
      unloadingRate = entryData.unloadingType === 'sada' 
        ? rates.unloadingSadaRate 
        : rates.unloadingKnRate;
      unloadingTotal = arrivalBags * unloadingRate;
    }

    if (entryData.hasLooseTumbiddu && entryData.looseBags) {
      looseTotal = entryData.looseBags * rates.looseTumbidduRate;
    }

    const grandTotal = loadingTotal + unloadingTotal + looseTotal;

    return {
      loadingTotal,
      unloadingRate,
      unloadingTotal,
      looseTotal,
      grandTotal
    };
  }

  /**
   * Get hamali entry by ID
   * @param {number} id - Entry ID
   * @returns {Promise<Object>} Hamali entry
   */
  async getEntryById(id) {
    try {
      const entry = await HamaliEntry.findByPk(id, {
        include: [
          {
            model: Arrival,
            as: 'arrival',
            include: [
              { model: Kunchinittu, as: 'toKunchinittu', attributes: ['name', 'code'] },
              { model: Kunchinittu, as: 'fromKunchinittu', attributes: ['name', 'code'] },
              { model: Warehouse, as: 'toWarehouse', attributes: ['name', 'code'] },
              { model: Warehouse, as: 'fromWarehouse', attributes: ['name', 'code'] }
            ]
          },
          { model: User, as: 'creator', attributes: ['username', 'role'] }
        ]
      });

      if (!entry) {
        throw new Error('Hamali entry not found');
      }

      return this.formatEntry(entry);
    } catch (error) {
      console.error('Error getting hamali entry:', error);
      throw new Error(`Failed to get hamali entry: ${error.message}`);
    }
  }

  /**
   * Get hamali entry by arrival ID
   * @param {number} arrivalId - Arrival ID
   * @returns {Promise<Object|null>} Hamali entry or null
   */
  async getEntryByArrivalId(arrivalId) {
    try {
      const entry = await HamaliEntry.findOne({
        where: { arrivalId },
        include: [
          {
            model: Arrival,
            as: 'arrival',
            include: [
              { model: Kunchinittu, as: 'toKunchinittu', attributes: ['name', 'code'] },
              { model: Kunchinittu, as: 'fromKunchinittu', attributes: ['name', 'code'] },
              { model: Warehouse, as: 'toWarehouse', attributes: ['name', 'code'] },
              { model: Warehouse, as: 'fromWarehouse', attributes: ['name', 'code'] }
            ]
          },
          { model: User, as: 'creator', attributes: ['username', 'role'] }
        ]
      });

      return entry ? this.formatEntry(entry) : null;
    } catch (error) {
      console.error('Error getting hamali entry by arrival:', error);
      throw new Error(`Failed to get hamali entry: ${error.message}`);
    }
  }

  /**
   * Get hamali entries by multiple arrival IDs
   * @param {Array<number>} arrivalIds - Array of Arrival IDs
   * @returns {Promise<Object>} Map of arrivalId -> hamali entry
   */
  async getEntriesByArrivalIds(arrivalIds) {
    try {
      if (!arrivalIds || arrivalIds.length === 0) {
        return {};
      }

      const entries = await HamaliEntry.findAll({
        where: { 
          arrivalId: {
            [Op.in]: arrivalIds
          }
        },
        include: [
          { model: User, as: 'creator', attributes: ['username', 'role'] }
        ]
      });

      const result = {};
      entries.forEach(entry => {
        result[entry.arrivalId] = this.formatEntry(entry);
      });

      return result;
    } catch (error) {
      console.error('Error getting hamali entries by arrival IDs:', error);
      throw new Error(`Failed to get hamali entries: ${error.message}`);
    }
  }

  /**
   * Approve hamali entry
   * @param {number} id - Entry ID
   * @param {number} userId - User ID approving
   * @returns {Promise<Object>} Approved entry
   */
  async approveEntry(id, userId) {
    try {
      const entry = await HamaliEntry.findByPk(id);
      if (!entry) {
        throw new Error('Hamali entry not found');
      }

      if (entry.status === 'approved') {
        throw new Error('Hamali entry already approved');
      }

      await entry.update({
        status: 'approved',
        approvedBy: userId,
        approvedAt: new Date()
      });

      return await this.getEntryById(id);
    } catch (error) {
      console.error('Error approving hamali entry:', error);
      throw new Error(`Failed to approve hamali entry: ${error.message}`);
    }
  }

  /**
   * Get hamali entries with filters
   * @param {Object} filters - Query filters
   * @returns {Promise<Array>} Hamali entries
   */
  async getEntries(filters = {}) {
    try {
      const where = {};

      if (filters.date) {
        where.date = filters.date;
      }

      if (filters.fromDate && filters.toDate) {
        where.date = {
          [Op.between]: [filters.fromDate, filters.toDate]
        };
      } else if (filters.fromDate) {
        where.date = { [Op.gte]: filters.fromDate };
      } else if (filters.toDate) {
        where.date = { [Op.lte]: filters.toDate };
      }

      if (filters.createdBy) {
        where.createdBy = filters.createdBy;
      }

      if (filters.status) {
        where.status = filters.status;
      }

      const entries = await HamaliEntry.findAll({
        where,
        include: [
          {
            model: Arrival,
            as: 'arrival',
            include: [
              { model: Kunchinittu, as: 'toKunchinittu', attributes: ['name', 'code'] },
              { model: Kunchinittu, as: 'fromKunchinittu', attributes: ['name', 'code'] },
              { model: Warehouse, as: 'toWarehouse', attributes: ['name', 'code'] },
              { model: Warehouse, as: 'fromWarehouse', attributes: ['name', 'code'] }
            ]
          },
          { model: User, as: 'creator', attributes: ['username', 'role'] }
        ],
        order: [['date', 'DESC'], ['createdAt', 'DESC']],
        limit: filters.limit || 100
      });

      return entries.map(entry => this.formatEntry(entry));
    } catch (error) {
      console.error('Error getting hamali entries:', error);
      throw new Error(`Failed to get hamali entries: ${error.message}`);
    }
  }

  /**
   * Generate daily hamali summary
   * @param {string} date - Date in YYYY-MM-DD format
   * @returns {Promise<Object>} Daily summary
   */
  async getDailySummary(date) {
    try {
      console.log('Fetching hamali summary for date:', date);
      
      const entries = await HamaliEntry.findAll({
        where: { 
          date,
          status: 'approved' // Only approved entries in summary
        },
        include: [
          {
            model: Arrival,
            as: 'arrival',
            include: [
              { model: Kunchinittu, as: 'toKunchinittu', attributes: ['name', 'code'] },
              { model: Kunchinittu, as: 'fromKunchinittu', attributes: ['name', 'code'] },
              { model: Warehouse, as: 'toWarehouse', attributes: ['name', 'code'] },
              { model: Warehouse, as: 'fromWarehouse', attributes: ['name', 'code'] },
              { model: Warehouse, as: 'toWarehouseShift', attributes: ['name', 'code'] },
              { model: Outturn, as: 'outturn', attributes: ['code'] }
            ]
          }
        ],
        order: [['createdAt', 'ASC']]
      });

      console.log(`Found ${entries.length} approved hamali entries for date ${date}`);
      
      const loadingEntries = [];
      const unloadingEntries = [];
      const looseEntries = [];
      let grandTotal = 0;

      for (const entry of entries) {
        // Log arrival data for debugging
        if (entry.arrival) {
          console.log('Arrival data:', {
            movementType: entry.arrival.movementType,
            fromKN: entry.arrival.fromKunchinittu?.code,
            fromWH: entry.arrival.fromWarehouse?.name,
            toKN: entry.arrival.toKunchinittu?.code,
            toWH: entry.arrival.toWarehouse?.name
          });
        }
        
        const sourceDestination = this.getSourceDestination(entry.arrival);

        if (entry.hasLoadingHamali) {
          loadingEntries.push({
            amount: parseFloat(entry.loadingTotal),
            bags: entry.loadingBags,
            rate: parseFloat(entry.loadingRate),
            sourceDestination
          });
        }

        if (entry.hasUnloadingHamali) {
          unloadingEntries.push({
            amount: parseFloat(entry.unloadingTotal),
            bags: entry.unloadingBags,
            rate: parseFloat(entry.unloadingRate),
            type: entry.unloadingType.toUpperCase(),
            sourceDestination
          });
        }

        if (entry.hasLooseTumbiddu) {
          looseEntries.push({
            amount: parseFloat(entry.looseTotal),
            bags: entry.looseBags,
            rate: parseFloat(entry.looseRate),
            sourceDestination
          });
        }

        grandTotal += parseFloat(entry.grandTotal);
      }

      return {
        date,
        loadingEntries,
        unloadingEntries,
        looseEntries,
        grandTotal: parseFloat(grandTotal.toFixed(2)),
        totalEntries: entries.length
      };
    } catch (error) {
      console.error('Error generating daily summary:', error);
      throw new Error(`Failed to generate daily summary: ${error.message}`);
    }
  }

  /**
   * Update hamali entry
   * @param {number} id - Entry ID
   * @param {Object} updateData - Data to update
   * @param {number} userId - User ID updating the entry
   * @returns {Promise<Object>} Updated entry
   */
  async updateEntry(id, updateData, userId) {
    try {
      const entry = await HamaliEntry.findByPk(id);
      if (!entry) {
        throw new Error('Hamali entry not found');
      }

      // Get arrival for recalculation
      const arrival = await Arrival.findByPk(entry.arrivalId);
      
      // Get current rates (for recalculation if needed)
      const currentRates = {
        loadingRate: entry.loadingRate,
        unloadingSadaRate: entry.unloadingType === 'sada' ? entry.unloadingRate : 0,
        unloadingKnRate: entry.unloadingType === 'kn' ? entry.unloadingRate : 0,
        looseTumbidduRate: entry.looseRate
      };

      // Recalculate if needed
      const calculations = this.calculateEntryTotals(
        {
          hasLoadingHamali: updateData.hasLoadingHamali !== undefined ? updateData.hasLoadingHamali : entry.hasLoadingHamali,
          hasUnloadingHamali: updateData.hasUnloadingHamali !== undefined ? updateData.hasUnloadingHamali : entry.hasUnloadingHamali,
          unloadingType: updateData.unloadingType || entry.unloadingType,
          hasLooseTumbiddu: updateData.hasLooseTumbiddu !== undefined ? updateData.hasLooseTumbiddu : entry.hasLooseTumbiddu,
          looseBags: updateData.looseBags !== undefined ? updateData.looseBags : entry.looseBags
        },
        arrival.bags,
        currentRates
      );

      await entry.update({
        ...updateData,
        grandTotal: calculations.grandTotal
      });

      return await this.getEntryById(id);
    } catch (error) {
      console.error('Error updating hamali entry:', error);
      throw new Error(`Failed to update hamali entry: ${error.message}`);
    }
  }

  /**
   * Delete hamali entry
   * @param {number} id - Entry ID
   * @returns {Promise<boolean>} Success status
   */
  async deleteEntry(id) {
    try {
      const entry = await HamaliEntry.findByPk(id);
      if (!entry) {
        throw new Error('Hamali entry not found');
      }

      await entry.destroy();
      return true;
    } catch (error) {
      console.error('Error deleting hamali entry:', error);
      throw new Error(`Failed to delete hamali entry: ${error.message}`);
    }
  }

  /**
   * Validate entry data
   * @param {Object} data - Entry data
   * @returns {Object} Validation result
   */
  validateEntry(data) {
    const errors = [];

    if (!data.arrivalId || typeof data.arrivalId !== 'number') {
      errors.push('Valid arrival ID is required');
    }

    // At least one hamali type must be selected
    if (!data.hasLoadingHamali && !data.hasUnloadingHamali && !data.hasLooseTumbiddu) {
      errors.push('At least one hamali type must be selected');
    }

    // If unloading hamali is selected, type must be specified
    if (data.hasUnloadingHamali && !data.unloadingType) {
      errors.push('Unloading type (sada or kn) must be specified');
    }

    // Validate unloading type
    if (data.unloadingType && !['sada', 'kn'].includes(data.unloadingType)) {
      errors.push('Unloading type must be either "sada" or "kn"');
    }

    // If loose tumbiddu is selected, bags must be provided
    if (data.hasLooseTumbiddu && (!data.looseBags || data.looseBags <= 0)) {
      errors.push('Bags count is required for Loose Tumbiddu');
    }

    // Validate loose bags
    if (data.looseBags !== undefined && data.looseBags !== null) {
      if (typeof data.looseBags !== 'number' || data.looseBags < 0) {
        errors.push('Loose bags must be a non-negative number');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Format entry for response
   * @param {Object} entry - Database entry
   * @returns {Object} Formatted entry
   */
  formatEntry(entry) {
    return {
      id: entry.id,
      arrivalId: entry.arrivalId,
      date: entry.date,
      hasLoadingHamali: entry.hasLoadingHamali,
      loadingBags: entry.loadingBags,
      loadingRate: entry.loadingRate ? parseFloat(entry.loadingRate) : null,
      loadingTotal: entry.loadingTotal ? parseFloat(entry.loadingTotal) : null,
      hasUnloadingHamali: entry.hasUnloadingHamali,
      unloadingType: entry.unloadingType,
      unloadingBags: entry.unloadingBags,
      unloadingRate: entry.unloadingRate ? parseFloat(entry.unloadingRate) : null,
      unloadingTotal: entry.unloadingTotal ? parseFloat(entry.unloadingTotal) : null,
      hasLooseTumbiddu: entry.hasLooseTumbiddu,
      looseBags: entry.looseBags,
      looseRate: entry.looseRate ? parseFloat(entry.looseRate) : null,
      looseTotal: entry.looseTotal ? parseFloat(entry.looseTotal) : null,
      grandTotal: parseFloat(entry.grandTotal),
      status: entry.status,
      approvedBy: entry.approvedBy,
      approvedAt: entry.approvedAt,
      arrival: entry.arrival,
      creator: entry.creator,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt
    };
  }

  /**
   * Get source-destination string for display
   * @param {Object} arrival - Arrival record
   * @returns {string} Source-destination string
   */
  getSourceDestination(arrival) {
    if (!arrival) {
      return 'Unknown to Unknown';
    }

    let source = '';
    let destination = '';

    // Determine source and destination based on movement type
    if (arrival.movementType === 'purchase') {
      // Purchase: broker to kunchinittu - warehouse
      source = arrival.fromLocation || arrival.broker || 'Purchase';
      
      if (arrival.toKunchinittu) {
        destination = arrival.toKunchinittu.code;
        if (arrival.toWarehouse && arrival.toWarehouse.name) {
          destination += ' - ' + arrival.toWarehouse.name;
        }
      } else {
        destination = 'Unknown';
      }
      
    } else if (arrival.movementType === 'shifting') {
      // Normal Shifting: kunchinittu - warehouse to kunchinittu - warehouse
      if (arrival.fromKunchinittu) {
        source = arrival.fromKunchinittu.code;
        if (arrival.fromWarehouse && arrival.fromWarehouse.name) {
          source += ' - ' + arrival.fromWarehouse.name;
        }
      } else {
        source = 'Unknown';
      }
      
      if (arrival.toKunchinittu) {
        destination = arrival.toKunchinittu.code;
        // For shifting, use toWarehouseShift instead of toWarehouse
        if (arrival.toWarehouseShift && arrival.toWarehouseShift.name) {
          destination += ' - ' + arrival.toWarehouseShift.name;
        }
      } else {
        destination = 'Unknown';
      }
      
    } else if (arrival.movementType === 'production-shifting') {
      // Production Shifting: kunchinittu - warehouse to outturn number
      if (arrival.fromKunchinittu) {
        source = arrival.fromKunchinittu.code;
        if (arrival.fromWarehouse && arrival.fromWarehouse.name) {
          source += ' - ' + arrival.fromWarehouse.name;
        }
      } else {
        source = 'Unknown';
      }
      
      destination = arrival.outturn?.code || 'Unknown Outturn';
      
    } else if (arrival.movementType === 'for-production') {
      // For Production: broker to outturn number
      source = arrival.fromLocation || arrival.broker || 'Unknown';
      destination = arrival.outturn?.code || 'Unknown Outturn';
      
    } else if (arrival.movementType === 'loose') {
      // Loose: kunchinittu to kunchinittu
      source = arrival.fromKunchinittu?.code || 'Unknown';
      destination = arrival.toKunchinittu?.code || 'Unknown';
      
    } else {
      // Fallback for unknown types
      source = arrival.fromLocation || arrival.fromKunchinittu?.code || 'Unknown';
      destination = arrival.toKunchinittu?.code || arrival.outturn?.code || 'Unknown';
    }

    return `${source} to ${destination}`;
  }
}

module.exports = new HamaliEntriesService();
