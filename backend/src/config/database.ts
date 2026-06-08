import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

let prisma: PrismaClient;

export async function connectDatabase(): Promise<PrismaClient> {
  try {
    if (!prisma) {
      prisma = new PrismaClient({
        log: [
          {
            emit: 'event',
            level: 'query',
          },
          {
            emit: 'event',
            level: 'error',
          },
          {
            emit: 'event',
            level: 'warn',
          },
        ],
      });
      
      // Log database queries in development
      if (process.env.NODE_ENV === 'development') {
        prisma.$on('query', (e) => {
          logger.debug('Query: ' + e.query);
          logger.debug('Params: ' + e.params);
          logger.debug('Duration: ' + e.duration + 'ms');
        });
      }
      
      prisma.$on('error', (e) => {
        logger.error('Database error: ', e);
      });
      
      prisma.$on('warn', (e) => {
        logger.warn('Database warning: ', e);
      });
    }
    
    // Test the connection
    await prisma.$connect();
    logger.info('Database connection established successfully');
    
    return prisma;
  } catch (error) {
    logger.error('Failed to connect to database:', error);
    throw error;
  }
}

export function getDatabase(): PrismaClient {
  if (!prisma) {
    throw new Error('Database not initialized. Call connectDatabase() first.');
  }
  return prisma;
}

export async function disconnectDatabase(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect();
    logger.info('Database connection closed');
  }
}