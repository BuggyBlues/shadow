import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface Step {
  id: string
  label: string
  description?: string
}

interface StepIndicatorProps {
  steps: Step[]
  currentStep: number
  className?: string
  variant?: 'horizontal' | 'vertical'
}

export function StepIndicator({
  steps,
  currentStep,
  className,
  variant = 'horizontal',
}: StepIndicatorProps) {
  if (variant === 'vertical') {
    return (
      <div className={cn('space-y-0', className)}>
        {steps.map((step, i) => {
          const status = i < currentStep ? 'completed' : i === currentStep ? 'active' : 'upcoming'
          return (
            <div key={step.id} className="flex gap-3">
              {/* Line + circle */}
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    'w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium border-2 shrink-0',
                    status === 'completed' && 'bg-blue-600 border-blue-600 text-white',
                    status === 'active' && 'border-blue-500 text-blue-400 bg-blue-500/10',
                    status === 'upcoming' && 'border-gray-700 text-gray-600 bg-gray-900',
                  )}
                >
                  {status === 'completed' ? <Check size={13} /> : i + 1}
                </div>
                {i < steps.length - 1 && (
                  <div
                    className={cn(
                      'w-0.5 flex-1 min-h-8',
                      i < currentStep ? 'bg-blue-600' : 'bg-gray-800',
                    )}
                  />
                )}
              </div>

              {/* Label */}
              <div className="pb-8">
                <p
                  className={cn(
                    'text-sm font-medium',
                    status === 'active'
                      ? 'text-white'
                      : status === 'completed'
                        ? 'text-gray-400'
                        : 'text-gray-600',
                  )}
                >
                  {step.label}
                </p>
                {step.description && (
                  <p className="text-xs text-gray-500 mt-0.5">{step.description}</p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className={cn('flex items-center', className)}>
      {steps.map((step, i) => {
        const status = i < currentStep ? 'completed' : i === currentStep ? 'active' : 'upcoming'
        return (
          <div key={step.id} className="flex items-center flex-1 last:flex-initial">
            {/* Step circle */}
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold border-2 transition-colors',
                  status === 'completed' && 'bg-blue-600 border-blue-600 text-white',
                  status === 'active' && 'border-blue-500 text-blue-400 bg-blue-500/10',
                  status === 'upcoming' && 'border-gray-700 text-gray-600 bg-gray-900',
                )}
              >
                {status === 'completed' ? <Check size={14} /> : i + 1}
              </div>
              <span
                className={cn(
                  'text-xs mt-1.5 whitespace-nowrap',
                  status === 'active' ? 'text-white font-medium' : 'text-gray-500',
                )}
              >
                {step.label}
              </span>
            </div>

            {/* Connector line */}
            {i < steps.length - 1 && (
              <div
                className={cn(
                  'flex-1 h-0.5 mx-2 mb-5',
                  i < currentStep ? 'bg-blue-600' : 'bg-gray-800',
                )}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
