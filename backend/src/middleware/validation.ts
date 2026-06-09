import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { logger } from '../utils/logger';
import { AgentStatus } from '@prisma/client';

// Validation schemas
export const updateAgentStatusSchema = z.object({
  status: z.enum([
    AgentStatus.ACTIVE,
    AgentStatus.IDLE,
    AgentStatus.WORKING,
    AgentStatus.ERROR,
    AgentStatus.OFFLINE
  ]),
  reason: z.string().optional().default('')
});

export type UpdateAgentStatusRequest = z.infer<typeof updateAgentStatusSchema>;

/**
 * Validate agent status update request body
 */
export const validateAgentStatusUpdate = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    const validation = updateAgentStatusSchema.safeParse(req.body);

    if (!validation.success) {
      const errors = validation.error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message
      }));

      res.status(400).json({
        success: false,
        message: 'Validation error',
        errors
      });
      return;
    }

    // Attach validated data to request
    (req as any).validatedBody = validation.data;
    next();
  } catch (error) {
    logger.error('Validation middleware error', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    res.status(500).json({
      success: false,
      message: 'Internal server error during validation'
    });
  }
};

/**
 * Validate agent ID parameter
 */
export const validateAgentId = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const { id } = req.params;

  if (!id || typeof id !== 'string' || id.trim().length === 0) {
    res.status(400).json({
      success: false,
      message: 'Invalid agent ID provided'
    });
    return;
  }

  next();
};
