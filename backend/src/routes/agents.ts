import express from 'express';
import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

const router = express.Router();

// Mock agent data (will be replaced with database in Step 2D)
const mockAgents = [
  {
    id: '1',
    name: 'DevOps Engineer',
    type: 'devops',
    status: 'active',
    tasksCompleted: 23,
    efficiency: 94,
    description: 'Manages deployments, CI/CD, infrastructure, and monitoring',
    icon: 'Server',
    color: 'blue',
    lastActivity: new Date().toISOString(),
    currentTask: 'Monitoring deployment pipeline'
  },
  {
    id: '2', 
    name: 'Data Analyst',
    type: 'data_analyst',
    status: 'working',
    tasksCompleted: 18,
    efficiency: 87,
    description: 'Processes metrics, generates insights, and creates reports',
    icon: 'BarChart3',
    color: 'green',
    lastActivity: new Date().toISOString(),
    currentTask: 'Generating weekly analytics report'
  },
  {
    id: '3',
    name: 'Customer Support',
    type: 'customer_support', 
    status: 'idle',
    tasksCompleted: 31,
    efficiency: 96,
    description: 'Handles inquiries, tickets, and user communication',
    icon: 'MessageSquare',
    color: 'purple',
    lastActivity: new Date().toISOString(),
    currentTask: null
  },
  {
    id: '4',
    name: 'Marketing Manager',
    type: 'marketing',
    status: 'active',
    tasksCompleted: 15,
    efficiency: 82,
    description: 'Manages campaigns, content creation, and social media',
    icon: 'Megaphone', 
    color: 'orange',
    lastActivity: new Date().toISOString(),
    currentTask: 'Creating social media campaign'
  },
  {
    id: '5',
    name: 'Security Specialist',
    type: 'security',
    status: 'active',
    tasksCompleted: 12,
    efficiency: 98,
    description: 'Monitors threats, manages access, and ensures compliance',
    icon: 'Shield',
    color: 'red',
    lastActivity: new Date().toISOString(),
    currentTask: 'Security audit in progress'
  },
  {
    id: '6',
    name: 'AI Coordinator',
    type: 'ai_coordinator',
    status: 'working',
    tasksCompleted: 27,
    efficiency: 91,
    description: 'Orchestrates agents, optimizes workflows, and manages resources',
    icon: 'Brain',
    color: 'indigo',
    lastActivity: new Date().toISOString(),
    currentTask: 'Optimizing agent task distribution'
  }
];

// @desc    Get all agents with status and metrics
// @route   GET /api/agents
// @access  Public (will be Private later)
const getAllAgents = asyncHandler(async (req: Request, res: Response) => {
  logger.info('Fetching all agents');
  
  // Calculate summary statistics
  const totalAgents = mockAgents.length;
  const activeAgents = mockAgents.filter(agent => agent.status === 'active' || agent.status === 'working').length;
  const totalTasksCompleted = mockAgents.reduce((sum, agent) => sum + agent.tasksCompleted, 0);
  const averageEfficiency = Math.round(mockAgents.reduce((sum, agent) => sum + agent.efficiency, 0) / totalAgents);
  
  res.status(200).json({
    success: true,
    data: {
      agents: mockAgents,
      summary: {
        totalAgents,
        activeAgents,
        totalTasksCompleted,
        averageEfficiency,
        timestamp: new Date().toISOString()
      }
    }
  });
});

// @desc    Get specific agent by ID
// @route   GET /api/agents/:id
// @access  Public (will be Private later)
const getAgentById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  logger.info(`Fetching agent with ID: ${id}`);
  
  const agent = mockAgents.find(agent => agent.id === id);
  
  if (!agent) {
    res.status(404).json({
      success: false,
      message: `Agent with ID ${id} not found`
    });
    return;
  }
  
  // Add detailed information for individual agent
  const detailedAgent = {
    ...agent,
    capabilities: getAgentCapabilities(agent.type),
    recentTasks: getRecentTasks(agent.id),
    performance: getPerformanceMetrics(agent.id)
  };
  
  res.status(200).json({
    success: true,
    data: detailedAgent
  });
});

// @desc    Get agent tasks by agent ID
// @route   GET /api/agents/:id/tasks
// @access  Public (will be Private later)
const getAgentTasks = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  logger.info(`Fetching tasks for agent ID: ${id}`);
  
  const agent = mockAgents.find(agent => agent.id === id);
  
  if (!agent) {
    res.status(404).json({
      success: false,
      message: `Agent with ID ${id} not found`
    });
    return;
  }
  
  const tasks = getRecentTasks(id);
  
  res.status(200).json({
    success: true,
    data: {
      agentId: id,
      agentName: agent.name,
      tasks,
      totalTasks: tasks.length,
      completedTasks: tasks.filter(task => task.status === 'completed').length,
      pendingTasks: tasks.filter(task => task.status === 'pending').length,
      timestamp: new Date().toISOString()
    }
  });
});

// @desc    Update agent status (placeholder)
// @route   PUT /api/agents/:id/status
// @access  Private
const updateAgentStatus = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;
  
  logger.info(`Attempting to update agent ${id} status to: ${status}`);
  
  // TODO: Implement in Phase B with proper validation and database
  res.status(501).json({
    success: false,
    message: 'Agent status update not yet implemented',
    data: {
      note: 'This endpoint will be implemented in Phase B with database integration',
      requested_agent: id,
      requested_status: status,
      valid_statuses: ['active', 'idle', 'working', 'maintenance']
    }
  });
});

// Helper functions for mock data
function getAgentCapabilities(agentType: string): string[] {
  const capabilities: { [key: string]: string[] } = {
    devops: ['CI/CD Management', 'Infrastructure Monitoring', 'Deployment Automation', 'Security Scanning'],
    data_analyst: ['Data Processing', 'Report Generation', 'Metrics Analysis', 'Trend Prediction'],
    customer_support: ['Ticket Management', 'Email Automation', 'Chat Support', 'FAQ Generation'],
    marketing: ['Campaign Management', 'Content Creation', 'Social Media', 'Analytics Tracking'],
    security: ['Threat Detection', 'Access Management', 'Compliance Monitoring', 'Security Audits'],
    ai_coordinator: ['Task Distribution', 'Resource Optimization', 'Workflow Management', 'Performance Analytics']
  };
  
  return capabilities[agentType] || [];
}

function getRecentTasks(agentId: string) {
  // Mock recent tasks - will be replaced with database queries
  return [
    {
      id: `task_${agentId}_1`,
      title: 'Sample Task 1',
      status: 'completed',
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      completedAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString()
    },
    {
      id: `task_${agentId}_2`, 
      title: 'Sample Task 2',
      status: 'in_progress',
      createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      completedAt: null
    },
    {
      id: `task_${agentId}_3`,
      title: 'Sample Task 3',
      status: 'pending',
      createdAt: new Date().toISOString(),
      completedAt: null
    }
  ];
}

function getPerformanceMetrics(agentId: string) {
  return {
    tasksThisWeek: Math.floor(Math.random() * 20) + 5,
    averageTaskTime: Math.floor(Math.random() * 30) + 15, // minutes
    successRate: Math.floor(Math.random() * 10) + 90, // percentage
    lastWeekComparison: {
      tasks: Math.floor(Math.random() * 10) - 5,
      efficiency: Math.floor(Math.random() * 10) - 5
    }
  };
}

router.get('/', getAllAgents);
router.get('/:id', getAgentById);
router.get('/:id/tasks', getAgentTasks);
router.put('/:id/status', updateAgentStatus);

export default router;