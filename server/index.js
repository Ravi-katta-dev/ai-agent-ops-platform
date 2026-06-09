/**
 * AI Agent Ops Platform - Main Server
 * Backend server with Claude AI and Composio integrations
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const { createServer } = require('http');
const { Server } = require('socket.io');

// Import routes
const agentRoutes = require('./routes/agents');
const authRoutes = require('./routes/auth');
const toolRoutes = require('./routes/tools');
const healthRoutes = require('./routes/health');

// Import services
const { initializeServices } = require('./services');
const { setupWebSocket } = require('./websocket');

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

// Configuration
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(morgan(NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/api/', limiter);

// Routes
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/agents', agentRoutes);
app.use('/api/tools', toolRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: '🚀 AI Agent Ops Platform API',
    version: '0.1.0',
    status: 'running',
    timestamp: new Date().toISOString(),
    docs: '/api/health'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    message: `Route ${req.originalUrl} not found`,
    availableRoutes: [
      '/api/health',
      '/api/auth',
      '/api/agents',
      '/api/tools'
    ]
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  
  res.status(err.status || 500).json({
    error: NODE_ENV === 'production' ? 'Internal server error' : err.message,
    stack: NODE_ENV === 'production' ? undefined : err.stack,
    timestamp: new Date().toISOString()
  });
});

// Initialize services and start server
async function startServer() {
  try {
    // Initialize Claude, Composio, Database, Redis
    await initializeServices();
    
    // Setup WebSocket handlers
    setupWebSocket(io);
    
    // Start server
    server.listen(PORT, () => {
      console.log('\n🚀 AI Agent Ops Platform Server Started!');
      console.log(`📍 Environment: ${NODE_ENV}`);
      console.log(`🌐 Server: http://localhost:${PORT}`);
      console.log(`📡 WebSocket: ws://localhost:${PORT}`);
      console.log(`📊 Health: http://localhost:${PORT}/api/health`);
      console.log('\n🤖 Six AI Agents Ready:');
      console.log('  • DevOps Engineer');
      console.log('  • Data Analyst');
      console.log('  • Customer Support');
      console.log('  • Marketing Manager');
      console.log('  • Security Specialist');
      console.log('  • AI Coordinator');
      console.log('\n⚡ Powered by Claude AI + Composio Platform\n');
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n🛑 SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\n🛑 SIGINT received, shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

startServer();