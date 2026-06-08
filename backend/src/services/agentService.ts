import { v4 as uuidv4 } from 'uuid';
import { Agent, AgentType, AgentStatus, AgentTask, AgentConversation } from '../types/agent';
import { ClaudeClient, ClaudeMessage } from './claudeClient';
import { logger } from '../utils/logger';

export class AgentService {
  private agents: Map<string, Agent> = new Map();
  private tasks: Map<string, AgentTask> = new Map();
  private conversations: Map<string, AgentConversation> = new Map();
  private claudeClient: ClaudeClient;

  constructor() {
    this.claudeClient = new ClaudeClient();
    this.initializeAgents();
  }

  /**
   * Initialize the six specialized agents
   */
  private initializeAgents(): void {
    const agentConfigs: Array<Omit<Agent, 'id' | 'lastActive'>> = [
      {
        type: 'devops-engineer',
        name: 'DevOps Engineer',
        description: 'Manages deployments, CI/CD, infrastructure, and monitoring',
        status: 'active',
        tasksCompleted: 47,
        efficiency: 94,
        color: 'from-blue-500 to-blue-600'
      },
      {
        type: 'data-analyst',
        name: 'Data Analyst',
        description: 'Processes metrics, generates insights, and creates reports',
        status: 'working',
        tasksCompleted: 32,
        efficiency: 89,
        color: 'from-green-500 to-green-600'
      },
      {
        type: 'customer-support',
        name: 'Customer Support',
        description: 'Handles inquiries, tickets, and user communication',
        status: 'active',
        tasksCompleted: 156,
        efficiency: 96,
        color: 'from-purple-500 to-purple-600'
      },
      {
        type: 'marketing-manager',
        name: 'Marketing Manager',
        description: 'Manages campaigns, content creation, and social media',
        status: 'idle',
        tasksCompleted: 28,
        efficiency: 87,
        color: 'from-pink-500 to-pink-600'
      },
      {
        type: 'security-specialist',
        name: 'Security Specialist',
        description: 'Monitors threats, manages access, and ensures compliance',
        status: 'active',
        tasksCompleted: 23,
        efficiency: 98,
        color: 'from-red-500 to-red-600'
      },
      {
        type: 'ai-coordinator',
        name: 'AI Coordinator',
        description: 'Orchestrates agents, optimizes workflows, and manages resources',
        status: 'working',
        tasksCompleted: 89,
        efficiency: 99,
        color: 'from-indigo-500 to-indigo-600'
      }
    ];

    agentConfigs.forEach(config => {
      const agent: Agent = {
        ...config,
        id: uuidv4(),
        lastActive: new Date()
      };
      this.agents.set(agent.id, agent);
      logger.info(`Initialized agent: ${agent.name}`, { agentId: agent.id, type: agent.type });
    });
  }

  /**
   * Get all agents
   */
  getAllAgents(): Agent[] {
    return Array.from(this.agents.values());
  }

  /**
   * Get agent by ID
   */
  getAgent(agentId: string): Agent | undefined {
    return this.agents.get(agentId);
  }

  /**
   * Get agent by type
   */
  getAgentByType(agentType: AgentType): Agent | undefined {
    return Array.from(this.agents.values()).find(agent => agent.type === agentType);
  }

  /**
   * Update agent status
   */
  updateAgentStatus(agentId: string, status: AgentStatus): boolean {
    const agent = this.agents.get(agentId);
    if (!agent) {
      return false;
    }

    agent.status = status;
    agent.lastActive = new Date();
    this.agents.set(agentId, agent);
    
    logger.info(`Agent status updated`, {
      agentId,
      agentName: agent.name,
      newStatus: status,
      timestamp: agent.lastActive
    });

    return true;
  }

  /**
   * Send message to specific agent via Claude
   */
  async sendMessageToAgent(
    agentType: AgentType,
    message: string,
    conversationId?: string
  ): Promise<{
    response: string;
    conversationId: string;
    agentId: string;
    tokenUsage: { input: number; output: number };
  }> {
    const agent = this.getAgentByType(agentType);
    if (!agent) {
      throw new Error(`Agent of type ${agentType} not found`);
    }

    // Update agent status to working
    this.updateAgentStatus(agent.id, 'working');

    try {
      // Get or create conversation
      const convId = conversationId || uuidv4();
      let conversation = this.conversations.get(convId);
      
      if (!conversation) {
        conversation = {
          id: convId,
          agentId: agent.id,
          agentType: agent.type,
          messages: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          isActive: true
        };
        this.conversations.set(convId, conversation);
      }

      // Get conversation history for Claude
      const history: ClaudeMessage[] = conversation.messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      // Send message to Claude
      const claudeResponse = await this.claudeClient.sendMessage(
        message,
        agentType,
        history
      );

      // Update conversation
      const timestamp = new Date();
      conversation.messages.push(
        {
          role: 'user',
          content: message,
          timestamp
        },
        {
          role: 'assistant',
          content: claudeResponse.content,
          timestamp,
          tokenUsage: {
            input: claudeResponse.usage.input_tokens,
            output: claudeResponse.usage.output_tokens
          }
        }
      );
      conversation.updatedAt = timestamp;
      this.conversations.set(convId, conversation);

      // Update agent metrics
      agent.tasksCompleted += 1;
      agent.lastActive = timestamp;
      this.agents.set(agent.id, agent);

      // Update agent status back to active
      this.updateAgentStatus(agent.id, 'active');

      logger.info(`Message processed by agent`, {
        agentId: agent.id,
        agentType: agent.type,
        conversationId: convId,
        inputTokens: claudeResponse.usage.input_tokens,
        outputTokens: claudeResponse.usage.output_tokens,
        messageLength: message.length,
        responseLength: claudeResponse.content.length
      });

      return {
        response: claudeResponse.content,
        conversationId: convId,
        agentId: agent.id,
        tokenUsage: {
          input: claudeResponse.usage.input_tokens,
          output: claudeResponse.usage.output_tokens
        }
      };
    } catch (error) {
      // Update agent status back to active on error
      this.updateAgentStatus(agent.id, 'active');
      
      logger.error('Error processing message for agent', {
        agentId: agent.id,
        agentType: agent.type,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      throw error;
    }
  }

  /**
   * Get conversation by ID
   */
  getConversation(conversationId: string): AgentConversation | undefined {
    return this.conversations.get(conversationId);
  }

  /**
   * Get all conversations for an agent
   */
  getAgentConversations(agentId: string): AgentConversation[] {
    return Array.from(this.conversations.values())
      .filter(conv => conv.agentId === agentId);
  }

  /**
   * Get system statistics
   */
  getSystemStats() {
    const agents = Array.from(this.agents.values());
    const activeAgents = agents.filter(a => a.status === 'active' || a.status === 'working');
    const totalTasks = agents.reduce((sum, agent) => sum + agent.tasksCompleted, 0);
    const avgEfficiency = Math.round(
      agents.reduce((sum, agent) => sum + agent.efficiency, 0) / agents.length
    );
    
    return {
      totalAgents: agents.length,
      activeAgents: activeAgents.length,
      totalTasksCompleted: totalTasks,
      averageEfficiency: avgEfficiency,
      totalConversations: this.conversations.size,
      systemUptime: process.uptime()
    };
  }

  /**
   * Test Claude connectivity
   */
  async testClaudeConnection(): Promise<boolean> {
    return await this.claudeClient.testConnection();
  }
}