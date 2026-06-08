import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';

import { config } from '@/config/environment';
import { logger } from '@/utils/logger';
import { errorHandler, notFound } from '@/middleware/errorHandler';
import { authMiddleware } from '@/middleware/auth';
import { requestLogger } from '@/middleware/requestLogger';

// Import Routes
import agentRoutes from '@/routes/agents';
import authRoutes from '@/routes/auth';
import toolRoutes from '@/routes/tools';
import taskRoutes from '@/routes/tasks';
import healthRoutes from '@/routes/health';

// Import Services
import { ClaudeService } from '@/services/ClaudeService';
import { ComposioService } from '@/services/ComposioService';
import { AgentManager } from '@/services/AgentManager';
import { WebSocketManager } from '@/services/WebSocketManager';
import { DatabaseService } from '@/services/DatabaseService';

// Load environment variables
dotenv.config();

class AIAgentOpsServer {
  private app: express.Application;
  private server: any;
  private io: Server;
  private agentManager: AgentManager;
  private webSocketManager: WebSocketManager;

  constructor() {
    this.app = express();
    this.server = createServer(this.app);
    this.io = new Server(this.server, {
      cors: {
        origin: config.cors.origins,
        methods: ['GET', 'POST'],
        credentials: true
      }
    });
    
    this.initializeServices();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
    this.setupWebSocket();
  }

  private async initializeServices(): Promise<void> {
    try {
      // Initialize database
      await DatabaseService.connect();
      logger.info('Database connected successfully');

      // Initialize AI and tool services
      await ClaudeService.initialize();
      await ComposioService.initialize();
      
      // Initialize agent management
      this.agentManager = new AgentManager();
      await this.agentManager.initialize();

      logger.info('All services initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize services:', error);
      process.exit(1);
    }
  }

  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
    }));

    // CORS configuration
    this.app.use(cors({
      origin: config.cors.origins,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
    }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: config.rateLimit.windowMs,
      max: config.rateLimit.maxRequests,
      message: {
        error: 'Too many requests from this IP, please try again later.',
        retryAfter: config.rateLimit.windowMs / 1000
      },
      standardHeaders: true,
      legacyHeaders: false
    });
    this.app.use('/api', limiter);

    // Body parsing middleware
    this.app.use(compression());
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Request logging
    this.app.use(requestLogger);
  }

  private setupRoutes(): void {
    // Health check (no auth required)
    this.app.use('/health', healthRoutes);

    // Authentication routes
    this.app.use('/api/auth', authRoutes);

    // Protected API routes
    this.app.use('/api/agents', authMiddleware, agentRoutes);
    this.app.use('/api/tools', authMiddleware, toolRoutes);
    this.app.use('/api/tasks', authMiddleware, taskRoutes);

    // Root endpoint
    this.app.get('/', (req, res) => {
      res.json({
        message: 'AI Agent Ops Platform API',
        version: '0.1.0',
        status: 'running',
        timestamp: new Date().toISOString(),
        documentation: '/api/docs'
      });
    });

    // API documentation
    this.app.get('/api/docs', (req, res) => {
      res.json({
        title: 'AI Agent Ops Platform API Documentation',
        version: '0.1.0',
        description: 'API for managing AI agents with Claude AI and Composio tool integrations',
        endpoints: {
          authentication: {
            'POST /api/auth/login': 'User login',
            'POST /api/auth/register': 'User registration',
            'POST /api/auth/refresh': 'Refresh access token',
            'POST /api/auth/logout': 'User logout'
          },
          agents: {
            'GET /api/agents': 'Get all agents',
            'GET /api/agents/:id': 'Get agent by ID',
            'POST /api/agents': 'Create new agent',
            'PUT /api/agents/:id': 'Update agent',
            'DELETE /api/agents/:id': 'Delete agent',
            'POST /api/agents/:id/start': 'Start agent',
            'POST /api/agents/:id/stop': 'Stop agent'
          },
          tools: {
            'GET /api/tools': 'Get available tools',
            'GET /api/tools/:id': 'Get tool details',
            'POST /api/tools/connect': 'Connect new tool',
            'DELETE /api/tools/:id': 'Disconnect tool'
          },
          tasks: {
            'GET /api/tasks': 'Get all tasks',
            'GET /api/tasks/:id': 'Get task details',
            'POST /api/tasks': 'Create new task',
            'PUT /api/tasks/:id': 'Update task status'
          }
        }
      });
    });
  }

  private setupErrorHandling(): void {
    // 404 handler
    this.app.use(notFound);
    
    // Global error handler
    this.app.use(errorHandler);
  }

  private setupWebSocket(): void {
    this.webSocketManager = new WebSocketManager(this.io, this.agentManager);
    this.webSocketManager.initialize();
  }

  public async start(): Promise<void> {
    try {
      this.server.listen(config.server.port, config.server.host, () => {
        logger.info(`🚀 AI Agent Ops Platform server running on ${config.server.host}:${config.server.port}`);
        logger.info(`📊 Environment: ${config.env}`);
        logger.info(`🔗 Health check: http://${config.server.host}:${config.server.port}/health`);
        logger.info(`📚 API docs: http://${config.server.host}:${config.server.port}/api/docs`);
      });

      // Start agent manager
      await this.agentManager.start();
      logger.info('🤖 Agent manager started successfully');

    } catch (error) {
      logger.error('Failed to start server:', error);
      process.exit(1);
    }
  }

  public async shutdown(): Promise<void> {
    logger.info('🛑 Shutting down server gracefully...');
    
    try {
      // Stop agent manager
      await this.agentManager.stop();
      
      // Close WebSocket connections
      this.io.close();
      
      // Close database connections
      await DatabaseService.disconnect();
      
      // Close server
      this.server.close(() => {
        logger.info('✅ Server shutdown complete');
        process.exit(0);
      });
    } catch (error) {
      logger.error('❌ Error during shutdown:', error);
      process.exit(1);
    }
  }
}

// Create and start server
const server = new AIAgentOpsServer();

// Graceful shutdown handling
process.on('SIGTERM', () => server.shutdown());
process.on('SIGINT', () => server.shutdown());
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  server.shutdown();
});
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  server.shutdown();
});

// Start the server
server.start().catch((error) => {
  logger.error('Failed to start server:', error);
  process.exit(1);
});