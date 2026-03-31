import type { ReactNode } from 'react'
import { Sidebar } from './Sidebar'
import { Toaster } from './Toaster'

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div
      className="min-h-screen flex"
      style={{ background: 'var(--nf-bg-core)', color: 'var(--nf-text-high)' }}
    >
      {/* Ambient orbs */}
      <div
        className="nf-orb"
        style={{
          width: 500,
          height: 500,
          background: 'radial-gradient(circle, var(--color-nf-cyan) 0%, transparent 70%)',
          top: -120,
          left: '5%',
        }}
      />
      <div
        className="nf-orb"
        style={{
          width: 600,
          height: 600,
          background: 'radial-gradient(circle, var(--color-nf-crimson) 0%, transparent 70%)',
          top: '30%',
          right: -150,
          animationDelay: '-7s',
        }}
      />

      <Sidebar />
      <main className="flex-1 overflow-auto relative z-10">{children}</main>
      <Toaster />
    </div>
  )
}
