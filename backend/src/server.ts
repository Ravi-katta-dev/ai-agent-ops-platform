import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import rateLimit from 'express-rate-limit';
import { errorHandler } from './middleware/errorHandler';
import { logger } from './utils/logger';
import { connectDatabase } from './config/database';
import { initializeRedis } from './config/redis';

// Routes
import agentRoutes from './routes/agents';
import authRoutes from './routes/auth';
import taskRoutes from './routes/tasks';
import toolRoutes from './routes/tools';
import webhookRoutes from './routes/webhooks';

// Initialize environment variables
dotenv.config();

const app = express();
const server = createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

// Port configuration
const PORT = process.env.PORT || 5000;

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
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

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '0.1.0'
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/agents', agentRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/tools', toolRoutes);
app.use('/api/webhooks', webhookRoutes);

// Socket.IO connection handling
io.on('connection', (socket) => {
  logger.info(`Client connected: ${socket.id}`);
  
  socket.on('join-room', (room) => {
    socket.join(room);
    logger.info(`Socket ${socket.id} joined room: ${room}`);
  });
  
  socket.on('disconnect', () => {
    logger.info(`Client disconnected: ${socket.id}`);
  });
});

// Make io available globally
app.set('io', io);

// Error handling middleware (should be last)
app.use(errorHandler);

// Initialize services and start server
async function startServer() {
  try {
    // Initialize database
    await connectDatabase();
    logger.info('Database connected successfully');
    
    // Initialize Redis
    await initializeRedis();
    logger.info('Redis connected successfully');
    
    // Start server
    server.listen(PORT, () => {
      logger.info(`🚀 AI Agent Ops Platform Backend running on port ${PORT}`);
      logger.info(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`🧠 Claude API: ${process.env.ANTHROPIC_API_KEY ? 'Configured' : 'Missing'}`);
      logger.info(`🔧 Composio: ${process.env.COMPOSIO_API_KEY ? 'Configured' : 'Missing'}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

startServer();

export { io };