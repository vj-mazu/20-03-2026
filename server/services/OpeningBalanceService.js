const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const OpeningBalance = require('../models/OpeningBalance');
const BalanceAuditTrail = require('../models/BalanceAuditTrail');
const Arrival = require('../models/Arrival');
const { Kunchinittu } = require('../models/Location');

class OpeningBalanceService {
  /**
   * Get opening balance for a specific Kunchinittu on a given date
   * @param {number} kunchinintuId - The Kunchinittu ID
   * @param {string} date - Date in YYYY-MM-DD format
   * @returns {Promise<Object|null>} Opening balance object or null if not found
   */
  async getOpeningBalance(kunchinintuId, date) {
    try {
      // First try to find exact date match
      let openingBalance = await OpeningBalance.findByKunchinintuAndDate(kunchinintuId, date);
      
      if (openingBalance) {
        return {
          bags: openingBalance.openingBags,
          netWeight: parseFloat(openingBalance.openingNetWeight),
          date: openingBalance.date,
          isManual: openingBalance.isManual,
          source: 'exact_match'
        };
      }

      // If no exact match, find the latest opening balance *before* this date
      openingBalance = await OpeningBalance.findLatestByKunchinittu(kunchinintuId, date);
      
      if (openingBalance) {
        // Calculate balance from the latest opening balance date up to the day *before* the requested date
        const balanceMovement = await this.calculateBalanceFromDate(
          kunchinintuId, 
          openingBalance.date, 
          date
        );
        
        return {
          bags: openingBalance.openingBags + balanceMovement.bags,
          netWeight: parseFloat(openingBalance.openingNetWeight) + balanceMovement.netWeight,
          date: date,
          isManual: false,
          source: 'calculated_from_'
        };
      }

      // If no opening balance found, calculate from the beginning up to the day *before* the requested date
      const balanceMovement = await this.calculateBalanceFromDate(
        kunchinintuId, 
        null, // from the beginning of time
        date
      );
      
      return {
        bags: balanceMovement.bags,
        netWeight: balanceMovement.netWeight,
        date: date,
        isManual: false,
        source: 'calculated_from_start'
      };

    } catch (error) {
      console.error('Error getting opening balance:', error);
      throw new Error(`Failed to get opening balance: ${error.message}`);
    }
  }

  /**
   * Set opening balance for a specific Kunchinittu on a given date
   * @param {number} kunchinintuId - The Kunchinittu ID
   * @param {string} date - Date in YYYY-MM-DD format
   * @param {number} bags - Number of bags
   * @param {number} netWeight - Net weight in kg
   * @param {number} userId - User ID who is setting the balance
   * @param {string} remarks - Optional remarks
   * @param {Object} transaction - Optional database transaction
   * @returns {Promise<Object>} Created opening balance
   */
  async setOpeningBalance(kunchinintuId, date, bags, netWeight, userId, remarks = null, transaction = null) {
    try {
      // Validate inputs
      if (!kunchinintuId || !date || bags < 0 || netWeight < 0 || !userId) {
        throw new Error('Invalid input parameters for opening balance');
      }

      // Check if Kunchinittu exists
      const kunchinittu = await Kunchinittu.findByPk(kunchinintuId);
      if (!kunchinittu) {
        throw new Error('Kunchinittu not found');
      }

      const options = transaction ? { transaction } : {};

      // Get existing opening balance for audit trail
      const existingBalance = await OpeningBalance.findByKunchinintuAndDate(kunchinintuId, date);
      const previousBalance = existingBalance ? {
        bags: existingBalance.openingBags,
        netWeight: parseFloat(existingBalance.openingNetWeight)
      } : null;

      // Create or update opening balance
      const [openingBalance, created] = await OpeningBalance.upsert({
        kunchinintuId,
        date,
        openingBags: bags,
        openingNetWeight: netWeight,
        isManual: true,
        createdBy: userId,
        remarks
      }, options);

      const newBalance = { bags, netWeight };

      // Log audit trail
      await BalanceAuditTrail.logBalanceChange({
        kunchinintuId,
        actionType: 'opening_balance',
        previousBalance,
        newBalance,
        performedBy: userId,
        remarks: `${created ? 'Created' : 'Updated'} opening balance: ${remarks || ''}`,
        metadata: { date, isManual: true }
      }, transaction);

      return {
        id: openingBalance.id,
        kunchinintuId,
        date,
        bags,
        netWeight,
        isManual: true,
        created,
        remarks
      };

    } catch (error) {
      console.error('Error setting opening balance:', error);
      throw new Error(`Failed to set opening balance: ${error.message}`);
    }
  }

  /**
   * Calculate opening balance automatically based on previous transactions
   * @param {number} kunchinintuId - The Kunchinittu ID
   * @param {string} date - Date in YYYY-MM-DD format
   * @returns {Promise<Object>} Calculated opening balance
   */
  async calculateOpeningBalance(kunchinintuId, date) {
    try {
      // Find the latest opening balance before this date
      const latestOpeningBalance = await OpeningBalance.findLatestByKunchinittu(kunchinintuId, date);
      
      let startDate = null;
      let startBalance = { bags: 0, netWeight: 0 };

      if (latestOpeningBalance) {
        startDate = latestOpeningBalance.date;
        startBalance = {
          bags: latestOpeningBalance.openingBags,
          netWeight: parseFloat(latestOpeningBalance.openingNetWeight)
        };
      }

      // Calculate balance from start date to requested date
      return await this.calculateBalanceFromDate(kunchinintuId, startDate, date, startBalance);

    } catch (error) {
      console.error('Error calculating opening balance:', error);
      throw new Error(`Failed to calculate opening balance: ${error.message}`);
    }
  }

  /**
   * Calculate balance movement from a start date to an end date (exclusive of end date)
   * @param {number} kunchinintuId - The Kunchinittu ID
   * @param {string|null} startDate - Start date (inclusive, null means from beginning)
   * @param {string} endDate - End date (exclusive)
   * @returns {Promise<Object>} Calculated balance movement { bags, netWeight }
   */
  async calculateBalanceFromDate(kunchinintuId, startDate, endDate) {
    try {
      const where = {
        [Op.or]: [
          { toKunchinintuId: kunchinintuId },   // Inward
          { fromKunchinintuId: kunchinintuId }  // Outward
        ],
        status: 'approved',
        date: {
          [Op.lt]: endDate  // Transactions *before* the opening balance date
        }
      };

      if (startDate) {
        where.date[Op.gte] = startDate;  // Transactions on or after the last opening balance date
      }

      const transactions = await Arrival.findAll({
        where,
        attributes: ['toKunchinintuId', 'fromKunchinintuId', 'bags', 'netWeight'],
        order: [['date', 'ASC'], ['createdAt', 'ASC']]
      });

      let bags = 0;
      let netWeight = 0;

      for (const transaction of transactions) {
        if (transaction.toKunchinintuId == kunchinintuId) {
          // Inward transaction
          bags += transaction.bags || 0;
          netWeight += parseFloat(transaction.netWeight || 0);
        } else if (transaction.fromKunchinintuId == kunchinintuId) {
          // Outward transaction
          bags -= transaction.bags || 0;
          netWeight -= parseFloat(transaction.netWeight || 0);
        }
      }

      return { bags, netWeight };

    } catch (error) {
      console.error('Error calculating balance from date:', error);
      throw new Error(`Failed to calculate balance from date: ${error.message}`);
    }
  }

  /**
   * Validate opening balance data
   * @param {Object} data - Opening balance data
   * @returns {Object} Validation result
   */
  validateOpeningBalanceData(data) {
    const errors = [];

    if (!data.kunchinintuId || typeof data.kunchinintuId !== 'number') {
      errors.push('Valid Kunchinittu ID is required');
    }

    if (!data.date || !/^\d{4}-\d{2}-\d{2}$/.test(data.date)) {
      errors.push('Valid date in YYYY-MM-DD format is required');
    }

    if (data.bags === undefined || data.bags === null || data.bags < 0) {
      errors.push('Bags must be a non-negative number');
    }

    if (data.netWeight === undefined || data.netWeight === null || data.netWeight < 0) {
      errors.push('Net weight must be a non-negative number');
    }

    if (data.bags > 0 && data.netWeight <= 0) {
      errors.push('If bags are present, net weight must be greater than 0');
    }

    if (!data.userId || typeof data.userId !== 'number') {
      errors.push('Valid user ID is required');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Get opening balance history for a Kunchinittu
   * @param {number} kunchinintuId - The Kunchinittu ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Opening balance history
   */
  async getOpeningBalanceHistory(kunchinintuId, options = {}) {
    try {
      const where = { kunchinintuId };

      if (options.fromDate) {
        where.date = { [Op.gte]: options.fromDate };
      }

      if (options.toDate) {
        if (where.date) {
          where.date[Op.lte] = options.toDate;
        } else {
          where.date = { [Op.lte]: options.toDate };
        }
      }

      return await OpeningBalance.findAll({
        where,
        include: [
          { model: Kunchinittu, as: 'kunchinittu', attributes: ['name', 'code'] }
        ],
        order: [['date', 'DESC']],
        limit: options.limit || 50
      });

    } catch (error) {
      console.error('Error getting opening balance history:', error);
      throw new Error(`Failed to get opening balance history: ${error.message}`);
    }
  }
}

module.exports = new OpeningBalanceService();