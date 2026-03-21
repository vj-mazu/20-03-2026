const { Op } = require('sequelize');
const RunningBalanceCalculator = require('../services/RunningBalanceCalculator');
const OpeningBalanceService = require('../services/OpeningBalanceService');
const Arrival = require('../models/Arrival');
const OpeningBalance = require('../models/OpeningBalance');
const { Kunchinittu } = require('../models/Location');

class BalanceValidator {
  /**
   * Validate balance calculations for a Kunchinittu
   * @param {number} kunchinintuId - Kunchinittu ID
   * @param {string} fromDate - Start date for validation
   * @param {string} toDate - End date for validation
   * @param {Object} options - Validation options
   * @returns {Promise<Object>} Validation result
   */
  async validateBalanceCalculations(kunchinintuId, fromDate, toDate, options = {}) {
    try {
      const errors = [];
      const warnings = [];
      const details = [];

      // Validate Kunchinittu exists
      const kunchinittu = await Kunchinittu.findByPk(kunchinintuId);
      if (!kunchinittu) {
        errors.push('Kunchinittu not found');
        return { isValid: false, errors, warnings, details };
      }

      // Get opening balance
      const openingBalance = await OpeningBalanceService.getOpeningBalance(kunchinintuId, fromDate);
      
      // Validate opening balance
      const openingValidation = this.validateOpeningBalance(openingBalance);
      errors.push(...openingValidation.errors);
      warnings.push(...openingValidation.warnings);

      // Get transactions
      const transactions = await Arrival.findAll({
        where: {
          [Op.or]: [
            { toKunchinintuId: kunchinintuId },
            { fromKunchinintuId: kunchinintuId }
          ],
          status: 'approved',
          date: {
            [Op.between]: [fromDate, toDate]
          }
        },
        order: [['date', 'ASC'], ['createdAt', 'ASC']]
      });

      // Validate transaction data integrity
      const transactionValidation = this.validateTransactionData(transactions);
      errors.push(...transactionValidation.errors);
      warnings.push(...transactionValidation.warnings);

      // Calculate running balances
      const transactionsWithBalance = await RunningBalanceCalculator.calculateRunningBalances(
        transactions,
        openingBalance,
        kunchinintuId
      );

      // Validate running balance consistency
      const consistencyValidation = await RunningBalanceCalculator.validateBalanceConsistency(transactionsWithBalance);
      errors.push(...consistencyValidation.errors);
      warnings.push(...consistencyValidation.warnings);

      // Detect negative balances
      const negativeBalanceValidation = this.validateNegativeBalances(transactionsWithBalance);
      errors.push(...negativeBalanceValidation.errors);
      warnings.push(...negativeBalanceValidation.warnings);

      // Validate balance continuity
      const continuityValidation = await this.validateBalanceContinuity(kunchinintuId, fromDate, toDate);
      warnings.push(...continuityValidation.warnings);

      // Detect anomalies
      const anomalies = RunningBalanceCalculator.detectBalanceAnomalies(transactionsWithBalance);
      
      // Convert high severity anomalies to errors
      anomalies.forEach(anomaly => {
        if (anomaly.severity === 'HIGH') {
          errors.push(`${anomaly.type}: ${anomaly.description}`);
        } else {
          warnings.push(`${anomaly.type}: ${anomaly.description}`);
        }
      });

      // Calculate validation summary
      const summary = this.calculateValidationSummary(
        transactionsWithBalance,
        openingBalance,
        anomalies
      );

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        details,
        summary,
        anomalies,
        kunchinintuId,
        dateRange: { fromDate, toDate },
        validatedAt: new Date().toISOString()
      };

    } catch (error) {
      console.error('Error validating balance calculations:', error);
      return {
        isValid: false,
        errors: [`Validation failed: ${error.message}`],
        warnings: [],
        details: []
      };
    }
  }

  /**
   * Validate opening balance data
   * @param {Object} openingBalance - Opening balance object
   * @returns {Object} Validation result
   */
  validateOpeningBalance(openingBalance) {
    const errors = [];
    const warnings = [];

    if (!openingBalance) {
      errors.push('Opening balance not found or could not be calculated');
      return { errors, warnings };
    }

    // Check for negative opening balance
    if (openingBalance.bags < 0 || openingBalance.netWeight < 0) {
      errors.push(`Negative opening balance: ${openingBalance.bags} bags, ${openingBalance.netWeight} kg`);
    }

    // Check for inconsistent opening balance
    if (openingBalance.bags > 0 && openingBalance.netWeight <= 0) {
      warnings.push('Opening balance has bags but no weight');
    }

    if (openingBalance.bags === 0 && openingBalance.netWeight > 0) {
      warnings.push('Opening balance has weight but no bags');
    }

    // Check for unrealistic weight per bag
    if (openingBalance.bags > 0 && openingBalance.netWeight > 0) {
      const weightPerBag = openingBalance.netWeight / openingBalance.bags;
      if (weightPerBag < 5) {
        warnings.push(`Very low weight per bag in opening balance: ${weightPerBag.toFixed(2)} kg/bag`);
      } else if (weightPerBag > 300) {
        warnings.push(`Very high weight per bag in opening balance: ${weightPerBag.toFixed(2)} kg/bag`);
      }
    }

    return { errors, warnings };
  }

  /**
   * Validate transaction data integrity
   * @param {Array} transactions - Array of transactions
   * @returns {Object} Validation result
   */
  validateTransactionData(transactions) {
    const errors = [];
    const warnings = [];

    if (!Array.isArray(transactions)) {
      errors.push('Transactions must be an array');
      return { errors, warnings };
    }

    transactions.forEach((transaction, index) => {
      const prefix = `Transaction ${transaction.id || index}`;

      // Check required fields
      if (!transaction.date) {
        errors.push(`${prefix}: M