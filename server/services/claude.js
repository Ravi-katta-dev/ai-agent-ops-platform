/**
 * Claude AI Service
 * Integration with Anthropic's Claude API for AI agent intelligence
 */

const Anthropic = require('@anthropic-ai/sdk');

class ClaudeService {
  constructor() {
    this.client = null;
    this.isInitialized = false;
    this.config = {
      apiKey: process.env.CLAUDE_API_KEY,
      model: process.env.CLAUDE_MODEL || 'claude-3-5-sonnet-20241022',
      maxTokens: parseInt(process.env.CLAUDE_MAX_TOKENS) || 4096,
      temperature: parseFloat(process.env.CLAUDE_TEMPERATURE) || 0.7
    };
  }

  /**
   * Initialize Claude AI client
   */
  async initialize() {
    if (this.isInitialized) {
      return;
    }

    if (!this.config.apiKey) {
      throw new Error('CLAUDE_API_KEY is required');
    }

    try {
      this.client = new Anthropic({
        apiKey: this.config.apiKey
      });

      // Test connection
      await this.testConnection();
      
      this.isInitialized = true;
      console.log('🧠 Claude AI service initialized successfully');
      
    } catch (error) {
      console.error('❌ Failed to initialize Claude AI:', error);
      throw error;
    }
  }

  /**
   * Test Claude API connection
   */
  async testConnection() {
    try {
      const response = await this.client.messages.create({
        model: this.config.model,
        max_tokens: 50,
        messages: [{
          role: 'user',
          content: 'Hello, please respond with "Claude AI connected successfully"'
        }]
      });
      
      if (response?.content?.[0]?.text) {
        console.log('✅ Claude AI connection test passed');
        return true;
      }
      
      throw new Error('Invalid response from Claude API');
      
    } catch (error) {
      console.error('❌ Claude AI connection test failed:', error);
      throw error;
    }
  }

  /**
   * Send message to Claude AI for agent processing
   */
  async sendMessage({ agentType, prompt, context = null, systemPrompt = null }) {
    if (!this.isInitialized) {
      throw new Error('Claude service not initialized');
    }

    try {
      const messages = [];
      
      if (context) {
        messages.push({
          role: 'user',
          content: `Context: ${JSON.stringify(context)}`
        });
      }
      
      messages.push({
        role: 'user',
        content: prompt
      });

      const response = await this.client.messages.create({
        model: this.config.model,
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
        system: systemPrompt || this.getAgentSystemPrompt(agentType),
        messages
      });

      return {
        success: true,
        content: response.content[0]?.text,
        usage: response.usage,
        model: response.model,
        agentType,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error(`❌ Claude AI request failed for ${agentType}:`, error);
      return {
        success: false,
        error: error.message,
        agentType,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get system prompt for specific agent type
   */
  getAgentSystemPrompt(agentType) {
    const prompts = {
      'devops': `You are a DevOps Engineer AI agent. You specialize in:
- CI/CD pipeline management
- Infrastructure monitoring and optimization
- Deployment automation
- Container orchestration
- Cloud infrastructure management
- System reliability and performance

Provide concise, actionable responses with specific technical recommendations.`,

      'data-analyst': `You are a Data Analyst AI agent. You specialize in:
- Data processing and analysis
- Report generation and insights
- Metrics interpretation
- Dashboard creation
- Performance analytics
- Business intelligence

Provide data-driven insights with clear visualizations and recommendations.`,

      'customer-support': `You are a Customer Support AI agent. You specialize in:
- Customer inquiry handling
- Ticket management and routing
- Problem resolution
- Communication management
- User experience optimization
- Support workflow automation

Provide helpful, empathetic responses with clear solutions.`,

      'marketing': `You are a Marketing Manager AI agent. You specialize in:
- Campaign planning and execution
- Content creation and optimization
- Social media management
- Lead generation
- Brand management
- Performance marketing

Provide creative, strategic recommendations with measurable outcomes.`,

      'security': `You are a Security Specialist AI agent. You specialize in:
- Threat detection and analysis
- Security compliance monitoring
- Access control management
- Vulnerability assessment
- Incident response
- Risk management

Provide security-focused recommendations with risk assessments.`,

      'ai-coordinator': `You are an AI Coordinator agent. You specialize in:
- Agent workflow orchestration
- Resource optimization
- Task prioritization and routing
- Inter-agent coordination
- Performance monitoring
- System optimization

Provide strategic coordination decisions with system-wide perspective.`
    };

    return prompts[agentType] || prompts['ai-coordinator'];
  }

  /**
   * Check if Claude service is healthy
   */
  async isHealthy() {
    try {
      if (!this.isInitialized) {
        return false;
      }
      
      await this.testConnection();
      return true;
      
    } catch (error) {
      console.error('❌ Claude health check failed:', error);
      return false;
    }
  }

  /**
   * Shutdown Claude service
   */
  async shutdown() {
    console.log('🧠 Shutting down Claude AI service...');
    this.client = null;
    this.isInitialized = false;
  }
}

module.exports = new ClaudeService();