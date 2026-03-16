import type React from 'react'

export function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="zcool text-2xl md:text-3xl mb-4 text-gray-800 border-b-2 border-cyan-200 pb-2">
      {children}
    </h2>
  )
}

export function SubHeading({ children }: { children: React.ReactNode }) {
  return <h3 className="text-xl font-bold mb-3 text-gray-700 mt-8">{children}</h3>
}

export function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-cyan-50 border border-cyan-200 rounded-xl p-4 my-4 text-sm text-cyan-800 flex gap-2">
      <span>💡</span>
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
        <h4 className="font-bold text-gray-800 mb-2">{title}</h4>
        <div className="text-gray-600 leading-relaxed">{children}</div>
      </div>
    </div>
  )
}

export function FeatureCard({ icon, title, desc }: { icon?: string; title: string; desc: string }) {
  return (
    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 flex items-start gap-3">
      {icon && <span className="text-2xl">{icon}</span>}
      <div>
        <p className="font-bold text-gray-800">{title}</p>
        <p className="text-gray-600 text-sm">{desc}</p>
      </div>
    </div>
  )
}

export function WarningCard({ icon, title, desc }: { icon?: string; title: string; desc: string }) {
  return (
    <div className="bg-amber-50 rounded-xl p-4 border border-amber-200 flex items-start gap-3">
      {icon && <span className="text-xl">{icon}</span>}
      <div>
        <p className="font-bold text-gray-800">{title}</p>
        <p className="text-gray-600 text-sm">{desc}</p>
      </div>
    </div>
  )
}

export function CheckCard({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 flex items-start gap-3">
      <span className="text-green-500 mt-0.5">✅</span>
      <div>
        <p className="font-bold text-gray-800">{title}</p>
        <p className="text-gray-600 text-sm">{desc}</p>
      </div>
    </div>
  )
}
