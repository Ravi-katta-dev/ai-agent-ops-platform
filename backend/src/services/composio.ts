import { Composio } from 'composio-core';
import { logger } from '../utils/logger';

interface ToolConnection {
  toolName: string;
  connectionId: string;
  isActive: boolean;
  lastUsed?: Date;
  metadata?: any;
}

interface ToolExecution {
  toolName: string;
  action: string;
  parameters: any;
  agentId: string;
  connectionId?: string;
}

class ComposioService {
  private client: Composio;
  private connectedTools: Map<string, ToolConnection> = new Map();
  
  constructor() {
    if (!process.env.COMPOSIO_API_KEY) {
      throw new Error('COMPOSIO_API_KEY environment variable is required');
    }
    
    this.client = new Composio({
      apiKey: process.env.COMPOSIO_API_KEY,
    });
    
    this.initializeConnections();
  }
  
  /**
   * Initialize default tool connections
   */
  private async initializeConnections() {
    try {
      // Priority tools for each agent
      const priorityTools = [
        'github',      // DevOps
        'slack',       // All agents
        'gmail',       // Customer Support
        'googlesheets', // Data Analyst
        'linkedin',    // Marketing
        'aws'          // DevOps & Security
      ];
      
      for (const tool of priorityTools) {
        await this.checkToolConnection(tool);
      }
      
      logger.info('Composio tool connections initialized');
    } catch (error) {
      logger.error('Failed to initialize Composio connections:', error);
    }
  }
  
  /**
   * Check if a tool is connected and active
   */
  async checkToolConnection(toolName: string): Promise<ToolConnection | null> {
    try {
      const connections = await this.client.getConnections({
        appNames: [toolName]
      });
      
      if (connections.length > 0) {
        const connection = connections[0];
        const toolConnection: ToolConnection = {
          toolName,
          connectionId: connection.id,
          isActive: connection.status === 'ACTIVE',
          lastUsed: new Date(),
          metadata: connection
        };
        
        this.connectedTools.set(toolName, toolConnection);
        return toolConnection;
      }
      
      return null;
    } catch (error) {
      logger.error(`Failed to check connection for ${toolName}:`, error);
      return null;
    }
  }
  
  /**
   * Execute a tool action
   */
  async executeToolAction(execution: ToolExecution): Promise<any> {
    try {
      // Check if tool is connected
      let connection = this.connectedTools.get(execution.toolName);
      if (!connection || !connection.isActive) {
        connection = await this.checkToolConnection(execution.toolName);
        if (!connection || !connection.isActive) {
          throw new Error(`Tool ${execution.toolName} is not connected or inactive`);
        }
      }
      
      // Execute the action
      const result = await this.client.executeAction({
        appName: execution.toolName,
        actionName: execution.action,
        params: execution.parameters,
        connectionId: connection.connectionId
      });
      
      // Update last used timestamp
      connection.lastUsed = new Date();
      
      logger.info(`Tool action executed: ${execution.toolName}.${execution.action} by agent ${execution.agentId}`);
      
      return result;
    } catch (error) {
      logger.error(`Failed to execute ${execution.toolName}.${execution.action}:`, error);
      throw error;
    }
  }
  
  /**
   * Get available actions for a tool
   */
  async getToolActions(toolName: string): Promise<any[]> {
    try {
      const actions = await this.client.getActions({
        appNames: [toolName]
      });
      return actions;
    } catch (error) {
      logger.error(`Failed to get actions for ${toolName}:`, error);
      return [];
    }
  }
  
  /**
   * Get all connected tools status
   */
  getConnectedToolsStatus(): ToolConnection[] {
    return Array.from(this.connectedTools.values());
  }
  
  /**
   * Agent-specific tool mappings
   */
  getAgentTools(agentType: string): string[] {
    const agentToolMappings: Record<string, string[]> = {
      'devops': ['github', 'docker', 'aws', 'kubernetes', 'terraform', 'jenkins'],
      'data-analyst': ['googlesheets', 'tableau', 'jupyter', 'python', 'sql', 'excel'],
      'customer-support': ['slack', 'zendesk', 'intercom', 'gmail', 'calendly', 'discord'],
      'marketing': ['twitter', 'linkedin', 'facebook', 'mailchimp', 'hubspot', 'canva', 'buffer'],
      'security': ['1password', 'cloudflare', 'okta', 'splunk', 'aws', 'azure'],
      'ai-coordinator': ['slack', 'notion', 'airtable', 'zapier', 'webhooks']
    };
    
    return agentToolMappings[agentType] || [];
  }
  
  /**
   * Setup webhooks for real-time tool updates
   */
  async setupWebhooks(toolName: string, callbackUrl: string): Promise<string> {
    try {
      const webhook = await this.client.createWebhook({
        appName: toolName,
        callbackUrl,
        filterCriteria: {
          triggerType: 'all'
        }
      });
      
      logger.info(`Webhook created for ${toolName}: ${webhook.id}`);
      return webhook.id;
    } catch (error) {
      logger.error(`Failed to setup webhook for ${toolName}:`, error);
      throw error;
    }
  }
  
  /**
   * Process incoming webhook data
   */
  async processWebhook(toolName: string, data: any): Promise<void> {
    try {
      logger.info(`Processing webhook for ${toolName}:`, data);
      
      // Emit real-time update to connected clients
      const io = require('../server').io;
      io.emit('tool-update', {
        tool: toolName,
        data,
        timestamp: new Date()
      });
      
      // Store webhook data for analysis
      // TODO: Store in database for analytics
      
    } catch (error) {
      logger.error(`Failed to process webhook for ${toolName}:`, error);
    }
  }
}

export const composioService = new ComposioService();
export { ToolConnection, ToolExecution };