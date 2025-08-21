const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const { checkPermission } = require('../middleware/permission.middleware');
const { runManualCleanup } = require('../services/ephemeralData.service');
const logger = require('../config/logger');

/**
 * @desc    Manually trigger ephemeral data cleanup
 * @route   POST /api/admin/cleanup-ephemeral-data
 * @access  Private (Admin only)
 */
router.post('/cleanup-ephemeral-data', authenticate, checkPermission('MANAGE_SYSTEM'), async (req, res) => {
  try {
    logger.info('Manual ephemeral data cleanup triggered by admin', { 
      adminId: req.user.sub,
      timestamp: new Date().toISOString()
    });

    await runManualCleanup();

    res.status(200).json({ 
      message: 'Ephemeral data cleanup completed successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Manual ephemeral data cleanup failed', { 
      error: error.message,
      adminId: req.user.sub
    });
    
    res.status(500).json({ 
      message: 'Failed to complete ephemeral data cleanup',
      error: error.message
    });
  }
});

module.exports = router;
