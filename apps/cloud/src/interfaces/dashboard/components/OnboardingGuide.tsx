import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { ArrowRight, CheckCircle2, Circle, Rocket, Settings, ShieldCheck } from 'lucide-react'
import { api } from '../lib/api'

interface ChecklistItem {
  id: string
  label: string
  description: string
  icon: React.ReactNode
  completed: boolean
  action?: { label: string; to: string }
}

export function OnboardingGuide() {
  const navigate = useNavigate()

  const { data: doctor } = useQuery({
    queryKey: ['doctor'],
    queryFn: () => api.doctor(),
    staleTime: 30_000,
  })

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.settings.get(),
    staleTime: 30_000,
  })

  const { data: deployments } = useQuery({
    queryKey: ['deployments'],
    queryFn: () => api.deployments.list(),
    staleTime: 10_000,
  })

  const hasProvider = (settings as any)?.providers?.length > 0
  const doctorPassing = doctor?.checks?.every((c: any) => c.status === 'pass') ?? false
  const hasDeployment = (deployments ?? []).length > 0

  const checklist: ChecklistItem[] = [
    {
      id: 'doctor',
      label: 'System Requirements',
      description: 'Docker, kubectl, and other tools are installed',
      icon: <ShieldCheck size={16} />,
      completed: doctorPassing,
      action: { label: 'Run Doctor', to: '/doctor' },
    },
    {
      id: 'provider',
      label: 'Add an LLM Provider',
      description: 'Configure at least one AI model provider (OpenAI, Anthropic, etc.)',
      icon: <Settings size={16} />,
      completed: hasProvider,
      action: { label: 'Settings', to: '/settings' },
    },
    {
      id: 'deploy',
      label: 'Deploy Your First Agent',
      description: 'Browse the Agent Store and deploy a template',
      icon: <Rocket size={16} />,
      completed: hasDeployment,
      action: { label: 'Browse Store', to: '/store' },
    },
  ]

  const completedCount = checklist.filter((c) => c.completed).length

  return (
    <div className="bg-gradient-to-br from-gray-900 via-gray-900 to-blue-950/30 border border-gray-800 rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Rocket size={20} className="text-blue-400" />
            Welcome to Shadow Cloud
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            Get started in 3 steps — deploy your first AI agent team
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-blue-400">{completedCount}/3</div>
          <div className="text-[10px] text-gray-500 uppercase tracking-wider">Complete</div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1.5 bg-gray-800 rounded-full mb-6">
        <div
          className="h-full bg-blue-500 rounded-full transition-all duration-500"
          style={{ width: `${(completedCount / 3) * 100}%` }}
        />
      </div>

      <div className="space-y-3">
        {checklist.map((item, i) => (
          <div
            key={item.id}
            className={`flex items-center gap-3 p-3 rounded-lg border ${
              item.completed
                ? 'border-green-900/50 bg-green-950/20'
                : 'border-gray-800 bg-gray-900/50 hover:border-gray-700'
            } transition-colors`}
          >
            <div className={item.completed ? 'text-green-400' : 'text-gray-600'}>
              {item.completed ? <CheckCircle2 size={18} /> : <Circle size={18} />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 font-mono">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span
                  className={`text-sm font-medium ${item.completed ? 'text-green-300 line-through' : 'text-gray-200'}`}
                >
                  {item.label}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5 ml-7">{item.description}</p>
            </div>
            {!item.completed && item.action && (
              <button
                onClick={() => navigate({ to: item.action!.to })}
                className="flex items-center gap-1 px-3 py-1.5 text-xs bg-blue-600/20 text-blue-400 rounded-md hover:bg-blue-600/30 whitespace-nowrap"
              >
                {item.action.label}
                <ArrowRight size={12} />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
