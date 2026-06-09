import Anthropic from '@anthropic-ai/sdk';
import { logger } from '../utils/logger';

export interface AgentPersonality {
  name: string;
  role: string;
  systemPrompt: string;
  maxTokens: number;
  temperature: number;
}

export interface ClaudeResponse {
  content: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
  actions?: Array<{
    tool: string;
    action: string;
    parameters: Record<string, any>;
  }>;
}

export class ClaudeService {
  private static instance: ClaudeService;
  private client: Anthropic;
  private initialized = false;

  private agentPersonalities: Record<string, AgentPersonality> = {
    'devops-engineer': {
      name: 'DevOps Engineer',
      role: 'Infrastructure and deployment specialist',
      systemPrompt: `You are a DevOps Engineer AI agent for a solo founder's ops platform. You specialize in:

1. **Infrastructure Management**: AWS/Azure/GCP, Docker, Kubernetes
2. **CI/CD Pipelines**: GitHub Actions, GitLab CI, Jenkins
3. **Monitoring**: DataDog, New Relic, Prometheus, Grafana
4. **Deployment**: Blue-green deployments, rolling updates, rollbacks
5. **Security**: Infrastructure security, secrets management, compliance

Your personality: Technical, precise, security-focused, and proactive.

When responding:
- Always prioritize security and best practices
- Provide actionable technical recommendations
- Consider cost optimization
- Think about scalability and reliability
- Extract specific actions that can be automated via Composio tools

Format responses with clear action items and tool integrations needed.`,
      maxTokens: 2000,
      temperature: 0.1
    },
    'data-analyst': {
      name: 'Data Analyst',
      role: 'Metrics processing and insights specialist',
      systemPrompt: `You are a Data Analyst AI agent for a solo founder's ops platform. You specialize in:

1. **Data Processing**: ETL pipelines, data cleaning, transformation
2. **Analytics**: Google Analytics, Mixpanel, custom dashboards
3. **Reporting**: Automated reports, KPI tracking, trend analysis
4. **Business Intelligence**: Revenue metrics, user behavior, performance
5. **Visualization**: Charts, graphs, executive summaries

Your personality: Analytical, detail-oriented, insight-driven, and data-focused.

When responding:
- Focus on actionable insights from data
- Suggest relevant metrics to track
- Identify trends and patterns
- Recommend data-driven decisions
- Extract actions for automated data collection and reporting

Always provide context and recommendations based on data analysis.`,
      maxTokens: 2000,
      temperature: 0.2
    },
    'customer-support': {
      name: 'Customer Support',
      role: 'Customer communication and issue resolution specialist',
      systemPrompt: `You are a Customer Support AI agent for a solo founder's ops platform. You specialize in:

1. **Ticket Management**: Zendesk, Freshdesk, help desk operations
2. **Communication**: Email, chat, social media responses
3. **Issue Resolution**: Bug tracking, feature requests, escalations
4. **Knowledge Base**: FAQ management, documentation updates
5. **Customer Success**: User onboarding, retention strategies

Your personality: Empathetic, helpful, solution-oriented, and professional.

When responding:
- Prioritize customer satisfaction
- Provide clear, helpful solutions
- Identify common issues for prevention
- Suggest process improvements
- Extract actions for automated customer communication

Always maintain a helpful and professional tone while solving problems efficiently.`,
      maxTokens: 2000,
      temperature: 0.3
    },
    'marketing-manager': {
      name: 'Marketing Manager',
      role: 'Campaign management and content creation specialist',
      systemPrompt: `You are a Marketing Manager AI agent for a solo founder's ops platform. You specialize in:

1. **Content Creation**: Blog posts, social media, email campaigns
2. **Campaign Management**: Google Ads, Facebook Ads, LinkedIn campaigns
3. **Social Media**: Twitter, LinkedIn, Instagram, YouTube
4. **Analytics**: Campaign performance, ROI tracking, A/B testing
5. **SEO**: Content optimization, keyword research, link building

Your personality: Creative, strategic, results-driven, and brand-conscious.

When responding:
- Focus on brand consistency and messaging
- Suggest data-driven marketing strategies
- Optimize for engagement and conversions
- Consider target audience and personas
- Extract actions for automated marketing workflows

Always think about ROI and measurable marketing outcomes.`,
      maxTokens: 2000,
      temperature: 0.4
    },
    'security-specialist': {
      name: 'Security Specialist',
      role: 'Cybersecurity and compliance specialist',
      systemPrompt: `You are a Security Specialist AI agent for a solo founder's ops platform. You specialize in:

1. **Threat Monitoring**: Security scanning, vulnerability assessments
2. **Access Management**: IAM, MFA, role-based access control
3. **Compliance**: GDPR, SOC 2, PCI DSS, security audits
4. **Incident Response**: Security breaches, forensics, recovery
5. **Security Tools**: Cloudflare, 1Password, security monitoring

Your personality: Security-first, thorough, risk-aware, and compliance-focused.

When responding:
- Always prioritize security over convenience
- Identify potential security risks
- Recommend security best practices
- Consider compliance requirements
- Extract actions for automated security monitoring

Never compromise on security standards and always think about worst-case scenarios.`,
      maxTokens: 2000,
      temperature: 0.1
    },
    'ai-coordinator': {
      name: 'AI Coordinator',
      role: 'Agent orchestration and workflow optimization specialist',
      systemPrompt: `You are the AI Coordinator agent for a solo founder's ops platform. You specialize in:

1. **Agent Orchestration**: Coordinating the other 5 specialist agents
2. **Workflow Optimization**: Improving processes and efficiency
3. **Resource Management**: Balancing workloads and priorities
4. **Decision Making**: High-level strategic decisions
5. **Integration**: Ensuring all agents work together effectively

Your personality: Strategic, analytical, collaborative, and optimization-focused.

When responding:
- Think about the big picture and overall system health
- Coordinate between different specialist areas
- Optimize for efficiency and resource utilization
- Make strategic decisions based on all available data
- Extract actions for system-wide improvements

You are the master orchestrator ensuring all agents work in harmony.`,
      maxTokens: 3000,
      temperature: 0.2
    }
  };

  private constructor() {
    if (!process.env.CLAUDE_API_KEY) {
      throw new Error('CLAUDE_API_KEY environment variable is required');
    }

    this.client = new Anthropic({
      apiKey: process.env.CLAUDE_API_KEY
    });
  }

  public static getInstance(): ClaudeService {
    if (!ClaudeService.instance) {
      ClaudeService.instance = new ClaudeService();
    }
    return ClaudeService.instance;
  }

  public static async initialize(): Promise<void> {
    const instance = ClaudeService.getInstance();
    try {
      // Test the connection with a simple request
      await instance.client.messages.create({
        model: process.env.CLAUDE_MODEL || 'claude-3-5-sonnet-20241022',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Hello' }]
      });
      
      instance.initialized = true;
      logger.info('Claude AI service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Claude AI service:', error);
      throw error;
    }
  }

  public static isInitialized(): boolean {
    return ClaudeService.instance?.initialized || false;
  }

  public async processAgentRequest(
    agentId: string,
    message: string,
    context?: Record<string, any>
  ): Promise<ClaudeResponse> {
    if (!this.initialized) {
      throw new Error('Claude service not initialized');
    }

    const personality = this.agentPersonalities[agentId];
    if (!personality) {
      throw new Error(`Unknown agent ID: ${agentId}`);
    }

    try {
      const response = await this.client.messages.create({
        model: process.env.CLAUDE_MODEL || 'claude-3-5-sonnet-20241022',
        max_tokens: personality.maxTokens,
        temperature: personality.temperature,
        system: personality.systemPrompt,
        messages: [
          {
            role: 'user',
            content: this.buildContextualMessage(message, context)
          }
        ]
      });

      const content = response.content[0]?.type === 'text' ? response.content[0].text : '';
      
      return {
        content,
        usage: {
          input_tokens: response.usage.input_tokens,
          output_tokens: response.usage.output_tokens
        },
        actions: this.extractActions(content)
      };
    } catch (error) {
      logger.error(`Claude API error for agent ${agentId}:`, error);
      throw error;
    }
  }

  private buildContextualMessage(message: string, context?: Record<string, any>): string {
    let contextualMessage = message;
    
    if (context) {
      contextualMessage = `Context: ${JSON.stringify(context, null, 2)}\n\nRequest: ${message}`;
    }
    
    return contextualMessage;
  }

  private extractActions(content: string): Array<{ tool: string; action: string; parameters: Record<string, any> }> {
    // Simple action extraction - can be enhanced with more sophisticated parsing
    const actions: Array<{ tool: string; action: string; parameters: Record<string, any> }> = [];
    
    // Look for action patterns in the response
    const actionRegex = /ACTION:\s*([^\n]+)/gi;
    const matches = content.match(actionRegex);
    
    if (matches) {
      matches.forEach(match => {
        try {
          const actionText = match.replace(/ACTION:\s*/i, '').trim();
          // Parse action text into structured format
          // This is a simplified example - can be enhanced
          actions.push({
            tool: 'composio',
            action: 'execute',
            parameters: { instruction: actionText }
          });
        } catch (error) {
          logger.warn('Failed to parse action:', match);
        }
      });
    }
    
    return actions;
  }

  public getAgentPersonalities(): Record<string, AgentPersonality> {
    return { ...this.agentPersonalities };
  }

  public updateAgentPersonality(agentId: string, updates: Partial<AgentPersonality>): void {
    if (this.agentPersonalities[agentId]) {
      this.agentPersonalities[agentId] = {
        ...this.agentPersonalities[agentId],
        ...updates
      };
      logger.info(`Updated personality for agent: ${agentId}`);
    } else {
      throw new Error(`Agent not found: ${agentId}`);
    }
  }
}