const { Op } = require('sequelize');
const OpeningBalance = require('../models/OpeningBalance');
const { Kunchinittu } = require('../models/Location');
const User = require('../models/User');

class OpeningBalanceValidator {
  /**
   * Validate opening balance creation/update data
   * @param {Object} data - Opening balance data
   * @param {boolean} isUpdate - Whether this is an update operation
   * @returns {Promise<Object>} Validation result
   */
  async validateOpeningBalanceData(data, isUpdate = false) {
    const errors = [];
    const warnings = [];

    try {
      // Basic field validation
      const basicValidation = this.validateBasicFields(data);
      errors.push(...basicValidation.errors);
      warnings.push(...basicValidation.warnings);

      // Entity existence validation
      if (data.kunchinintuId) {
        const entityValidation = await this.validateEntityExistence(data);
        errors.push(...entityValidation.errors);
      }

      // Business rule validation
      if (errors.length === 0) {
        const businessValidation = await this.validateBusinessRules(data, isUpdate);
        errors.push(...businessValidation.errors);
        warnings.push(...businessValidation.warnings);
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings
      };

    } catch (error) {
      console.error('Error in opening balance validation:', error);
      return {
        isValid: false,
        errors: ['Validation process failed: ' + error.message],
        warnings: []
      };
    }
  }

  /**
   * Validate basic field requirements and formats
   * @param {Object} data - Opening balance data
   * @returns {Object} Validation result
   */
  validateBasicFields(data) {
    const errors = [];
    const warnings = [];

    // Kunchinittu ID validation
    if (!data.kunchinintuId) {
      errors.push('Kunchinittu ID is required');
    } else if (!Number.isInteger(data.kunchinintuId) || data.kunchinintuId <= 0) {
      errors.push('Kunchinittu ID must be a positive integer');
    }

    // Date validation
    if (!data.date) {
      errors.push('Date is required');
    } else {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(data.date)) {
        errors.push('Date must be in YYYY-MM-DD format');
      } else {
        const dateObj = new Date(data.date);
        if (isNaN(dateObj.getTime())) {
          errors.push('Date must be a valid date');
        } else {
          // Check if date is not in the future
          const today = new Date();
          today.setHours(23, 59, 59, 999); // End of today
          if (dateObj > today) {
            errors.push('Opening balance date cannot be in the future');
          }
        }
      }
    }

    // Bags validation
    if (data.bags === undefined || data.bags === null) {
      errors.push('Number of bags is required');
    } else if (!Number.isInteger(data.bags) || data.bags < 0) {
      errors.push('Number of bags must be a non-negative integer');
    } else if (data.bags > 100000) {
      warnings.push('Number of bags seems unusually high (>100,000)');
    }

    // Net weight validation
    if (data.netWeight === undefined || data.netWeight === null) {
      errors.push('Net weight is required');
    } else if (typeof data.netWeight !== 'number' || data.netWeight < 0) {
      errors.push('Net weight must be a non-negative number');
    } else if (data.netWeight > 10000000) {
      warnings.push('Net weight seems unusually high (>10,000,000 kg)');
    }

    // Logical consistency validation
    if (data.bags > 0 && data.netWeight <= 0) {
      errors.push('If bags are present, net weight must be greater than 0');
    }

    if (data.bags === 0 && data.netWeight > 0) {
      warnings.push('Net weight is specified but no bags are present');
    }

    // Weight per bag validation
    if (data.bags > 0 && data.netWeight > 0) {
      const weightPerBag = data.netWeight / data.bags;
      if (weightPerBag < 10) {
        warnings.push('Weight per bag seems low (<10 kg per bag)');
      } else if (weightPerBag > 200) {
        warnings.push('Weight per bag seems high (>200 kg per bag)');
      }
    }

    // User ID validation
    if (!data.userId) {
      errors.push('User ID is required');
    } else if (!Number.isInteger(data.userId) || data.userId <= 0) {
      errors.push('User ID must be a positive integer');
    }

    // Remarks validation
    if (data.remarks && typeof data.remarks !== 'string') {
      errors.push('Remarks must be a string');
    } else if (data.remarks && data.remarks.length > 1000) {
      errors.push('Remarks cannot exceed 1000 characters');
    }

    return { errors, warnings };
  }

  /**
   * Validate that referenced entities exist
   * @param {Object} data - Opening balance data
   * @returns {Promise<Object>} Validation result
   */
  async validateEntityExistence(data) {
    const errors = [];

    try {
      // Check if Kunchinittu exists and is active
      const kunchinittu = await Kunchinittu.findByPk(data.kunchinintuId);
      if (!kunchinittu) {
        errors.push('Kunchinittu not found');
      } else if (!kunchinittu.isActive) {
        errors.push('Cannot set opening balance for inactive Kunchinittu');
      }

      // Check if User exists and is active
      if (data.userId) {
        const user = await User.findByPk(data.userId);
        if (!user) {
          errors.push('User not found');
        } else if (!user.isActive) {
          errors.push('Cannot create opening balance with inactive user');
        }
      }

    } catch (error) {
      console.error('Error validating entity existence:', error);
      errors.push('Failed to validate entity existence');
    }

    return { errors };
  }

  /**
   * Validate business rules for opening balance
   * @param {Object} data - Opening balance data
   * @param {boolean} isUpdate - Whether this is an update operation
   * @returns {Promise<Object>} Validation result
   */
  async validateBusinessRules(data, isUpdate = false) {
    const errors = [];
    const warnings = [];

    try {
      // Check for duplicate opening balance on the same date
      if (!isUpdate) {
        const existingBalance = await OpeningBalance.findByKunchinintuAndDate(
          data.kunchinintuId, 
          data.date
        );
        
        if (existingBalance) {
          errors.push(`Opening balance already exists for ${data.date}. Use update instead.`);
        }
      }

      // Check for future opening balances that might be affected
      const futureBalances = await OpeningBalance.findAll({
        where: {
          kunchinintuId: data.kunchinintuId,
          date: { [Op.gt]: data.date }
        },
        order: [['date', 'ASC']],
        limit: 5
      });

      if (futureBalances.length > 0) {
        warnings.push(
          `This change may affect ${futureBalances.length} future opening balance(s). ` +
          `Next affected date: ${futureBalances[0].date}`
        );
      }

      // Validate against recent transactions
      const recentTransactionValidation = await this.validateAgainstRecentTransactions(data);
      warnings.push(...recentTransactionValidation.warnings);
      errors.push(...recentTransactionValidation.errors);

    } catch (error) {
      console.error('Error validating business rules:', error);
      errors.push('Failed to validate business rules');
    }

    return { errors, warnings };
  }

  /**
   * Validate opening balance against recent transactions
   * @param {Object} data - Opening balance data
   * @returns {Promise<Object>} Validation result
   */
  async validateAgainstRecentTransactions(data) {
    const errors = [];
    const warnings = [];

    try {
      // Import Arrival here to avoid circular dependency
      const Arrival = require('../models/Arrival');

      // Check for transactions on the same date
      const sameDataTransactions = await Arrival.findAll({
        where: {
          [Op.or]: [
            { toKunchinintuId: data.kunchinintuId },
            { fromKunchinintuId: data.kunchinintuId }
          ],
          date: data.date,
          status: 'approved'
        }
      });

      if (sameDataTransactions.length > 0) {
        warnings.push(
          `There are ${sameDataTransactions.length} approved transaction(s) on ${data.date}. ` +
          'Ensure the opening balance accounts for these transactions.'
        );
      }

      // Check for transactions in the previous 7 days
      const sevenDaysAgo = new Date(data.date);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const recentTransactions = await Arrival.findAll({
        where: {
          [Op.or]: [
            { toKunchinintuId: data.kunchinintuId },
            { fromKunchinintuId: data.kunchinintuId }
          ],
          date: {
            [Op.between]: [sevenDaysAgo.toISOString().split('T')[0], data.date]
          },
          status: 'approved'
        }
      });

      if (recentTransactions.length > 10) {
        warnings.push(
          `There are ${recentTransactions.length} transactions in the 7 days leading to ${data.date}. ` +
          'Please verify the opening balance calculation is accurate.'
        );
      }

    } catch (error) {
      console.error('Error validating against recent transactions:', error);
      warnings.push('Could not validate against recent transactions');
    }

    return { errors, warnings };
  }

  /**
   * Validate opening balance consistency across date range
   * @param {number} kunchinintuId - Kunchinittu ID
   * @param {string} fromDate - Start date
   * @param {string} toDate - End date
   * @returns {Promise<Object>} Validation result
   */
  async validateBalanceConsistency(kunchinintuId, fromDate, toDate) {
    const errors = [];
    const warnings = [];

    try {
      const openingBalances = await OpeningBalance.findAll({
        where: {
          kunchinintuId,
          date: {
            [Op.between]: [fromDate, toDate]
          }
        },
        order: [['date', 'ASC']]
      });

      // Check for gaps in opening balances
      if (openingBalances.length > 1) {
        for (let i = 1; i < openingBalances.length; i++) {
          const prevBalance = openingBalances[i - 1];
          const currBalance = openingBalances[i];
          
          const prevDate = new Date(prevBalance.date);
          const currDate = new Date(currBalance.date);
          const daysDiff = (currDate - prevDate) / (1000 * 60 * 60 * 24);
          
          if (daysDiff > 30) {
            warnings.push(
              `Gap of ${daysDiff} days between opening balances: ` +
              `${prevBalance.date} and ${currBalance.date}`
            );
          }
        }
      }

    } catch (error) {
      console.error('Error validating balance consistency:', error);
      errors.push('Failed to validate balance consistency');
    }

    return { errors, warnings };
  }

  /**
   * Validate opening balance deletion
   * @param {number} openingBalanceId - Opening balance ID
   * @returns {Promise<Object>} Validation result
   */
  async validateDeletion(openingBalanceId) {
    const errors = [];
    const warnings = [];

    try {
      const openingBalance = await OpeningBalance.findByPk(openingBalanceId);
      
      if (!openingBalance) {
        errors.push('Opening balance not found');
        return { errors, warnings };
      }

      // Check if there are future opening balances that depend on this one
      const futureBalances = await OpeningBalance.findAll({
        where: {
          kunchinintuId: openingBalance.kunchinintuId,
          date: { [Op.gt]: openingBalance.date }
        }
      });

      if (futureBalances.length > 0) {
        warnings.push(
          `Deleting this opening balance may affect ${futureBalances.length} future balance(s). ` +
          'Consider recalculating dependent balances after deletion.'
        );
      }

      // Check if this is the only opening balance for the Kunchinittu
      const totalBalances = await OpeningBalance.count({
        where: { kunchinintuId: openingBalance.kunchinintuId }
      });

      if (totalBalances === 1) {
        warnings.push(
          'This is the only opening balance for this Kunchinittu. ' +
          'Deletion will result in no opening balance history.'
        );
      }

    } catch (error) {
      console.error('Error validating deletion:', error);
      errors.push('Failed to validate deletion');
    }

    return { errors, warnings };
  }
}

module.exports = new OpeningBalanceValidator();