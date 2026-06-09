import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import dotenv from 'dotenv';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { rateLimiter } from './middleware/rateLimiter';
import agentRoutes from './routes/agents';
import authRoutes from './routes/auth';
import toolRoutes from './routes/tools';
import { initializeDatabase } from './database/connection';
import { AgentWebSocketManager } from './websocket/AgentWebSocketManager';
import { ClaudeService } from './services/ClaudeService';
import { ComposioService } from './services/ComposioService';

// Load environment variables
dotenv.config();

const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(rateLimiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/agents', agentRoutes);
app.use('/api/tools', toolRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

// WebSocket setup
const wss = new WebSocketServer({ server });
const wsManager = new AgentWebSocketManager(wss);

// Error handling
app.use(errorHandler);

// Initialize services
async function initializeServices() {
  try {
    // Initialize database
    await initializeDatabase();
    logger.info('Database initialized successfully');

    // Initialize Claude service
    const claudeService = new ClaudeService();
    await claudeService.initialize();
    logger.info('Claude service initialized successfully');

    // Initialize Composio service
    const composioService = new ComposioService();
    await composioService.initialize();
    logger.info('Composio service initialized successfully');

    // Start server
    server.listen(PORT, () => {
      logger.info(`AI Agent Ops Platform backend running on port ${PORT}`);
      logger.info(`WebSocket server initialized`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    logger.error('Failed to initialize services:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
  });
});

// Initialize everything
initializeServices();

export default app;