const Outturn = require('../models/Outturn');
const Arrival = require('../models/Arrival');
const ByProduct = require('../models/ByProduct');
const { Op } = require('sequelize');

class YieldCalculationService {
  /**
   * Calculate and update yield percentage for a specific outturn
   * Formula: YY = (Total By-Products / Total Net Weight) × 100
   * @param {number} outturnId - The outturn ID
   * @returns {Promise<number>} The calculated yield percentage
   */
  static async calculateAndUpdateYield(outturnId) {
    try {
      console.log(`📊 Calculating yield percentage for outturn ID: ${outturnId}`);

      // Get total net weight from production-shifting arrivals for this outturn
      const totalNetWeight = await Arrival.sum('netWeight', {
        where: {
          outturnId: outturnId,
          movementType: { [Op.in]: ['production-shifting', 'purchase'] }
        }
      }) || 0;

      console.log(`📦 Total Net Weight: ${totalNetWeight} kg`);

      // Get total by-products for this outturn
      const byProducts = await ByProduct.findAll({
        where: { outturnId: outturnId }
      });

      // Sum all by-product quantities
      const totalByProducts = byProducts.reduce((sum, bp) => {
        return sum + 
          parseFloat(bp.rice || 0) +
          parseFloat(bp.rejectionRice || 0) +
          parseFloat(bp.rjRice1 || 0) +
          parseFloat(bp.rjRice2 || 0) +
          parseFloat(bp.broken || 0) +
          parseFloat(bp.rejectionBroken || 0) +
          parseFloat(bp.zeroBroken || 0) +
          parseFloat(bp.faram || 0) +
          parseFloat(bp.bran || 0) +
          parseFloat(bp.unpolished || 0);
      }, 0);

      console.log(`🌾 Total By-Products: ${totalByProducts} quintals`);

      // Calculate yield percentage
      // CORRECT FORMULA: YY = (Rice Output / Paddy Input) × 100
      // Example: 12 tons rice from 30 tons paddy = (12 ÷ 30) × 100 = 40%
      // totalByProducts is in quintals (rice output)
      // totalNetWeight is stored in a unit where 1000 = 1 quintal (paddy input)
      // Convert totalNetWeight to quintals: netWeight ÷ 1000
      const totalNetWeightQuintals = totalNetWeight / 1000;
      const yieldPercentage = totalNetWeightQuintals > 0 
        ? (totalByProducts / totalNetWeightQuintals) * 100 
        : 0;

      console.log(`📈 Total Net Weight: ${totalNetWeight} (stored units) = ${totalNetWeightQuintals.toFixed(2)} quintals`);
      console.log(`📈 Yield Percentage: ${yieldPercentage.toFixed(2)}% (${totalByProducts} ÷ ${totalNetWeightQuintals.toFixed(2)} × 100)`);

      // Update the outturn with the calculated yield percentage
      await Outturn.update(
        { yieldPercentage: yieldPercentage.toFixed(2) },
        { where: { id: outturnId } }
      );

      return yieldPercentage;
    } catch (error) {
      console.error('Error calculating yield percentage:', error);
      throw error;
    }
  }

  /**
   * Recalculate yield percentage for all outturns
   * Useful for batch updates or data corrections
   * @returns {Promise<void>}
   */
  static async recalculateAllYields() {
    try {
      console.log('🔄 Recalculating yield percentages for all outturns...');
      
      const outturns = await Outturn.findAll();
      
      for (const outturn of outturns) {
        await this.calculateAndUpdateYield(outturn.id);
      }
      
      console.log('✅ All yield percentages recalculated successfully');
    } catch (error) {
      console.error('Error recalculating all yields:', error);
      throw error;
    }
  }
}

module.exports = YieldCalculationService;
