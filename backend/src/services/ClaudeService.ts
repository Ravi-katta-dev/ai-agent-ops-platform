import Anthropic from '@anthropic-ai/sdk';
import { logger } from '../utils/logger';
import { Agent, AgentType, AgentStatus } from '../types/Agent';
import { Task, TaskStatus } from '../types/Task';

export class ClaudeService {
  private anthropic: Anthropic;
  private initialized = false;

  constructor() {
    this.anthropic = new Anthropic({
      apiKey: process.env.CLAUDE_API_KEY,
    });
  }

  async initialize(): Promise<void> {
    if (!process.env.CLAUDE_API_KEY) {
      throw new Error('CLAUDE_API_KEY environment variable is required');
    }
    
    try {
      // Test the connection
      await this.anthropic.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Hello' }]
      });
      
      this.initialized = true;
      logger.info('Claude service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Claude service:', error);
      throw error;
    }
  }

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('Claude service not initialized');
    }
  }

  async processAgentTask(agent: Agent, task: Task): Promise<{
    response: string;
    actions: Array<{
      type: string;
      tool: string;
      parameters: Record<string, any>;
    }>;
    confidence: number;
  }> {
    this.ensureInitialized();

    const prompt = this.buildAgentPrompt(agent, task);
    
    try {
      const response = await this.anthropic.messages.create({
        model: this.selectModelForAgent(agent.type),
        max_tokens: 4000,
        temperature: 0.1,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      const content = response.content[0];
      if (content.type === 'text') {
        return this.parseAgentResponse(content.text);
      }
      
      throw new Error('Unexpected response format from Claude');
    } catch (error) {
      logger.error(`Error processing task for ${agent.type} agent:`, error);
      throw error;
    }
  }

  private buildAgentPrompt(agent: Agent, task: Task): string {
    const systemPrompts = {
      [AgentType.DEVOPS]: `You are a DevOps Engineer agent specialized in deployment, CI/CD, infrastructure management, and monitoring. 
You have access to tools like GitHub, AWS, Docker, Kubernetes, and monitoring platforms.
Your goal is to automate and optimize development operations.`,
      
      [AgentType.DATA_ANALYST]: `You are a Data Analyst agent specialized in processing metrics, generating insights, and creating reports.
You have access to analytics tools, databases, and reporting platforms.
Your goal is to provide actionable business intelligence.`,
      
      [AgentType.CUSTOMER_SUPPORT]: `You are a Customer Support agent specialized in handling inquiries, tickets, and user communication.
You have access to support platforms, email systems, and communication tools.
Your goal is to provide excellent customer service and resolve issues efficiently.`,
      
      [AgentType.MARKETING]: `You are a Marketing Manager agent specialized in campaign management, content creation, and social media.
You have access to marketing platforms, social media tools, and analytics.
Your goal is to drive growth and engagement.`,
      
      [AgentType.SECURITY]: `You are a Security Specialist agent specialized in threat monitoring, access management, and compliance.
You have access to security tools, monitoring systems, and compliance platforms.
Your goal is to maintain security and ensure compliance.`,
      
      [AgentType.AI_COORDINATOR]: `You are an AI Coordinator agent specialized in orchestrating other agents and optimizing workflows.
You have access to all tools and can coordinate between different agents.
Your goal is to optimize resource allocation and workflow efficiency.`
    };

    return `${systemPrompts[agent.type]}

**Current Task:**
Title: ${task.title}
Description: ${task.description}
Priority: ${task.priority}
Deadline: ${task.deadline || 'Not specified'}

**Instructions:**
1. Analyze the task and determine the best approach
2. Identify which tools/integrations are needed
3. Provide a step-by-step action plan
4. Format your response as JSON with the following structure:

{
  "response": "Your analysis and reasoning here",
  "actions": [
    {
      "type": "tool_execution",
      "tool": "tool_name",
      "parameters": {
        "key": "value"
      }
    }
  ],
  "confidence": 0.95
}

Be specific about tool parameters and provide clear reasoning for your decisions.`;
  }

  private selectModelForAgent(agentType: AgentType): string {
    // Use different Claude models based on agent complexity needs
    switch (agentType) {
      case AgentType.AI_COORDINATOR:
      case AgentType.SECURITY:
        return 'claude-3-5-sonnet-20241022'; // Most sophisticated for complex reasoning
      case AgentType.DEVOPS:
      case AgentType.DATA_ANALYST:
        return 'claude-3-5-sonnet-20241022'; // Good for technical tasks
      default:
        return 'claude-3-haiku-20240307'; // Faster for simpler tasks
    }
  }

  private parseAgentResponse(response: string): {
    response: string;
    actions: Array<{
      type: string;
      tool: string;
      parameters: Record<string, any>;
    }>;
    confidence: number;
  } {
    try {
      // Try to extract JSON from the response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          response: parsed.response || response,
          actions: parsed.actions || [],
          confidence: parsed.confidence || 0.8
        };
      }
    } catch (error) {
      logger.warn('Failed to parse Claude response as JSON, using fallback:', error);
    }

    // Fallback for non-JSON responses
    return {
      response: response,
      actions: [],
      confidence: 0.5
    };
  }

  async generateAgentPersonality(agentType: AgentType): Promise<string> {
    this.ensureInitialized();
    
    const prompt = `Generate a brief, professional personality description for a ${agentType} AI agent that will be part of an automated business operations platform. 
The description should be 2-3 sentences and capture the agent's key characteristics and working style.`;
    
    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 150,
        messages: [{ role: 'user', content: prompt }]
      });

      const content = response.content[0];
      if (content.type === 'text') {
        return content.text.trim();
      }
      
      return `Professional ${agentType} agent focused on efficiency and results.`;
    } catch (error) {
      logger.error('Error generating agent personality:', error);
      return `Professional ${agentType} agent focused on efficiency and results.`;
    }
  }
}