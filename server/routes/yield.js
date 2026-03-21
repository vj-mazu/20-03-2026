const express = require('express');
const { auth, authorize } = require('../middleware/auth');
const YieldCalculationService = require('../services/YieldCalculationService');

const router = express.Router();

// Recalculate yield for a specific outturn
router.post('/recalculate/:outturnId', auth, authorize('manager', 'admin'), async (req, res) => {
  try {
    const { outturnId } = req.params;
    
    const yieldPercentage = await YieldCalculationService.calculateAndUpdateYield(parseInt(outturnId));
    
    res.json({
      message: 'Yield percentage recalculated successfully',
      yieldPercentage: yieldPercentage.toFixed(2)
    });
  } catch (error) {
    console.error('Error recalculating yield:', error);
    res.status(500).json({ error: 'Failed to recalculate yield percentage' });
  }
});

// Recalculate yield for all outturns (Admin only)
router.post('/recalculate-all', auth, authorize('admin'), async (req, res) => {
  try {
    await YieldCalculationService.recalculateAllYields();
    
    res.json({
      message: 'All yield percentages recalculated successfully'
    });
  } catch (error) {
    console.error('Error recalculating all yields:', error);
    res.status(500).json({ error: 'Failed to recalculate yield percentages' });
  }
});

module.exports = router;
