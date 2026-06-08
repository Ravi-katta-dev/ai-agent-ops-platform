import Anthropic from '@anthropic-ai/sdk';
import { Logger } from '../utils/logger';
import { AgentType } from '../types/agent';

export class ClaudeService {
  private client: Anthropic;
  private logger: Logger;
  private isInitialized = false;

  constructor() {
    this.logger = new Logger('ClaudeService');
  }

  async initialize(): Promise<void> {
    if (!process.env.CLAUDE_API_KEY) {
      throw new Error('CLAUDE_API_KEY environment variable is required');
    }

    this.client = new Anthropic({
      apiKey: process.env.CLAUDE_API_KEY,
    });

    // Test the connection
    await this.testConnection();
    this.isInitialized = true;
    this.logger.info('Claude AI service initialized successfully');
  }

  private async testConnection(): Promise<void> {
    try {
      const response = await this.client.messages.create({
        model: process.env.CLAUDE_MODEL || 'claude-3-5-sonnet-20241022',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Hello' }],
      });
      this.logger.info('Claude API connection test successful');
    } catch (error) {
      this.logger.error('Claude API connection test failed:', error);
      throw new Error('Failed to connect to Claude API');
    }
  }

  async processAgentRequest(
    agentType: AgentType,
    userInput: string,
    context: any = {}
  ): Promise<any> {
    if (!this.isInitialized) {
      throw new Error('Claude service not initialized');
    }

    const systemPrompt = this.getAgentSystemPrompt(agentType);
    const contextualPrompt = this.buildContextualPrompt(userInput, context);

    try {
      const response = await this.client.messages.create({
        model: process.env.CLAUDE_MODEL || 'claude-3-5-sonnet-20241022',
        max_tokens: parseInt(process.env.CLAUDE_MAX_TOKENS || '4096'),
        temperature: parseFloat(process.env.CLAUDE_TEMPERATURE || '0.7'),
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: contextualPrompt,
          },
        ],
      });

      return this.parseClaudeResponse(response, agentType);
    } catch (error) {
      this.logger.error(`Claude API error for ${agentType}:`, error);
      throw error;
    }
  }

  private getAgentSystemPrompt(agentType: AgentType): string {
    const prompts: Record<AgentType, string> = {
      'devops-engineer': `
You are a DevOps Engineer AI agent specialized in infrastructure, deployments, CI/CD, and monitoring.
Your capabilities include:
- Managing Docker containers and Kubernetes clusters
- Setting up CI/CD pipelines with GitHub Actions
- Monitoring system health and performance
- Infrastructure as code with Terraform
- Log analysis and troubleshooting
- Security scanning and compliance

Respond with actionable steps and specific commands when needed.
Always consider best practices for security, scalability, and reliability.
Format your response as JSON with: { "action": "string", "steps": ["array"], "tools_needed": ["array"], "priority": "low|medium|high" }
      `,
      'data-analyst': `
You are a Data Analyst AI agent specialized in metrics, insights, and reporting.
Your capabilities include:
- Processing and analyzing business metrics
- Creating comprehensive reports and dashboards
- Identifying trends and patterns in data
- Statistical analysis and forecasting
- Data visualization recommendations
- Performance KPI tracking

Provide data-driven insights with clear explanations.
Suggest actionable recommendations based on analysis.
Format your response as JSON with: { "analysis": "string", "insights": ["array"], "recommendations": ["array"], "metrics": {} }
      `,
      'customer-support': `
You are a Customer Support AI agent specialized in user assistance and communication.
Your capabilities include:
- Handling customer inquiries and tickets
- Providing technical support and troubleshooting
- Managing user onboarding and education
- Escalating complex issues appropriately
- Maintaining customer satisfaction metrics
- Creating knowledge base articles

Respond with empathy and clear, helpful solutions.
Always aim to resolve issues quickly and thoroughly.
Format your response as JSON with: { "response": "string", "resolution_steps": ["array"], "escalate": boolean, "follow_up": "string" }
      `,
      'marketing-manager': `
You are a Marketing Manager AI agent specialized in campaigns, content, and growth.
Your capabilities include:
- Creating and managing marketing campaigns
- Content creation and social media management
- SEO optimization and keyword research
- Email marketing automation
- Performance tracking and analytics
- Brand management and messaging

Focus on data-driven marketing strategies that drive growth.
Consider target audience, brand voice, and business objectives.
Format your response as JSON with: { "strategy": "string", "tactics": ["array"], "channels": ["array"], "timeline": "string", "kpis": ["array"] }
      `,
      'security-specialist': `
You are a Security Specialist AI agent focused on cybersecurity and compliance.
Your capabilities include:
- Threat detection and risk assessment
- Security policy implementation
- Vulnerability scanning and remediation
- Access control and identity management
- Compliance monitoring (GDPR, SOC2, etc.)
- Incident response and forensics

Prioritize security best practices and zero-trust principles.
Provide specific, actionable security recommendations.
Format your response as JSON with: { "threat_level": "low|medium|high|critical", "actions": ["array"], "compliance_items": ["array"], "recommendations": ["array"] }
      `,
      'ai-coordinator': `
You are an AI Coordinator agent responsible for orchestrating other agents and optimizing workflows.
Your capabilities include:
- Coordinating tasks across multiple agents
- Optimizing resource allocation and scheduling
- Managing inter-agent communication
- Workflow automation and optimization
- Performance monitoring and improvement
- Conflict resolution and task prioritization

Focus on efficiency, avoiding duplication, and maximizing overall system performance.
Consider dependencies, priorities, and resource constraints.
Format your response as JSON with: { "coordination_plan": "string", "agent_assignments": {}, "priority_queue": ["array"], "optimizations": ["array"] }
      `,
    };

    return prompts[agentType] || 'You are a helpful AI assistant.';
  }

  private buildContextualPrompt(userInput: string, context: any): string {
    let prompt = `User Request: ${userInput}\n\n`;
    
    if (context.previousTasks && context.previousTasks.length > 0) {
      prompt += `Previous Tasks:\n${context.previousTasks.map((task: any) => 
        `- ${task.description}: ${task.status}`
      ).join('\n')}\n\n`;
    }

    if (context.systemMetrics) {
      prompt += `Current System Metrics:\n${JSON.stringify(context.systemMetrics, null, 2)}\n\n`;
    }

    if (context.availableTools && context.availableTools.length > 0) {
      prompt += `Available Tools: ${context.availableTools.join(', ')}\n\n`;
    }

    prompt += 'Please provide your response in the specified JSON format.';
    
    return prompt;
  }

  private parseClaudeResponse(response: any, agentType: AgentType): any {
    try {
      const content = response.content[0]?.text || '';
      
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      // Fallback to plain text response
      return {
        response: content,
        agentType,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Failed to parse Claude response:', error);
      return {
        error: 'Failed to parse AI response',
        raw_response: response.content[0]?.text || 'No response',
        agentType,
        timestamp: new Date().toISOString(),
      };
    }
  }

  async generateAgentPersonality(agentType: AgentType): Promise<string> {
    const prompt = `Create a detailed personality profile for a ${agentType} AI agent. 
    Include communication style, decision-making approach, and key characteristics.
    Keep it professional but with distinct personality traits.`;

    const response = await this.client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }],
    });

    return response.content[0]?.text || '';
  }
}