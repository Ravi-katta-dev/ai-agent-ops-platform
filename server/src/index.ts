import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';

import { logger } from './utils/logger';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';
import { authMiddleware } from './middleware/auth';

// Import routes
import agentRoutes from './routes/agents';
import authRoutes from './routes/auth';
import toolRoutes from './routes/tools';
import webhookRoutes from './routes/webhooks';

// Import services
import { ClaudeService } from './services/claude.service';
import { ComposioService } from './services/composio.service';
import { SocketService } from './services/socket.service';

// Load environment variables
dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 5000;

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(limiter);
app.use(requestLogger);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '0.1.0',
    services: {
      claude: ClaudeService.isInitialized(),
      composio: ComposioService.isInitialized()
    }
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/agents', authMiddleware, agentRoutes);
app.use('/api/tools', authMiddleware, toolRoutes);
app.use('/api/webhooks', webhookRoutes);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Initialize services
async function initializeServices() {
  try {
    await ClaudeService.initialize();
    await ComposioService.initialize();
    
    // Initialize Socket service
    SocketService.initialize(io);
    
    logger.info('All services initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize services:', error);
    process.exit(1);
  }
}

// Start server
async function startServer() {
  try {
    await initializeServices();
    
    httpServer.listen(PORT, () => {
      logger.info(`🚀 AI Agent Ops Platform server running on port ${PORT}`);
      logger.info(`🧠 Claude AI: ${ClaudeService.isInitialized() ? 'Connected' : 'Disconnected'}`);
      logger.info(`🔗 Composio: ${ComposioService.isInitialized() ? 'Connected' : 'Disconnected'}`);
      logger.info(`⚡ Socket.IO: Active`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  httpServer.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  httpServer.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

startServer();

export { app, io };