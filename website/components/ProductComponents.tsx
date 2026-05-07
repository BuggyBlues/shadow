import { ChevronDown } from 'lucide-react'
import React, { useState } from 'react'
import { CheckIcon, LightbulbIcon } from './Icons'

export function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="zcool text-2xl md:text-3xl mb-4 text-gray-800 dark:text-gray-100 border-b-2 border-cyan-200 dark:border-cyan-800 pb-2">
      {children}
    </h2>
  )
}

export function SubHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xl font-bold mb-3 text-gray-700 dark:text-gray-200 mt-8">{children}</h3>
  )
}

export function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-800 rounded-xl p-4 my-4 text-sm text-cyan-800 dark:text-cyan-200 flex gap-2">
      <LightbulbIcon className="w-5 h-5 shrink-0 mt-0.5" />
      <div>{children}</div>
    </div>
  )
}

export function Step({
  num,
  title,
  children,
}: {
  num: number
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="flex gap-4 my-6">
      <div className="shrink-0 w-8 h-8 rounded-full bg-cyan-500 text-white flex items-center justify-center font-bold text-sm">
        {num}
      </div>
      <div className="flex-1">
        <h4 className="font-bold text-gray-800 dark:text-gray-100 mb-2">{title}</h4>
        <div className="text-gray-600 dark:text-gray-300 leading-relaxed">{children}</div>
      </div>
    </div>
  )
}

export function FeatureCard({
  icon,
  title,
  desc,
}: {
  icon?: React.ReactNode
  title: string
  desc: string
}) {
  return (
    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 border border-gray-200 dark:border-gray-700 flex items-start gap-3">
      {icon && <span className="text-2xl shrink-0">{icon}</span>}
      <div>
        <p className="font-bold text-gray-800 dark:text-gray-100">{title}</p>
        <p className="text-gray-600 dark:text-gray-300 text-sm">{desc}</p>
      </div>
    </div>
  )
}

export function WarningCard({
  icon,
  title,
  desc,
}: {
  icon?: React.ReactNode
  title: string
  desc: string
}) {
  return (
    <div className="bg-amber-50 dark:bg-amber-950/40 rounded-xl p-4 border border-amber-200 dark:border-amber-800 flex items-start gap-3">
      {icon && <span className="text-xl shrink-0">{icon}</span>}
      <div>
        <p className="font-bold text-gray-800 dark:text-gray-100">{title}</p>
        <p className="text-gray-600 dark:text-gray-300 text-sm">{desc}</p>
      </div>
    </div>
  )
}

export function CheckCard({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 border border-gray-200 dark:border-gray-700 flex items-start gap-3">
      <CheckIcon className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
      <div>
        <p className="font-bold text-gray-800 dark:text-gray-100">{title}</p>
        <p className="text-gray-600 dark:text-gray-300 text-sm">{desc}</p>
      </div>
    </div>
  )
}

export function FaqAccordion({ faqs }: { faqs: { q: string; a: string }[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', margin: '32px 0' }}>
      {faqs.map((f, i) => {
        const isOpen = openIndex === i
        return (
          <div
            key={i}
            style={{
              border: `1px solid ${isOpen ? 'color-mix(in srgb, var(--shadow-accent) 30%, transparent)' : 'color-mix(in srgb, var(--rp-c-text-1) 10%, transparent)'}`,
              borderRadius: '16px',
              overflow: 'hidden',
              background: isOpen
                ? 'color-mix(in srgb, var(--shadow-accent) 5%, var(--shadow-card-bg))'
                : 'color-mix(in srgb, var(--rp-c-text-1) 3%, transparent)',
              boxShadow: isOpen
                ? '0 4px 16px color-mix(in srgb, var(--shadow-accent) 10%, transparent)'
                : 'none',
              transition: 'all 0.3s ease',
            }}
          >
            <button
              type="button"
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '20px',
                textAlign: 'left',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: isOpen ? 'var(--shadow-accent)' : 'var(--rp-c-text-1)',
              }}
              onClick={() => setOpenIndex(isOpen ? null : i)}
            >
              <span
                style={{
                  fontWeight: 800,
                  fontSize: '16px',
                  paddingRight: '16px',
                  transition: 'color 0.2s ease',
                }}
              >
                {f.q}
              </span>
              <ChevronDown
                size={20}
                style={{
                  flexShrink: 0,
                  transform: isOpen ? 'rotate(180deg)' : 'rotate(0)',
                  transition: 'transform 0.3s ease',
                  color: isOpen ? 'var(--shadow-accent)' : 'var(--rp-c-text-3)',
                }}
              />
            </button>
            <div
              style={{
                display: 'grid',
                gridTemplateRows: isOpen ? '1fr' : '0fr',
                opacity: isOpen ? 1 : 0,
                transition: 'all 0.3s ease-in-out',
              }}
            >
              <div style={{ overflow: 'hidden' }}>
                <div
                  style={{
                    padding: '0 20px 20px',
                    color: 'var(--rp-c-text-2)',
                    lineHeight: 1.6,
                    fontSize: '15px',
                  }}
                >
                  {f.a}
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
