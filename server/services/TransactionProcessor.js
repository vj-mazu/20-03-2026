const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const RunningBalanceCalculator = require('./RunningBalanceCalculator');
const OpeningBalanceService = require('./OpeningBalanceService');
const BalanceAuditTrail = require('../models/BalanceAuditTrail');
const Arrival = require('../models/Arrival');
const { Kunchinittu } = require('../models/Location');

class TransactionProcessor {
  /**
   * Process transactions chronologically for a Kunchinittu
   * @param {number} kunchinintuId - Kunchinittu ID
   * @param {string} fromDate - Start date (optional)
   * @param {string} toDate - End date (optional)
   * @param {Object} options - Processing options
   * @returns {Promise<Object>} Processing result
   */
  async processTransactionsChronologically(kunchinintuId, fromDate = null, toDate = null, options = {}) {
    try {
      // Validate inputs
      if (!kunchinintuId) {
        throw new Error('Kunchinittu ID is required');
      }

      // Build query conditions
      const where = {
        [Op.or]: [
          { toKunchinintuId: kunchinintuId },   // Inward
          { fromKunchinintuId: kunchinintuId }  // Outward
        ],
        status: 'approved'
      };

      // Add date filters
      if (fromDate || toDate) {
        where.date = {};
        if (fromDate) where.date[Op.gte] = fromDate;
        if (toDate) where.date[Op.lte] = toDate;
      }

      // Get transactions
      const transactions = await Arrival.findAll({
        where,
        include: [
          { model: Kunchinittu, as: 'toKunchinittu', attributes: ['name', 'code'] },
          { model: Kunchinittu, as: 'fromKunchinittu', attributes: ['name', 'code'] }
        ],
        order: [['date', 'ASC'], ['createdAt', 'ASC']]
      });

      // Get opening balance
      const openingBalanceDate = fromDate || (transactions.length > 0 ? transactions[0].date : new Date().toISOString().split('T')[0]);
      const openingBalance = await OpeningBalanceService.getOpeningBalance(kunchinintuId, openingBalanceDate);

      // Calculate running balances
      const transactionsWithBalance = await RunningBalanceCalculator.calculateRunningBalances(
        transactions,
        openingBalance,
        kunchinintuId
      );

      // Separate inward and outward transactions
      const inwardTransactions = transactionsWithBalance.filter(t => t.toKunchinintuId == kunchinintuId);
      const outwardTransactions = transactionsWithBalance.filter(t => t.fromKunchinintuId == kunchinintuId);

      // Calculate summary statistics
      const summary = this.calculateTransactionSummary(inwardTransactions, outwardTransactions, openingBalance);

      // Validate processing results
      const validation = await RunningBalanceCalculator.validateBalanceConsistency(transactionsWithBalance);

      // Detect anomalies if requested
      let anomalies = [];
      if (options.detectAnomalies) {
        anomalies = RunningBalanceCalculator.detectBalanceAnomalies(transactionsWithBalance);
      }

      return {
        success: true,
        kunchinintuId,
        dateRange: { fromDate, toDate },
        openingBalance,
        transactions: {
          all: transactionsWithBalance,
          inward: inwardTransactions,
          outward: outwardTransactions
        },
        summary,
        validation,
        anomalies,
        metadata: {
          totalTransactions: transactions.length,
          inwardCount: inwardTransactions.length,
          outwardCount: outwardTransactions.length,
          processedAt: new Date().toISOString()
        }
      };

    } catch (error) {
      console.error('Error processing transactions chronologically:', error);
      throw new Error(`Failed to process transactions: ${error.message}`);
    }
  }

  /**
   * Calculate summary statistics for transactions
   * @param {Array} inwardTransactions - Inward transactions
   * @param {Array} outwardTransactions - Outward transactions
   * @param {Object} openingBalance - Opening balance
   * @returns {Object} Summary statistics
   */
  calculateTransactionSummary(inwardTransactions, outwardTransactions, openingBalance) {
    // Calculate inward totals
    const inwardTotal = {
      bags: inwardTransactions.reduce((sum, t) => sum + (t.bags || 0), 0),
      netWeight: inwardTransactions.reduce((sum, t) => sum + parseFloat(t.netWeight || 0), 0)
    };

    // Calculate outward totals
    const outwardTotal = {
      bags: outwardTransactions.reduce((sum, t) => sum + (t.bags || 0), 0),
      netWeight: outwardTransactions.reduce((sum, t) => sum + parseFloat(t.netWeight || 0), 0)
    };

    // Calculate net movement
    const netMovement = {
      bags: inwardTotal.bags - outwardTotal.bags,
      netWeight: inwardTotal.netWeight - outwardTotal.netWeight
    };

    // Calculate closing balance
    const closingBalance = {
      bags: openingBalance.bags + netMovement.bags,
      netWeight: openingBalance.netWeight + netMovement.netWeight
    };

    // Round values for display
    return {
      opening: {
        bags: Math.round(openingBalance.bags),
        netWeight: Math.round(openingBalance.netWeight * 100) / 100
      },
      inward: {
        bags: inwardTotal.bags,
        netWeight: Math.round(inwardTotal.netWeight * 100) / 100,
        transactionCount: inwardTransactions.length
      },
      outward: {
        bags: outwardTotal.bags,
        netWeight: Math.round(outwardTotal.netWeight * 100) / 100,
        transactionCount: outwardTransactions.length
      },
      netMovement: {
        bags: netMovement.bags,
        netWeight: Math.round(netMovement.netWeight * 100) / 100
      },
      closing: {
        bags: Math.round(closingBalance.bags),
        netWeight: Math.round(closingBalance.netWeight * 100) / 100
      }
    };
  }

  /**
   * Process a single transaction and update running balance
   * @param {Object} transaction - Transaction object
   * @param {number} kunchinintuId - Kunchinittu ID
   * @param {Object} currentBalance - Current running balance
   * @param {number} userId - User ID performing the processing
   * @param {Object} dbTransaction - Database transaction
   * @returns {Promise<Object>} Processing result
   */
  async processSingleTransaction(transaction, kunchinintuId, currentBalance, userId, dbTransaction = null) {
    try {
      // Calculate transaction effect
      const transactionEffect = RunningBalanceCalculator.calculateTransactionEffect(transaction, kunchinintuId);
      
      // Calculate new balance
      const newBalance = {
        bags: currentBalance.bags + transactionEffect.bags,
        netWeight: currentBalance.netWeight + transactionEffect.netWeight
      };

      // Validate new balance
      if (newBalance.bags < 0 || newBalance.netWeight < 0) {
        console.warn(`Transaction ${transaction.id} would result in negative balance:`, {
          currentBalance,
          transactionEffect,
          newBalance
        });
      }

      // Log transaction processing in audit trail
      await BalanceAuditTrail.logBalanceChange({
        kunchinintuId,
        transactionId: transaction.id,
        actionType: 'transaction',
        previousBalance: currentBalance,
        newBalance,
        performedBy: userId,
        remarks: `Processed ${transaction.movementType} transaction`,
        metadata: {
          transactionDate: transaction.date,
          transactionSlNo: transaction.slNo,
          transactionEffect
        }
      }, dbTransaction);

      return {
        success: true,
        transactionId: transaction.id,
        previousBalance: currentBalance,
        transactionEffect,
        newBalance,
        isNegative: newBalance.bags < 0 || newBalance.netWeight < 0
      };

    } catch (error) {
      console.error('Error processing single transaction:', error);
      throw new Error(`Failed to process transaction ${transaction.id}: ${error.message}`);
    }
  }

  /**
   * Batch process multiple transactions
   * @param {Array} transactions - Array of transactions
   * @param {number} kunchinintuId - Kunchinittu ID
   * @param {Object} startingBalance - Starting balance
   * @param {number} userId - User ID
   * @param {Object} options - Processing options
   * @returns {Promise<Object>} Batch processing result
   */
  async batchProcessTransactions(transactions, kunchinintuId, startingBalance, userId, options = {}) {
    const dbTransaction = options.transaction || null;
    const results = [];
    const errors = [];
    let currentBalance = { ...startingBalance };

    try {
      for (const transaction of transactions) {
        try {
          const result = await this.processSingleTransaction(
            transaction,
            kunchinintuId,
            currentBalance,
            userId,
            dbTransaction
          );

          results.push(result);
          currentBalance = result.newBalance;

          // Stop processing if balance goes negative and strict mode is enabled
          if (options.strictMode && result.isNegative) {
            throw new Error(`Negative balance detected at transaction ${transaction.id}, stopping batch processing`);
          }

        } catch (error) {
          errors.push({
            transactionId: transaction.id,
            error: error.message
          });

          if (options.stopOnError) {
            break;
          }
        }
      }

      return {
        success: errors.length === 0,
        processedCount: results.length,
        errorCount: errors.length,
        startingBalance,
        finalBalance: currentBalance,
        results,
        errors
      };

    } catch (error) {
      console.error('Error in batch processing:', error);
      throw new Error(`Batch processing failed: ${error.message}`);
    }
  }

  /**
   * Reprocess transactions after a specific date
   * @param {number} kunchinintuId - Kunchinittu ID
   * @param {string} fromDate - Date to start reprocessing from
   * @param {number} userId - User ID
   * @param {Object} options - Reprocessing options
   * @returns {Promise<Object>} Reprocessing result
   */
  async reprocessTransactionsFromDate(kunchinintuId, fromDate, userId, options = {}) {
    const dbTransaction = options.transaction || await sequelize.transaction();
    let shouldCommit = !options.transaction;

    try {
      // Get opening balance for the from date
      const openingBalance = await OpeningBalanceService.getOpeningBalance(kunchinintuId, fromDate);

      // Get all transactions from the date onwards
      const transactions = await Arrival.findAll({
        where: {
          [Op.or]: [
            { toKunchinintuId: kunchinintuId },
            { fromKunchinintuId: kunchinintuId }
          ],
          status: 'approved',
          date: { [Op.gte]: fromDate }
        },
        order: [['date', 'ASC'], ['createdAt', 'ASC']],
        transaction: dbTransaction
      });

      // Batch process all transactions
      const batchResult = await this.batchProcessTransactions(
        transactions,
        kunchinintuId,
        openingBalance,
        userId,
        { ...options, transaction: dbTransaction }
      );

      // Log reprocessing completion
      await BalanceAuditTrail.logBalanceChange({
        kunchinintuId,
        actionType: 'recalculation',
        previousBalance: openingBalance,
        newBalance: batchResult.finalBalance,
        performedBy: userId,
        remarks: `Reprocessed ${batchResult.processedCount} transactions from ${fromDate}`,
        metadata: {
          fromDate,
          transactionCount: transactions.length,
          errorCount: batchResult.errorCount,
          reprocessingOptions: options
        }
      }, dbTransaction);

      if (shouldCommit) {
        await dbTransaction.commit();
      }

      return {
        success: batchResult.success,
        kunchinintuId,
        fromDate,
        openingBalance,
        finalBalance: batchResult.finalBalance,
        transactionCount: transactions.length,
        processedCount: batchResult.processedCount,
        errorCount: batchResult.errorCount,
        errors: batchResult.errors
      };

    } catch (error) {
      if (shouldCommit) {
        await dbTransaction.rollback();
      }
      console.error('Error reprocessing transactions:', error);
      throw new Error(`Failed to reprocess transactions: ${error.message}`);
    }
  }

  /**
   * Get transaction processing statistics
   * @param {number} kunchinintuId - Kunchinittu ID
   * @param {string} fromDate - Start date
   * @param {string} toDate - End date
   * @returns {Promise<Object>} Processing statistics
   */
  async getProcessingStatistics(kunchinintuId, fromDate, toDate) {
    try {
      const where = {
        [Op.or]: [
          { toKunchinintuId: kunchinintuId },
          { fromKunchinintuId: kunchinintuId }
        ],
        status: 'approved'
      };

      if (fromDate || toDate) {
        where.date = {};
        if (fromDate) where.date[Op.gte] = fromDate;
        if (toDate) where.date[Op.lte] = toDate;
      }

      // Get transaction counts by type
      const [inwardCount, outwardCount, totalTransactions] = await Promise.all([
        Arrival.count({
          where: { ...where, toKunchinintuId: kunchinintuId }
        }),
        Arrival.count({
          where: { ...where, fromKunchinintuId: kunchinintuId }
        }),
        Arrival.findAll({
          where,
          attributes: [
            'movementType',
            [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
            [sequelize.fn('SUM', sequelize.col('bags')), 'totalBags'],
            [sequelize.fn('SUM', sequelize.col('netWeight')), 'totalWeight']
          ],
          group: ['movementType']
        })
      ]);

      // Get audit trail statistics
      const auditStats = await BalanceAuditTrail.count({
        where: {
          kunchinintuId,
          performedAt: {
            [Op.between]: [fromDate || '1900-01-01', toDate || '2100-12-31']
          }
        },
        group: ['actionType']
      });

      return {
        kunchinintuId,
        dateRange: { fromDate, toDate },
        transactionCounts: {
          inward: inwardCount,
          outward: outwardCount,
          total: inwardCount + outwardCount
        },
        transactionsByType: totalTransactions.map(t => ({
          type: t.movementType,
          count: parseInt(t.getDataValue('count')),
          totalBags: parseInt(t.getDataValue('totalBags') || 0),
          totalWeight: parseFloat(t.getDataValue('totalWeight') || 0)
        })),
        auditTrailCounts: auditStats,
        generatedAt: new Date().toISOString()
      };

    } catch (error) {
      console.error('Error getting processing statistics:', error);
      throw new Error(`Failed to get processing statistics: ${error.message}`);
    }
  }

  /**
   * Validate transaction sequence integrity
   * @param {Array} transactions - Array of transactions
   * @returns {Object} Validation result
   */
  validateTransactionSequence(transactions) {
    const errors = [];
    const warnings = [];

    if (!Array.isArray(transactions) || transactions.length === 0) {
      return { isValid: true, errors, warnings };
    }

    // Check chronological order
    for (let i = 1; i < transactions.length; i++) {
      const prev = transactions[i - 1];
      const curr = transactions[i];
      
      const prevDate = new Date(prev.date);
      const currDate = new Date(curr.date);
      
      if (currDate < prevDate) {
        errors.push(`Transaction sequence error: ${curr.id} (${curr.date}) comes before ${prev.id} (${prev.date})`);
      }
      
      // Check for same date but wrong creation order
      if (currDate.getTime() === prevDate.getTime()) {
        const prevCreated = new Date(prev.createdAt);
        const currCreated = new Date(curr.createdAt);
        
        if (currCreated < prevCreated) {
          warnings.push(`Same-date transaction order issue: ${curr.id} created before ${prev.id} on ${curr.date}`);
        }
      }
    }

    // Check for duplicate transactions
    const transactionIds = transactions.map(t => t.id);
    const uniqueIds = [...new Set(transactionIds)];
    
    if (transactionIds.length !== uniqueIds.length) {
      errors.push('Duplicate transactions found in sequence');
    }

    // Check for missing required fields
    transactions.forEach(t => {
      if (!t.date) errors.push(`Transaction ${t.id} missing date`);
      if (!t.movementType) errors.push(`Transaction ${t.id} missing movement type`);
      if (t.bags === null || t.bags === undefined) warnings.push(`Transaction ${t.id} missing bags count`);
      if (!t.netWeight) warnings.push(`Transaction ${t.id} missing net weight`);
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      transactionCount: transactions.length,
      duplicateCount: transactionIds.length - uniqueIds.length
    };
  }
}

module.exports = new TransactionProcessor();