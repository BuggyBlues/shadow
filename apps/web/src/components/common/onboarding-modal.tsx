import { Bot, ChevronRight, Compass, Plus, Server, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from '@tanstack/react-router'

interface OnboardingStep {
  id: string
  icon: typeof Bot
  title: string
  description: string
  action?: {
    label: string
    route?: string
    onClick?: () => void
  }
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    icon: Server,
    title: '欢迎来到虾豆',
    description: '虾豆是一个 AI 驱动的社区协作平台。在这里，你可以创建社区、召唤 AI Buddy、开设店铺，让 AI 帮你打工！',
  },
  {
    id: 'buddy',
    icon: Bot,
    title: '什么是 Buddy？',
    description: 'Buddy 是你的 AI 助手。它们可以加入频道参与对话、写代码、审方案、生成内容。每个 Buddy 都有自己的专长领域。',
    action: {
      label: '创建我的第一个 Buddy',
      route: '/settings',
    },
  },
  {
    id: 'server',
    icon: Server,
    title: '创建你的社区',
    description: '创建一个服务器，邀请朋友加入，建立属于你们的社区。你可以创建多个频道来组织不同的话题。',
    action: {
      label: '创建服务器',
    },
  },
  {
    id: 'discover',
    icon: Compass,
    title: '探索发现',
    description: '浏览公开服务器，发现感兴趣的社区。加入其他社区，与更多人交流协作。',
    action: {
      label: '去探索',
      route: '/discover',
    },
  },
]

interface OnboardingModalProps {
  isOpen: boolean
  onClose: () => void
  onCreateServer?: () => void
}

export function OnboardingModal({ isOpen, onClose, onCreateServer }: OnboardingModalProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState(0)
  const [isVisible, setIsVisible] = useState(false)

  const step = ONBOARDING_STEPS[currentStep]
  const Icon = step.icon
  const isLastStep = currentStep === ONBOARDING_STEPS.length - 1
  const isFirstStep = currentStep === 0

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => setIsVisible(true), 10)
    } else {
      setIsVisible(false)
      setCurrentStep(0)
    }
  }, [isOpen])

  const handleNext = () => {
    if (isLastStep) {
      handleComplete()
    } else {
      setCurrentStep((prev) => prev + 1)
    }
  }

  const handleComplete = () => {
    localStorage.setItem('hasSeenOnboarding', 'true')
    onClose()
  }

  const handleSkip = () => {
    localStorage.setItem('hasSeenOnboarding', 'true')
    onClose()
  }

  const handleAction = () => {
    if (step.action?.route) {
      handleComplete()
      navigate({ to: step.action.route as never })
    } else if (step.action && step.id === 'server' && onCreateServer) {
      handleComplete()
      onCreateServer()
    } else {
      handleNext()
    }
  }

  if (!isOpen) return null

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-bg-primary/95 backdrop-blur-sm transition-opacity duration-300 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      {/* Close button */}
      <button
        onClick={handleSkip}
        className="absolute top-6 right-6 p-2 text-text-muted hover:text-text-primary transition-colors"
      >
        <X size={24} />
      </button>

      {/* Skip button */}
      {currentStep < ONBOARDING_STEPS.length - 1 && (
        <button
          onClick={handleSkip}
          className="absolute top-6 left-6 text-sm font-medium text-text-muted hover:text-text-primary transition-colors"
        >
          跳过
        </button>
      )}

      {/* Content */}
      <div
        className={`w-full max-w-md px-8 text-center transition-all duration-300 transform ${
          isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
        }`}
      >
        {/* Icon */}
        <div className="w-24 h-24 mx-auto mb-8 rounded-full bg-primary/10 flex items-center justify-center">
          <Icon size={48} className="text-primary" />
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-text-primary mb-4">{step.title}</h2>

        {/* Description */}
        <p className="text-text-secondary mb-8 leading-relaxed">{step.description}</p>

        {/* Action button */}
        {step.action && (
          <button
            onClick={handleAction}
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary-hover text-white rounded-xl font-semibold transition-colors"
          >
            {step.action.label}
            <ChevronRight size={18} />
          </button>
        )}
      </div>

      {/* Bottom controls */}
      <div className="absolute bottom-8 left-0 right-0 px-8">
        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-8">
          {ONBOARDING_STEPS.map((_, index) => (
            <div
              key={index}
              className={`w-2 h-2 rounded-full transition-colors ${
                index === currentStep ? 'bg-primary' : 'bg-text-muted/30'
              }`}
            />
          ))}
        </div>

        {/* Navigation buttons */}
        <div className="flex gap-4 max-w-md mx-auto">
          {!isFirstStep && (
            <button
              onClick={() => setCurrentStep((prev) => prev - 1)}
              className="flex-1 py-3 border-2 border-border-subtle rounded-xl text-text-primary font-semibold hover:bg-bg-secondary transition-colors"
            >
              上一步
            </button>
          )}

          <button
            onClick={handleNext}
            className={`flex-1 py-3 bg-primary hover:bg-primary-hover text-white rounded-xl font-semibold flex items-center justify-center gap-1 transition-colors ${
              isFirstStep ? 'w-full' : ''
            }`}
          >
            {isLastStep ? '开始使用' : '下一步'}
            {!isLastStep && <ChevronRight size={18} />}
          </button>
        </div>
      </div>
    </div>
  )
}
