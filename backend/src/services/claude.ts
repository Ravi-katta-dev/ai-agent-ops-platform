import Anthropic from '@anthropic-ai/sdk';
import { logger } from '../utils/logger';

interface AgentPrompt {
  role: string;
  context: string;
  instructions: string;
  tools?: string[];
}

interface ClaudeResponse {
  content: string;
  actions?: any[];
  reasoning?: string;
}

class ClaudeService {
  private client: Anthropic;
  private maxTokens: number = 4000;
  
  constructor() {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY environment variable is required');
    }
    
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }
  
  /**
   * Generate response for a specific agent
   */
  async generateAgentResponse(
    agentType: string,
    userMessage: string,
    context?: any
  ): Promise<ClaudeResponse> {
    try {
      const prompt = this.buildAgentPrompt(agentType, userMessage, context);
      
      const response = await this.client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: this.maxTokens,
        messages: [{ role: 'user', content: prompt }],
      });
      
      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type from Claude');
      }
      
      return this.parseResponse(content.text);
    } catch (error) {
      logger.error(`Claude API error for agent ${agentType}:`, error);
      throw error;
    }
  }
  
  /**
   * Build specialized prompts for each agent type
   */
  private buildAgentPrompt(agentType: string, userMessage: string, context?: any): string {
    const agentPrompts: Record<string, AgentPrompt> = {
      'devops': {
        role: 'DevOps Engineer',
        context: 'You are a specialized DevOps agent responsible for managing deployments, CI/CD pipelines, infrastructure, and monitoring.',
        instructions: 'Analyze the request and provide actionable DevOps solutions. Focus on automation, scalability, and reliability. Always consider security and best practices.',
        tools: ['github', 'docker', 'kubernetes', 'aws', 'terraform']
      },
      'data-analyst': {
        role: 'Data Analyst',
        context: 'You are a specialized Data Analyst agent responsible for processing metrics, generating insights, and creating reports.',
        instructions: 'Analyze data requests and provide clear insights with actionable recommendations. Use data visualization and statistical analysis when appropriate.',
        tools: ['googlesheets', 'tableau', 'python', 'sql', 'jupyter']
      },
      'customer-support': {
        role: 'Customer Support Specialist',
        context: 'You are a specialized Customer Support agent responsible for handling inquiries, tickets, and user communication.',
        instructions: 'Provide helpful, empathetic customer support responses. Escalate complex issues and always prioritize customer satisfaction.',
        tools: ['slack', 'zendesk', 'intercom', 'gmail', 'calendly']
      },
      'marketing': {
        role: 'Marketing Manager',
        context: 'You are a specialized Marketing agent responsible for managing campaigns, content creation, and social media.',
        instructions: 'Create engaging marketing strategies and content. Focus on brand consistency, audience engagement, and measurable results.',
        tools: ['twitter', 'linkedin', 'mailchimp', 'hubspot', 'canva']
      },
      'security': {
        role: 'Security Specialist',
        context: 'You are a specialized Security agent responsible for monitoring threats, managing access, and ensuring compliance.',
        instructions: 'Assess security risks and provide comprehensive security recommendations. Always prioritize data protection and compliance requirements.',
        tools: ['1password', 'cloudflare', 'aws-iam', 'okta', 'splunk']
      },
      'ai-coordinator': {
        role: 'AI Coordinator',
        context: 'You are the AI Coordinator responsible for orchestrating other agents, optimizing workflows, and managing resources.',
        instructions: 'Coordinate between different agents, optimize task allocation, and ensure efficient workflow execution. Think strategically about resource utilization.',
        tools: ['all-agents', 'workflow-engine', 'analytics', 'scheduling']
      }
    };
    
    const agentConfig = agentPrompts[agentType] || agentPrompts['ai-coordinator'];
    
    return `You are ${agentConfig.role}.

${agentConfig.context}

${agentConfig.instructions}

Available tools: ${agentConfig.tools?.join(', ') || 'various automation tools'}

User Request: ${userMessage}

${context ? `Context: ${JSON.stringify(context, null, 2)}` : ''}

Please provide:
1. Analysis of the request
2. Recommended actions
3. Specific tool usage if applicable
4. Any potential risks or considerations

Respond in a structured format with clear action items.`;
  }
  
  /**
   * Parse Claude response and extract actions
   */
  private parseResponse(content: string): ClaudeResponse {
    // Try to extract structured information from the response
    const actionMatches = content.match(/(?:Action|TODO|Step)\s*\d*:?\s*(.+)/gi);
    const actions = actionMatches?.map(match => {
      return {
        type: 'action',
        description: match.replace(/(?:Action|TODO|Step)\s*\d*:?\s*/i, '').trim()
      };
    }) || [];
    
    return {
      content,
      actions,
      reasoning: this.extractReasoning(content)
    };
  }
  
  /**
   * Extract reasoning from Claude response
   */
  private extractReasoning(content: string): string {
    const reasoningMatch = content.match(/(?:Analysis|Reasoning|Rationale):?\s*([\s\S]+?)(?:\n\n|$)/i);
    return reasoningMatch?.[1]?.trim() || '';
  }
  
  /**
   * Generate task summary using Claude
   */
  async generateTaskSummary(tasks: any[]): Promise<string> {
    try {
      const prompt = `Please provide a brief summary of the following tasks:

${JSON.stringify(tasks, null, 2)}

Provide a concise overview highlighting key achievements, pending items, and any important insights.`;
      
      const response = await this.client.messages.create({
        model: 'claude-3-haiku-20240307', // Use faster model for summaries
        max_tokens: 500,
        messages: [{ role: 'user', content: prompt }],
      });
      
      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type from Claude');
      }
      
      return content.text;
    } catch (error) {
      logger.error('Claude API error for task summary:', error);
      throw error;
    }
  }
}

export const claudeService = new ClaudeService();
export { ClaudeResponse, AgentPrompt };