import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain,
  Code,
  BarChart,
  Users,
  Mail,
  Shield,
  Cpu,
  Zap,
  Settings,
  Play,
  Pause,
  Activity
} from 'lucide-react';

interface Agent {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  status: 'active' | 'idle' | 'working';
  tasksCompleted: number;
  efficiency: number;
  color: string;
}

const agents: Agent[] = [
  {
    id: 'dev-ops',
    name: 'DevOps Engineer',
    description: 'Manages deployments, CI/CD, infrastructure, and monitoring',
    icon: <Code className="w-6 h-6" />,
    status: 'active',
    tasksCompleted: 47,
    efficiency: 94,
    color: 'from-blue-500 to-blue-600'
  },
  {
    id: 'data-analyst',
    name: 'Data Analyst',
    description: 'Processes metrics, generates insights, and creates reports',
    icon: <BarChart className="w-6 h-6" />,
    status: 'working',
    tasksCompleted: 32,
    efficiency: 89,
    color: 'from-green-500 to-green-600'
  },
  {
    id: 'customer-support',
    name: 'Customer Support',
    description: 'Handles inquiries, tickets, and user communication',
    icon: <Users className="w-6 h-6" />,
    status: 'active',
    tasksCompleted: 156,
    efficiency: 96,
    color: 'from-purple-500 to-purple-600'
  },
  {
    id: 'marketing',
    name: 'Marketing Manager',
    description: 'Manages campaigns, content creation, and social media',
    icon: <Mail className="w-6 h-6" />,
    status: 'idle',
    tasksCompleted: 28,
    efficiency: 87,
    color: 'from-pink-500 to-pink-600'
  },
  {
    id: 'security',
    name: 'Security Specialist',
    description: 'Monitors threats, manages access, and ensures compliance',
    icon: <Shield className="w-6 h-6" />,
    status: 'active',
    tasksCompleted: 23,
    efficiency: 98,
    color: 'from-red-500 to-red-600'
  },
  {
    id: 'ai-coordinator',
    name: 'AI Coordinator',
    description: 'Orchestrates agents, optimizes workflows, and manages resources',
    icon: <Brain className="w-6 h-6" />,
    status: 'working',
    tasksCompleted: 89,
    efficiency: 99,
    color: 'from-indigo-500 to-indigo-600'
  }
];

const StatusBadge: React.FC<{ status: Agent['status'] }> = ({ status }) => {
  const statusConfig = {
    active: { color: 'bg-green-500', text: 'Active', pulse: true },
    working: { color: 'bg-yellow-500', text: 'Working', pulse: true },
    idle: { color: 'bg-gray-500', text: 'Idle', pulse: false }
  };

  const config = statusConfig[status];

  return (
    <div className="flex items-center gap-2">
      <div className={`w-2 h-2 rounded-full ${config.color} ${config.pulse ? 'animate-pulse' : ''}`} />
      <span className="text-xs font-medium text-gray-600">{config.text}</span>
    </div>
  );
};

const AgentCard: React.FC<{ agent: Agent; index: number }> = ({ agent, index }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100"
    >
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className={`p-3 rounded-lg bg-gradient-to-r ${agent.color} text-white`}>
            {agent.icon}
          </div>
          <StatusBadge status={agent.status} />
        </div>

        <h3 className="font-bold text-gray-900 mb-2">{agent.name}</h3>
        <p className="text-gray-600 text-sm mb-4 leading-relaxed">{agent.description}</p>

        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-xs font-medium text-gray-500">Tasks Completed</span>
            <span className="font-bold text-gray-900">{agent.tasksCompleted}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-xs font-medium text-gray-500">Efficiency</span>
            <span className="font-bold text-gray-900">{agent.efficiency}%</span>
          </div>

          <div className="w-full bg-gray-200 rounded-full h-2">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${agent.efficiency}%` }}
              transition={{ delay: index * 0.1 + 0.5, duration: 1 }}
              className={`h-2 rounded-full bg-gradient-to-r ${agent.color}`}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const App: React.FC = () => {
  const [activeAgents] = useState(agents.filter(a => a.status === 'active' || a.status === 'working').length);
  const [totalTasks] = useState(agents.reduce((sum, agent) => sum + agent.tasksCompleted, 0));
  const [avgEfficiency] = useState(
    Math.round(agents.reduce((sum, agent) => sum + agent.efficiency, 0) / agents.length)
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg">
                <Cpu className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">AI Agent Ops Platform</h1>
                <p className="text-gray-600 text-sm">Six specialized agents handling everything</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="p-2 text-gray-600 hover:text-indigo-600 transition-colors"
              >
                <Settings className="w-5 h-5" />
              </motion.button>
              
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-sm font-medium text-gray-700">System Online</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Stats Overview */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl shadow-md p-6 border border-gray-100"
          >
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-r from-green-500 to-green-600 rounded-lg">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{activeAgents}</p>
                <p className="text-gray-600 text-sm">Active Agents</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-xl shadow-md p-6 border border-gray-100"
          >
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{totalTasks}</p>
                <p className="text-gray-600 text-sm">Tasks Completed</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-xl shadow-md p-6 border border-gray-100"
          >
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg">
                <BarChart className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{avgEfficiency}%</p>
                <p className="text-gray-600 text-sm">Avg Efficiency</p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Agents Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Your AI Agents</h2>
          <p className="text-gray-600">Specialized agents working 24/7 to grow your business</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {agents.map((agent, index) => (
            <AgentCard key={agent.id} agent={agent} index={index} />
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-center items-center">
            <p className="text-gray-400 text-sm">
              Powered by AI • Built for Solo Founders • Always Learning
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;