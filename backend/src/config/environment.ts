import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables
dotenv.config();

// Environment validation schema
const envSchema = z.object({
  // Server
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default('3001'),
  HOST: z.string().default('localhost'),

  // Database
  DATABASE_URL: z.string(),
  REDIS_URL: z.string(),

  // Claude AI
  CLAUDE_API_KEY: z.string().min(1, 'Claude API key is required'),
  CLAUDE_MODEL: z.string().default('claude-3-5-sonnet-20241022'),
  CLAUDE_MAX_TOKENS: z.string().transform(Number).default('4096'),
  CLAUDE_TEMPERATURE: z.string().transform(Number).default('0.7'),

  // Composio
  COMPOSIO_API_KEY: z.string().min(1, 'Composio API key is required'),
  COMPOSIO_BASE_URL: z.string().url().default('https://backend.composio.dev/api'),
  COMPOSIO_WEBHOOK_SECRET: z.string(),

  // Authentication
  JWT_SECRET: z.string().min(32, 'JWT secret must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('24h'),
  REFRESH_TOKEN_SECRET: z.string().min(32, 'Refresh token secret must be at least 32 characters'),
  REFRESH_TOKEN_EXPIRES_IN: z.string().default('7d'),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.string().transform(Number).default('900000'),
  RATE_LIMIT_MAX_REQUESTS: z.string().transform(Number).default('100'),

  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  LOG_FILE: z.string().default('logs/app.log'),

  // CORS
  ALLOWED_ORIGINS: z.string().default('http://localhost:3000'),

  // WebSocket
  SOCKET_IO_CORS_ORIGINS: z.string().default('http://localhost:3000'),

  // Agent Configuration
  MAX_CONCURRENT_AGENTS: z.string().transform(Number).default('6'),
  AGENT_TIMEOUT_MS: z.string().transform(Number).default('300000'),
  AGENT_RETRY_ATTEMPTS: z.string().transform(Number).default('3'),

  // Tool Integration
  MAX_TOOLS_PER_AGENT: z.string().transform(Number).default('10'),
  TOOL_EXECUTION_TIMEOUT: z.string().transform(Number).default('60000'),
});

// Validate environment variables
const env = envSchema.parse(process.env);

// Export configuration object
export const config = {
  env: env.NODE_ENV,
  server: {
    port: env.PORT,
    host: env.HOST,
  },
  database: {
    url: env.DATABASE_URL,
    redis: env.REDIS_URL,
  },
  claude: {
    apiKey: env.CLAUDE_API_KEY,
    model: env.CLAUDE_MODEL,
    maxTokens: env.CLAUDE_MAX_TOKENS,
    temperature: env.CLAUDE_TEMPERATURE,
  },
  composio: {
    apiKey: env.COMPOSIO_API_KEY,
    baseUrl: env.COMPOSIO_BASE_URL,
    webhookSecret: env.COMPOSIO_WEBHOOK_SECRET,
  },
  auth: {
    jwtSecret: env.JWT_SECRET,
    jwtExpiresIn: env.JWT_EXPIRES_IN,
    refreshTokenSecret: env.REFRESH_TOKEN_SECRET,
    refreshTokenExpiresIn: env.REFRESH_TOKEN_EXPIRES_IN,
  },
  rateLimit: {
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    maxRequests: env.RATE_LIMIT_MAX_REQUESTS,
  },
  logging: {
    level: env.LOG_LEVEL,
    file: env.LOG_FILE,
  },
  cors: {
    origins: env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim()),
  },
  webSocket: {
    corsOrigins: env.SOCKET_IO_CORS_ORIGINS.split(',').map(origin => origin.trim()),
  },
  agents: {
    maxConcurrent: env.MAX_CONCURRENT_AGENTS,
    timeoutMs: env.AGENT_TIMEOUT_MS,
    retryAttempts: env.AGENT_RETRY_ATTEMPTS,
  },
  tools: {
    maxPerAgent: env.MAX_TOOLS_PER_AGENT,
    executionTimeout: env.TOOL_EXECUTION_TIMEOUT,
  },
} as const;

// Type for configuration
export type Config = typeof config;