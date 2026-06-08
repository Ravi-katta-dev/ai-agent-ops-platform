import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import WebSocket from 'ws';
import dotenv from 'dotenv';
import { setupDatabase } from './config/database';
import { setupRedis } from './config/redis';
import { setupRoutes } from './routes';
import { WebSocketManager } from './services/websocket';
import { AgentManager } from './services/agentManager';
import { ClaudeService } from './services/claude';
import { ComposioService } from './services/composio';
import { Logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { rateLimiter } from './middleware/rateLimiter';

// Load environment variables
dotenv.config();

const app = express();
const server = createServer(app);
const wss = new WebSocket.Server({ server });

// Initialize services
const logger = new Logger();
const wsManager = new WebSocketManager(wss, logger);
const claudeService = new ClaudeService();
const composioService = new ComposioService();
const agentManager = new AgentManager(claudeService, composioService, wsManager, logger);

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(rateLimiter);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '0.1.0',
    agents: agentManager.getAgentStatus()
  });
});

// API Routes
setupRoutes(app, agentManager);

// Error handling
app.use(errorHandler);

// Initialize services and start server
async function startServer() {
  try {
    // Setup database
    await setupDatabase();
    logger.info('Database connected successfully');

    // Setup Redis
    await setupRedis();
    logger.info('Redis connected successfully');

    // Initialize Claude service
    await claudeService.initialize();
    logger.info('Claude AI service initialized');

    // Initialize Composio service
    await composioService.initialize();
    logger.info('Composio service initialized');

    // Initialize agents
    await agentManager.initializeAgents();
    logger.info('All agents initialized successfully');

    const PORT = process.env.PORT || 8000;
    server.listen(PORT, () => {
      logger.info(`AI Agent Ops Platform server running on port ${PORT}`);
      logger.info(`WebSocket server running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });

    // Handle graceful shutdown
    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

async function gracefulShutdown() {
  logger.info('Received shutdown signal. Gracefully shutting down...');
  
  // Stop accepting new connections
  server.close(() => {
    logger.info('HTTP server closed');
  });

  // Close WebSocket connections
  wsManager.closeAllConnections();

  // Stop all agents
  await agentManager.stopAllAgents();

  // Close database connections
  // await database.close();

  logger.info('Graceful shutdown completed');
  process.exit(0);
}

// Start the server
startServer();

export { app, server, wss };