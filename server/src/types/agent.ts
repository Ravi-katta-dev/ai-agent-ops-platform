export interface Agent {
  id: string;
  name: string;
  type: AgentType;
  description: string;
  status: AgentStatus;
  tasksCompleted: number;
  efficiency: number;
  lastActive: Date;
  currentTask?: Task;
  capabilities: string[];
  tools: string[];
  config: AgentConfig;
}

export type AgentType = 
  | 'devops-engineer'
  | 'data-analyst'
  | 'customer-support'
  | 'marketing-manager'
  | 'security-specialist'
  | 'ai-coordinator';

export type AgentStatus = 'active' | 'idle' | 'working' | 'error' | 'offline';

export interface Task {
  id: string;
  agentId: string;
  type: string;
  priority: TaskPriority;
  status: TaskStatus;
  description: string;
  input: any;
  output?: any;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  estimatedDuration?: number;
  actualDuration?: number;
}

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';

export interface AgentConfig {
  maxConcurrentTasks: number;
  timeoutMs: number;
  retryAttempts: number;
  claudeModel: string;
  claudeMaxTokens: number;
  composioTools: string[];
  customPrompts: Record<string, string>;
}

export interface AgentMetrics {
  agentId: string;
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  averageResponseTime: number;
  efficiency: number;
  uptime: number;
  lastActive: Date;
}

export interface WorkflowStep {
  id: string;
  name: string;
  agentType: AgentType;
  action: string;
  input: any;
  dependencies?: string[];
  timeout?: number;
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
  status: 'draft' | 'active' | 'paused' | 'completed' | 'failed';
  createdAt: Date;
  updatedAt: Date;
}