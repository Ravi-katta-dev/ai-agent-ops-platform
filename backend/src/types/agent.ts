export type AgentType = 
  | 'devops-engineer'
  | 'data-analyst'
  | 'customer-support'
  | 'marketing-manager'
  | 'security-specialist'
  | 'ai-coordinator';

export type AgentStatus = 'active' | 'idle' | 'working';

export interface AgentPersonality {
  name: string;
  role: string;
  expertise: string[];
  personality: string;
  communication: string;
  tools: string[];
}

export interface Agent {
  id: string;
  type: AgentType;
  name: string;
  description: string;
  status: AgentStatus;
  tasksCompleted: number;
  efficiency: number;
  lastActive: Date;
  conversationId?: string;
  color: string;
}

export interface AgentTask {
  id: string;
  agentId: string;
  agentType: AgentType;
  title: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  estimatedDuration?: number;
  actualDuration?: number;
  result?: string;
  tools?: string[];
}

export interface AgentConversation {
  id: string;
  agentId: string;
  agentType: AgentType;
  messages: {
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    tokenUsage?: {
      input: number;
      output: number;
    };
  }[];
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}

export interface AgentMetrics {
  agentId: string;
  agentType: AgentType;
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  averageCompletionTime: number;
  efficiencyScore: number;
  totalTokensUsed: number;
  lastActive: Date;
  uptime: number;
}