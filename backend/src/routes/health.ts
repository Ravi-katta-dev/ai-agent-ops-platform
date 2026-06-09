import express from 'express';
import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { getDatabase } from '../config/database';

const router = express.Router();

// @desc    Get system health status
// @route   GET /api/health
// @access  Public
const getHealthStatus = asyncHandler(async (req: Request, res: Response) => {
  const healthCheck = {
    uptime: process.uptime(),
    message: 'AI Agent Ops Platform - Backend Running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: '0.1.0',
    services: {
      database: 'checking...',
      claude_ai: 'not_configured',
      composio: 'not_configured'
    }
  };

  try {
    // Check database connection
    const db = getDatabase();
    const result = await db.query('SELECT NOW() as current_time');
    healthCheck.services.database = 'connected';
    
    // Check Claude AI configuration
    if (process.env.ANTHROPIC_API_KEY) {
      healthCheck.services.claude_ai = 'configured';
    }
    
    // Check Composio configuration
    if (process.env.COMPOSIO_API_KEY) {
      healthCheck.services.composio = 'configured';
    }

    logger.info('Health check passed - all systems operational');
    res.status(200).json({
      success: true,
      data: healthCheck
    });
    
  } catch (error) {
    logger.error('Health check failed:', error);
    healthCheck.services.database = 'disconnected';
    
    res.status(503).json({
      success: false,
      message: 'Service Unavailable',
      data: healthCheck
    });
  }
});

// @desc    Get detailed system metrics
// @route   GET /api/health/metrics
// @access  Public
const getSystemMetrics = asyncHandler(async (req: Request, res: Response) => {
  const metrics = {
    server: {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu_usage: process.cpuUsage(),
      node_version: process.version,
      platform: process.platform
    },
    timestamp: new Date().toISOString()
  };

  res.status(200).json({
    success: true,
    data: metrics
  });
});

router.get('/', getHealthStatus);
router.get('/metrics', getSystemMetrics);

export default router;