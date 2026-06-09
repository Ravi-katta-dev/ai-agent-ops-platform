/**
 * AI Agent Ops Platform - Service Initialization
 * Centralized service setup for Claude AI, Composio, Database, and Redis
 */

const claudeService = require('./claude');
const composioService = require('./composio');
const databaseService = require('./database');
const redisService = require('./redis');
const agentService = require('./agents');

/**
 * Initialize all platform services
 */
async function initializeServices() {
  console.log('🔧 Initializing AI Agent Ops Platform services...');
  
  try {
    // Initialize Redis first (used for caching)
    console.log('📦 Connecting to Redis...');
    await redisService.initialize();
    console.log('✅ Redis connected successfully');
    
    // Initialize Database
    console.log('🗄️  Connecting to Database...');
    await databaseService.initialize();
    console.log('✅ Database connected successfully');
    
    // Initialize Claude AI
    console.log('🧠 Initializing Claude AI...');
    await claudeService.initialize();
    console.log('✅ Claude AI initialized successfully');
    
    // Initialize Composio Platform
    console.log('🔗 Initializing Composio Platform...');
    await composioService.initialize();
    console.log('✅ Composio Platform initialized successfully');
    
    // Initialize Agent Management System
    console.log('🤖 Initializing AI Agents...');
    await agentService.initialize();
    console.log('✅ All 6 AI Agents initialized successfully');
    
    console.log('🚀 All services initialized successfully!\n');
    
  } catch (error) {
    console.error('❌ Service initialization failed:', error);
    throw error;
  }
}

/**
 * Gracefully shutdown all services
 */
async function shutdownServices() {
  console.log('🛑 Shutting down services...');
  
  try {
    await agentService.shutdown();
    await composioService.shutdown();
    await claudeService.shutdown();
    await redisService.shutdown();
    await databaseService.shutdown();
    
    console.log('✅ All services shut down successfully');
    
  } catch (error) {
    console.error('❌ Error during service shutdown:', error);
    throw error;
  }
}

/**
 * Get service status for health checks
 */
async function getServiceStatus() {
  try {
    const status = {
      redis: await redisService.isHealthy(),
      database: await databaseService.isHealthy(),
      claude: await claudeService.isHealthy(),
      composio: await composioService.isHealthy(),
      agents: await agentService.getAgentStatus()
    };
    
    return {
      status: 'healthy',
      services: status,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = {
  initializeServices,
  shutdownServices,
  getServiceStatus,
  // Export individual services
  claude: claudeService,
  composio: composioService,
  database: databaseService,
  redis: redisService,
  agents: agentService
};