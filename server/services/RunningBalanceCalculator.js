const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const OpeningBalanceService = require('./OpeningBalanceService');
const BalanceAuditTrail = require('../models/BalanceAuditTrail');
const Arrival = require('../models/Arrival');
const { Kunchinittu } = require('../models/Location');

class RunningBalanceCalculator {
    /**
     * Calculate running balances for a list of transactions
     * @param {Array} transactions - Array of transaction objects
     * @param {Object} openingBalance - Opening balance { bags, netWeight }
     * @param {number} kunchinintuId - Kunchinittu ID for the transactions
     * @returns {Promise<Array>} Transactions with running balances
     */
    async calculateRunningBalances(transactions, openingBalance, kunchinintuId) {
        try {
            if (!Array.isArray(transactions)) {
                throw new Error('Transactions must be an array');
            }

            if (!openingBalance || typeof openingBalance !== 'object') {
                throw new Error('Opening balance is required and must be an object');
            }

            if (!kunchinintuId) {
                throw new Error('Kunchinittu ID is required');
            }

            // Sort transactions chronologically
            const sortedTransactions = [...transactions].sort((a, b) => {
                const dateCompare = new Date(a.date) - new Date(b.date);
                if (dateCompare !== 0) return dateCompare;

                // If same date, sort by creation time
                return new Date(a.createdAt) - new Date(b.createdAt);
            });

            let runningBalance = {
                bags: openingBalance.bags || 0,
                netWeight: openingBalance.netWeight || 0
            };

            const transactionsWithBalance = [];

            for (const transaction of sortedTransactions) {
                // Calculate transaction effect
                const transactionEffect = this.calculateTransactionEffect(transaction, kunchinintuId);

                // Update running balance
                const previousBalance = { ...runningBalance };
                runningBalance.bags += transactionEffect.bags;
                runningBalance.netWeight += transactionEffect.netWeight;

                // Validate balance doesn't go negative (with small tolerance for floating point)
                if (runningBalance.bags < -0.001 || runningBalance.netWeight < -0.001) {
                    console.warn(`Negative balance detected for transaction ${transaction.id}: `, {
                        transactionId: transaction.id,
                        date: transaction.date,
                        previousBalance,
                        transactionEffect,
                        newBalance: runningBalance
                    });
                }

                // Add balance information to transaction
                const enhancedTransaction = {
                    ...transaction.toJSON ? transaction.toJSON() : transaction,
                    runningBalance: {
                        bags: Math.round(runningBalance.bags),
                        netWeight: Math.round(runningBalance.netWeight * 100) / 100 // Round to 2 decimal places
                    },
                    transactionEffect: {
                        bags: transactionEffect.bags,
                        netWeight: Math.round(transactionEffect.netWeight * 100) / 100
                    },
                    previousBalance: {
                        bags: Math.round(previousBalance.bags),
                        netWeight: Math.round(previousBalance.netWeight * 100) / 100
                    }
                };

                transactionsWithBalance.push(enhancedTransaction);
            }

            return transactionsWithBalance;

        } catch (error) {
            console.error('Error calculating running balances:', error);
            throw new Error(`Failed to calculate running balances: ${error.message}`);
        }
    }

    /**
     * Calculate the effect of a single transaction on balance
     * @param {Object} transaction - Transaction object
     * @param {number} kunchinintuId - Kunchinittu ID
     * @returns {Object} Transaction effect { bags, netWeight }
     */
    calculateTransactionEffect(transaction, kunchinintuId) {
        const bags = transaction.bags || 0;
        const netWeight = parseFloat(transaction.netWeight || 0);

        // Inward transaction (coming to this Kunchinittu)
        if (transaction.toKunchinintuId == kunchinintuId) {
            return {
                bags: bags,
                netWeight: netWeight
            };
        }

        // Outward transaction (going from this Kunchinittu)
        if (transaction.fromKunchinintuId == kunchinintuId) {
            return {
                bags: -bags,
                netWeight: -netWeight
            };
        }

        // Transaction doesn't affect this Kunchinittu
        return {
            bags: 0,
            netWeight: 0
        };
    }

    /**
     * Validate balance consistency across transactions
     * @param {Array} transactionsWithBalance - Transactions with running balances
     * @param {Object} expectedFinalBalance - Expected final balance (optional)
     * @returns {Promise<Object>} Validation result
     */
    async validateBalanceConsistency(transactionsWithBalance, expectedFinalBalance = null) {
        try {
            const errors = [];
            const warnings = [];

            if (!Array.isArray(transactionsWithBalance) || transactionsWithBalance.length === 0) {
                return { isValid: true, errors, warnings };
            }

            // Check for negative balances
            const negativeBalances = transactionsWithBalance.filter(t =>
                t.runningBalance.bags < 0 || t.runningBalance.netWeight < 0
            );

            if (negativeBalances.length > 0) {
                errors.push(`Found ${negativeBalances.length} transaction(s) with negative running balance`);
                negativeBalances.forEach(t => {
                    warnings.push(
                        `Transaction ${t.id} on ${t.date}: Balance became negative ` +
                        `(${t.runningBalance.bags} bags, ${t.runningBalance.netWeight} kg)`
                    );
                });
            }

            // Check for unrealistic balance jumps
            for (let i = 1; i < transactionsWithBalance.length; i++) {
                const prev = transactionsWithBalance[i - 1];
                const curr = transactionsWithBalance[i];

                const balanceJump = Math.abs(curr.runningBalance.netWeight - prev.runningBalance.netWeight);
                const transactionAmount = Math.abs(curr.transactionEffect.netWeight);

                // If balance jump is much larger than transaction amount, flag as suspicious
                if (balanceJump > transactionAmount * 2 && transactionAmount > 0) {
                    warnings.push(
                        `Suspicious balance jump between transactions ${prev.id} and ${curr.id}: ` +
                        `${balanceJump} kg change for ${transactionAmount} kg transaction`
                    );
                }
            }

            // Validate against expected final balance if provided
            if (expectedFinalBalance) {
                const finalTransaction = transactionsWithBalance[transactionsWithBalance.length - 1];
                const actualFinal = finalTransaction.runningBalance;

                const bagsDiff = Math.abs(actualFinal.bags - expectedFinalBalance.bags);
                const weightDiff = Math.abs(actualFinal.netWeight - expectedFinalBalance.netWeight);

                if (bagsDiff > 0 || weightDiff > 0.01) {
                    errors.push(
                        `Final balance mismatch: Expected ${expectedFinalBalance.bags} bags, ` +
                        `${expectedFinalBalance.netWeight} kg; Got ${actualFinal.bags} bags, ${actualFinal.netWeight} kg`
                    );
                }
            }

            // Check for duplicate transaction effects
            const transactionIds = transactionsWithBalance.map(t => t.id);
            const uniqueIds = [...new Set(transactionIds)];

            if (transactionIds.length !== uniqueIds.length) {
                errors.push('Duplicate transactions detected in balance calculation');
            }

            return {
                isValid: errors.length === 0,
                errors,
                warnings,
                summary: {
                    totalTransactions: transactionsWithBalance.length,
                    negativeBalanceCount: negativeBalances.length,
                    finalBalance: transactionsWithBalance.length > 0 ?
                        transactionsWithBalance[transactionsWithBalance.length - 1].runningBalance : null
                }
            };

        } catch (error) {
            console.error('Error validating balance consistency:', error);
            return {
                isValid: false,
                errors: [`Validation failed: ${error.message}`],
                warnings: []
            };
        }
    }

    /**
     * Recalculate balances from a specific date
     * @param {number} kunchinintuId - Kunchinittu ID
     * @param {string} fromDate - Date to start recalculation from
     * @param {number} userId - User ID performing the recalculation
     * @param {Object} transaction - Optional database transaction
     * @returns {Promise<Object>} Recalculation result
     */
    async recalculateFromDate(kunchinintuId, fromDate, userId, transaction = null) {
        try {
            if (!kunchinintuId || !fromDate || !userId) {
                throw new Error('Kunchinittu ID, from date, and user ID are required');
            }

            // Validate Kunchinittu exists
            const kunchinittu = await Kunchinittu.findByPk(kunchinintuId);
            if (!kunchinittu) {
                throw new Error('Kunchinittu not found');
            }

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
                order: [['date', 'ASC'], ['createdAt', 'ASC']]
            });

            // Calculate running balances
            const transactionsWithBalance = await this.calculateRunningBalances(
                transactions,
                openingBalance,
                kunchinintuId
            );

            // Validate consistency
            const validation = await this.validateBalanceConsistency(transactionsWithBalance);

            // Log recalculation in audit trail
            const finalBalance = transactionsWithBalance.length > 0 ?
                transactionsWithBalance[transactionsWithBalance.length - 1].runningBalance :
                openingBalance;

            await BalanceAuditTrail.logBalanceChange({
                kunchinintuId,
                actionType: 'recalculation',
                previousBalance: null, // We don't track previous state for recalculations
                newBalance: finalBalance,
                performedBy: userId,
                remarks: `Recalculated balances from ${fromDate}`,
                metadata: {
                    fromDate,
                    transactionCount: transactions.length,
                    validationResult: validation.isValid,
                    errors: validation.errors,
                    warnings: validation.warnings
                }
            }, transaction);

            return {
                success: true,
                kunchinintuId,
                fromDate,
                transactionCount: transactions.length,
                openingBalance,
                finalBalance,
                validation,
                transactionsWithBalance: transactionsWithBalance.slice(0, 10) // Return first 10 for preview
            };

        } catch (error) {
            console.error('Error recalculating balances:', error);
            throw new Error(`Failed to recalculate balances: ${error.message}`);
        }
    }

    /**
     * Get balance summary for a Kunchinittu over a date range
     * @param {number} kunchinintuId - Kunchinittu ID
     * @param {string} fromDate - Start date
     * @param {string} toDate - End date
     * @returns {Promise<Object>} Balance summary
     */
    async getBalanceSummary(kunchinintuId, fromDate, toDate) {
        try {
            // Get opening balance
            const openingBalance = await OpeningBalanceService.getOpeningBalance(kunchinintuId, fromDate);

            // Get transactions in date range
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

            // Separate inward and outward transactions
            const inwardTransactions = transactions.filter(t => t.toKunchinintuId == kunchinintuId);
            const outwardTransactions = transactions.filter(t => t.fromKunchinintuId == kunchinintuId);

            // Calculate totals
            const inwardTotal = {
                bags: inwardTransactions.reduce((sum, t) => sum + (t.bags || 0), 0),
                netWeight: inwardTransactions.reduce((sum, t) => sum + parseFloat(t.netWeight || 0), 0)
            };

            const outwardTotal = {
                bags: outwardTransactions.reduce((sum, t) => sum + (t.bags || 0), 0),
                netWeight: outwardTransactions.reduce((sum, t) => sum + parseFloat(t.netWeight || 0), 0)
            };

            // Calculate closing balance
            const closingBalance = {
                bags: openingBalance.bags + inwardTotal.bags - outwardTotal.bags,
                netWeight: openingBalance.netWeight + inwardTotal.netWeight - outwardTotal.netWeight
            };

            return {
                kunchinintuId,
                dateRange: { fromDate, toDate },
                openingBalance: {
                    bags: openingBalance.bags,
                    netWeight: Math.round(openingBalance.netWeight * 100) / 100
                },
                inwardTotal: {
                    bags: inwardTotal.bags,
                    netWeight: Math.round(inwardTotal.netWeight * 100) / 100,
                    transactionCount: inwardTransactions.length
                },
                outwardTotal: {
                    bags: outwardTotal.bags,
                    netWeight: Math.round(outwardTotal.netWeight * 100) / 100,
                    transactionCount: outwardTransactions.length
                },
                closingBalance: {
                    bags: closingBalance.bags,
                    netWeight: Math.round(closingBalance.netWeight * 100) / 100
                },
                netMovement: {
                    bags: inwardTotal.bags - outwardTotal.bags,
                    netWeight: Math.round((inwardTotal.netWeight - outwardTotal.netWeight) * 100) / 100
                }
            };

        } catch (error) {
            console.error('Error getting balance summary:', error);
            throw new Error(`Failed to get balance summary: ${error.message}`);
        }
    }

    /**
     * Detect balance anomalies in transactions
     * @param {Array} transactionsWithBalance - Transactions with running balances
     * @returns {Array} Array of detected anomalies
     */
    detectBalanceAnomalies(transactionsWithBalance) {
        const anomalies = [];

        if (!Array.isArray(transactionsWithBalance) || transactionsWithBalance.length === 0) {
            return anomalies;
        }

        for (let i = 0; i < transactionsWithBalance.length; i++) {
            const transaction = transactionsWithBalance[i];

            // Check for negative balances
            if (transaction.runningBalance.bags < 0 || transaction.runningBalance.netWeight < 0) {
                anomalies.push({
                    type: 'NEGATIVE_BALANCE',
                    transactionId: transaction.id,
                    date: transaction.date,
                    description: `Negative balance: ${transaction.runningBalance.bags} bags, ${transaction.runningBalance.netWeight} kg`,
                    severity: 'HIGH'
                });
            }

            // Check for zero bags with positive weight
            if (transaction.runningBalance.bags === 0 && transaction.runningBalance.netWeight > 0) {
                anomalies.push({
                    type: 'ZERO_BAGS_POSITIVE_WEIGHT',
                    transactionId: transaction.id,
                    date: transaction.date,
                    description: `Zero bags but positive weight: ${transaction.runningBalance.netWeight} kg`,
                    severity: 'MEDIUM'
                });
            }

            // Check for unrealistic weight per bag
            if (transaction.runningBalance.bags > 0 && transaction.runningBalance.netWeight > 0) {
                const weightPerBag = transaction.runningBalance.netWeight / transaction.runningBalance.bags;
                if (weightPerBag < 5 || weightPerBag > 300) {
                    anomalies.push({
                        type: 'UNREALISTIC_WEIGHT_PER_BAG',
                        transactionId: transaction.id,
                        date: transaction.date,
                        description: `Unrealistic weight per bag: ${weightPerBag.toFixed(2)} kg/bag`,
                        severity: 'MEDIUM'
                    });
                }
            }

            // Check for large balance changes
            if (i > 0) {
                const prevTransaction = transactionsWithBalance[i - 1];
                const balanceChange = Math.abs(
                    transaction.runningBalance.netWeight - prevTransaction.runningBalance.netWeight
                );

                if (balanceChange > 50000) { // More than 50 tons change
                    anomalies.push({
                        type: 'LARGE_BALANCE_CHANGE',
                        transactionId: transaction.id,
                        date: transaction.date,
                        description: `Large balance change: ${balanceChange.toFixed(2)} kg`,
                        severity: 'LOW'
                    });
                }
            }
        }

        return anomalies;
    }
}

module.exports = new RunningBalanceCalculator();