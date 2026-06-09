import { prisma } from '../lib/prisma';
import { logger } from '../utils/logger';
import { AgentStatus } from '@prisma/client';
import { EventEmitter } from 'events';
import type { Server as SocketServer } from 'socket.io';

export interface UpdateAgentStatusParams {
  agentId: string;
  status: AgentStatus;
  reason?: string;
}

export interface AgentStatusChangeEvent {
  agentId: string;
  previousStatus: AgentStatus;
  newStatus: AgentStatus;
  changedAt: Date;
  reason?: string;
}

export const AGENT_STATUS_CHANGED_EVENT = 'agent:status:changed';

export class AgentService {
  private static readonly eventEmitter = new EventEmitter();
  private static socketServer: SocketServer | null = null;

  static setSocketServer(io: SocketServer): void {
    AgentService.socketServer = io;
  }

  static onStatusChange(listener: (event: AgentStatusChangeEvent) => void): void {
    AgentService.eventEmitter.on(AGENT_STATUS_CHANGED_EVENT, listener);
  }

  static offStatusChange(listener: (event: AgentStatusChangeEvent) => void): void {
    AgentService.eventEmitter.off(AGENT_STATUS_CHANGED_EVENT, listener);
  }

  /**
   * Update agent status with validation and logging
   */
  async updateAgentStatus(params: UpdateAgentStatusParams): Promise<AgentStatusChangeEvent> {
    const { agentId, status, reason } = params;

    try {
      // Fetch the agent to check if it exists and get current status
      const agent = await prisma.agent.findUnique({
        where: { id: agentId },
        select: { id: true, name: true, status: true, userId: true }
      });

      if (!agent) {
        throw new Error(`Agent with ID ${agentId} not found`);
      }

      const previousStatus = agent.status;

      // Validate the status transition
      this.validateStatusTransition(previousStatus, status);

      // Perform the status update
      const updatedAgent = await prisma.agent.update({
        where: { id: agentId },
        data: {
          status,
          updatedAt: new Date()
        },
        select: {
          id: true,
          name: true,
          status: true,
          updatedAt: true
        }
      });

      // Log the status change
      const statusChangeEvent: AgentStatusChangeEvent = {
        agentId,
        previousStatus,
        newStatus: status,
        changedAt: updatedAgent.updatedAt,
        reason
      };

      await this.logStatusChange(statusChangeEvent);

      logger.info('Agent status updated successfully', {
        agentId,
        agentName: agent.name,
        previousStatus,
        newStatus: status,
        reason,
        timestamp: updatedAgent.updatedAt
      });

      // Emit event for real-time updates (can be integrated with WebSocket/EventEmitter)
      this.emitStatusChangeEvent(statusChangeEvent);

      return statusChangeEvent;
    } catch (error) {
      logger.error('Failed to update agent status', {
        agentId,
        status,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Validate status transitions (business logic)
   * Defines valid state machine transitions for agent statuses
   */
  private validateStatusTransition(from: AgentStatus, to: AgentStatus): void {
    // If trying to set to the same status, allow it (idempotent)
    if (from === to) {
      return;
    }

    const validTransitions: Record<AgentStatus, AgentStatus[]> = {
      ACTIVE: [AgentStatus.IDLE, AgentStatus.ERROR, AgentStatus.OFFLINE, AgentStatus.WORKING],
      IDLE: [AgentStatus.ACTIVE, AgentStatus.WORKING, AgentStatus.OFFLINE],
      WORKING: [AgentStatus.ACTIVE, AgentStatus.IDLE, AgentStatus.ERROR, AgentStatus.OFFLINE],
      ERROR: [AgentStatus.ACTIVE, AgentStatus.IDLE, AgentStatus.OFFLINE],
      OFFLINE: [AgentStatus.IDLE, AgentStatus.ACTIVE]
    };

    const allowedTransitions = validTransitions[from] || [];

    if (!allowedTransitions.includes(to)) {
      throw new Error(
        `Invalid status transition from ${from} to ${to}. Allowed transitions: ${allowedTransitions.join(', ')}`
      );
    }
  }

  /**
   * Log agent status changes to database for audit trail
   */
  private async logStatusChange(event: AgentStatusChangeEvent): Promise<void> {
    try {
      await prisma.agentLog.create({
        data: {
          agentId: event.agentId,
          level: 'INFO',
          message: `Agent status changed from ${event.previousStatus} to ${event.newStatus}`,
          data: {
            previousStatus: event.previousStatus,
            newStatus: event.newStatus,
            reason: event.reason,
            timestamp: event.changedAt.toISOString()
          }
        }
      });
    } catch (error) {
      logger.warn('Failed to log agent status change', {
        agentId: event.agentId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      // Don't throw - logging should not block the operation
    }
  }

  /**
   * Emit status change event for WebSocket/EventEmitter integration
   * This can be extended to publish to message queues, WebSocket listeners, etc.
   */
  private emitStatusChangeEvent(event: AgentStatusChangeEvent): void {
    AgentService.eventEmitter.emit(AGENT_STATUS_CHANGED_EVENT, event);

    if (AgentService.socketServer) {
      AgentService.socketServer.emit(AGENT_STATUS_CHANGED_EVENT, event);
      AgentService.socketServer.to(`agent-${event.agentId}`).emit(AGENT_STATUS_CHANGED_EVENT, event);
    }

    logger.debug('Agent status change event emitted', {
      agentId: event.agentId,
      previousStatus: event.previousStatus,
      newStatus: event.newStatus,
      hasSocketServer: Boolean(AgentService.socketServer),
      listenerCount: AgentService.eventEmitter.listenerCount(AGENT_STATUS_CHANGED_EVENT)
    });
  }

  /**
   * Get agent status with related information
   */
  async getAgentStatus(agentId: string) {
    try {
      const agent = await prisma.agent.findUnique({
        where: { id: agentId },
        select: {
          id: true,
          name: true,
          type: true,
          status: true,
          efficiency: true,
          tasksCount: true,
          updatedAt: true,
          isActive: true
        }
      });

      if (!agent) {
        throw new Error(`Agent with ID ${agentId} not found`);
      }

      return agent;
    } catch (error) {
      logger.error('Failed to get agent status', {
        agentId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Bulk update agent statuses (for coordinated updates by AI Coordinator)
   */
  async bulkUpdateAgentStatuses(
    updates: Array<{ agentId: string; status: AgentStatus; reason?: string }>
  ): Promise<AgentStatusChangeEvent[]> {
    const results: AgentStatusChangeEvent[] = [];
    const errors: Array<{ agentId: string; error: string }> = [];

    for (const update of updates) {
      try {
        const result = await this.updateAgentStatus(update);
        results.push(result);
      } catch (error) {
        errors.push({
          agentId: update.agentId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    if (errors.length > 0) {
      logger.warn('Some agent status updates failed', { errors });
    }

    return results;
  }

  /**
   * Get agent status history (audit trail)
   */
  async getAgentStatusHistory(agentId: string, limit: number = 10) {
    try {
      const logs = await prisma.agentLog.findMany({
        where: {
          agentId,
          message: {
            contains: 'status changed'
          }
        },
        orderBy: {
          timestamp: 'desc'
        },
        take: limit,
        select: {
          id: true,
          message: true,
          data: true,
          timestamp: true
        }
      });

      return logs;
    } catch (error) {
      logger.error('Failed to get agent status history', {
        agentId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }
}

export const agentService = new AgentService();
