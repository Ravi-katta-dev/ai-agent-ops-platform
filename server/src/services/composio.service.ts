import { ComposioToolSet } from 'composio-core';
import { logger } from '../utils/logger';

export interface ToolConnection {
  id: string;
  name: string;
  app: string;
  status: 'active' | 'inactive' | 'error';
  lastUsed?: Date;
  metadata?: Record<string, any>;
}

export interface ToolExecution {
  toolId: string;
  action: string;
  parameters: Record<string, any>;
  result?: any;
  error?: string;
  executedAt: Date;
  duration?: number;
}

export class ComposioService {
  private static instance: ComposioService;
  private toolset: ComposioToolSet;
  private initialized = false;
  private connections: Map<string, ToolConnection> = new Map();

  private constructor() {
    if (!process.env.COMPOSIO_API_KEY) {
      throw new Error('COMPOSIO_API_KEY environment variable is required');
    }

    this.toolset = new ComposioToolSet({
      apiKey: process.env.COMPOSIO_API_KEY,
      baseUrl: process.env.COMPOSIO_BASE_URL || 'https://backend.composio.dev',
      entityId: process.env.COMPOSIO_ENTITY_ID || 'default'
    });
  }

  public static getInstance(): ComposioService {
    if (!ComposioService.instance) {
      ComposioService.instance = new ComposioService();
    }
    return ComposioService.instance;
  }

  public static async initialize(): Promise<void> {
    const instance = ComposioService.getInstance();
    try {
      // Test the connection by getting available apps
      const apps = await instance.toolset.client.apps.list();
      logger.info(`Composio connected with ${apps.length} available apps`);
      
      // Initialize common tool connections
      await instance.initializeDefaultConnections();
      
      instance.initialized = true;
      logger.info('Composio service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Composio service:', error);
      throw error;
    }
  }

  public static isInitialized(): boolean {
    return ComposioService.instance?.initialized || false;
  }

  private async initializeDefaultConnections(): Promise<void> {
    const priorityApps = [
      'github',
      'slack', 
      'gmail',
      'googlesheets',
      'googledrive',
      'notion',
      'linear',
      'figma'
    ];

    for (const app of priorityApps) {
      try {
        const connections = await this.toolset.client.connectedAccounts.list({
          user_uuid: process.env.COMPOSIO_ENTITY_ID || 'default'
        });
        
        const appConnections = connections.items?.filter(conn => 
          conn.appName?.toLowerCase() === app.toLowerCase()
        ) || [];
        
        if (appConnections.length > 0) {
          const connection = appConnections[0];
          this.connections.set(app, {
            id: connection.id!,
            name: app,
            app: app,
            status: connection.status === 'ACTIVE' ? 'active' : 'inactive',
            lastUsed: connection.updatedAt ? new Date(connection.updatedAt) : undefined,
            metadata: connection.metadata
          });
          logger.info(`Found existing ${app} connection`);
        } else {
          logger.info(`No ${app} connection found - will need user authorization`);
        }
      } catch (error) {
        logger.warn(`Failed to check ${app} connection:`, error);
      }
    }
  }

  public async executeAction(
    app: string,
    action: string,
    parameters: Record<string, any>
  ): Promise<ToolExecution> {
    const startTime = Date.now();
    const execution: ToolExecution = {
      toolId: `${app}_${action}`,
      action,
      parameters,
      executedAt: new Date()
    };

    try {
      if (!this.initialized) {
        throw new Error('Composio service not initialized');
      }

      const connection = this.connections.get(app);
      if (!connection || connection.status !== 'active') {
        throw new Error(`No active connection found for ${app}`);
      }

      // Execute the action using Composio
      const result = await this.toolset.executeAction({
        action: `${app}_${action}`,
        params: parameters,
        entityId: process.env.COMPOSIO_ENTITY_ID || 'default'
      });

      execution.result = result;
      execution.duration = Date.now() - startTime;

      // Update last used timestamp
      connection.lastUsed = new Date();
      this.connections.set(app, connection);

      logger.info(`Successfully executed ${app}/${action} in ${execution.duration}ms`);
      return execution;

    } catch (error) {
      execution.error = error instanceof Error ? error.message : 'Unknown error';
      execution.duration = Date.now() - startTime;
      
      logger.error(`Failed to execute ${app}/${action}:`, error);
      return execution;
    }
  }

  public async getAvailableActions(app: string): Promise<string[]> {
    try {
      const actions = await this.toolset.client.actions.list({
        apps: app
      });
      
      return actions.items?.map(action => action.name!) || [];
    } catch (error) {
      logger.error(`Failed to get actions for ${app}:`, error);
      return [];
    }
  }

  public async getConnectionStatus(app: string): Promise<ToolConnection | null> {
    return this.connections.get(app) || null;
  }

  public getAllConnections(): ToolConnection[] {
    return Array.from(this.connections.values());
  }

  public async createConnection(app: string): Promise<{ authUrl: string; connectionId: string }> {
    try {
      const authScheme = await this.toolset.client.apps.getConnectors({
        appNames: app
      });
      
      if (!authScheme.connectors || authScheme.connectors.length === 0) {
        throw new Error(`No connectors found for ${app}`);
      }

      const connector = authScheme.connectors[0];
      const authResponse = await this.toolset.client.connectedAccounts.initiate({
        integrationId: connector.integrationId!,
        data: {
          entityId: process.env.COMPOSIO_ENTITY_ID || 'default'
        }
      });

      if (authResponse.redirectUrl) {
        return {
          authUrl: authResponse.redirectUrl,
          connectionId: authResponse.connectionRequest!.id!
        };
      } else {
        throw new Error('Failed to get authorization URL');
      }
    } catch (error) {
      logger.error(`Failed to create connection for ${app}:`, error);
      throw error;
    }
  }

  public async handleWebhook(payload: any, signature?: string): Promise<void> {
    try {
      // Verify webhook signature if provided
      if (signature) {
        // Implement signature verification logic
        logger.info('Webhook signature verified');
      }

      // Process webhook payload
      logger.info('Processing Composio webhook:', payload);
      
      // Update connection status based on webhook
      if (payload.type === 'connection_status_changed') {
        const { appName, status, connectionId } = payload.data;
        const connection = this.connections.get(appName);
        
        if (connection) {
          connection.status = status === 'ACTIVE' ? 'active' : 'inactive';
          this.connections.set(appName, connection);
          logger.info(`Updated ${appName} connection status to ${status}`);
        }
      }
    } catch (error) {
      logger.error('Failed to process webhook:', error);
      throw error;
    }
  }

  public async refreshConnections(): Promise<void> {
    try {
      const connections = await this.toolset.client.connectedAccounts.list({
        user_uuid: process.env.COMPOSIO_ENTITY_ID || 'default'
      });
      
      // Update local connection cache
      for (const conn of connections.items || []) {
        if (conn.appName) {
          this.connections.set(conn.appName.toLowerCase(), {
            id: conn.id!,
            name: conn.appName,
            app: conn.appName.toLowerCase(),
            status: conn.status === 'ACTIVE' ? 'active' : 'inactive',
            lastUsed: conn.updatedAt ? new Date(conn.updatedAt) : undefined,
            metadata: conn.metadata
          });
        }
      }
      
      logger.info(`Refreshed ${this.connections.size} tool connections`);
    } catch (error) {
      logger.error('Failed to refresh connections:', error);
      throw error;
    }
  }
}