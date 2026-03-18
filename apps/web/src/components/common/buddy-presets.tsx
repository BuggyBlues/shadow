import { Bot, Code, FileText, Paintbrush, Search, Settings } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export interface BuddyPreset {
  id: string
  name: string
  description: string
  icon: typeof Bot
  color: string
  suggestedName: string
  suggestedUsername: string
  suggestedDesc: string
}

export const BUDDY_PRESETS: BuddyPreset[] = [
  {
    id: 'coding',
    name: '代码助手',
    description: '帮你写代码、做 Code Review、修 Bug',
    icon: Code,
    color: '#5865f2',
    suggestedName: '代码猫',
    suggestedUsername: 'coding-cat',
    suggestedDesc: '精通 TypeScript、Python、Go 等主流语言，帮你写代码、做 Code Review、修 Bug。',
  },
  {
    id: 'writing',
    name: '写作助手',
    description: '帮你写文章、总结、润色',
    icon: FileText,
    color: '#3ba55d',
    suggestedName: '文档喵',
    suggestedUsername: 'docu-meow',
    suggestedDesc: '自动生成 API 文档、会议纪要、技术方案。支持 Markdown 和多种模板。',
  },
  {
    id: 'design',
    name: '设计助手',
    description: '提供 UI/UX 设计建议',
    icon: Paintbrush,
    color: '#eb459f',
    suggestedName: '设计猫',
    suggestedUsername: 'design-cat',
    suggestedDesc: '从线框图到配色方案，帮你快速产出 UI/UX 设计建议和组件代码。',
  },
  {
    id: 'research',
    name: '研究助手',
    description: '搜索代码库、追踪 Bug 根因',
    icon: Search,
    color: '#f0b132',
    suggestedName: '侦探猫',
    suggestedUsername: 'detective-cat',
    suggestedDesc: '帮你搜索代码库、追踪 Bug 根因、分析日志，再也不用熬夜排查问题了。',
  },
  {
    id: 'custom',
    name: '自定义',
    description: '从零开始配置你的 Buddy',
    icon: Settings,
    color: '#747f8d',
    suggestedName: '',
    suggestedUsername: '',
    suggestedDesc: '',
  },
]

interface BuddyPresetSelectorProps {
  onSelect: (preset: BuddyPreset) => void
  selectedId?: string
}

export function BuddyPresetSelector({ onSelect, selectedId }: BuddyPresetSelectorProps) {
  const { t } = useTranslation()

  return (
    <div className="mb-6">
      <h3 className="text-lg font-bold text-text-primary mb-2">选择 Buddy 类型</h3>
      <p className="text-sm text-text-muted mb-4">选择一个预设模板，快速创建你的 AI 助手</p>

      <div className="flex gap-4 overflow-x-auto pb-2 -mx-2 px-2">
        {BUDDY_PRESETS.map((preset) => {
          const Icon = preset.icon
          const isSelected = selectedId === preset.id
          const isCustom = preset.id === 'custom'

          return (
            <button
              key={preset.id}
              onClick={() => onSelect(preset)}
              className={`flex-shrink-0 w-36 p-4 rounded-2xl border-2 text-center transition-all ${
                isSelected
                  ? `bg-[${preset.color}]/10 border-[${preset.color}]`
                  : 'bg-bg-secondary border-border-subtle hover:border-border-default'
              } ${isCustom ? 'border-dashed' : ''}`}
              style={{
                backgroundColor: isSelected ? `${preset.color}15` : undefined,
                borderColor: isSelected ? preset.color : undefined,
              }}
            >
              <div
                className="w-14 h-14 mx-auto mb-3 rounded-full flex items-center justify-center"
                style={{ backgroundColor: `${preset.color}15` }}
              >
                <Icon size={28} style={{ color: preset.color }} />
              </div>

              <h4 className="font-bold text-text-primary mb-1">{preset.name}</h4>

              {!isCustom && (
                <p className="text-xs text-text-muted line-clamp-2">{preset.description}</p>
              )}

              {isSelected && (
                <span
                  className="absolute top-2 right-2 px-2 py-0.5 text-[10px] font-bold text-white rounded-full"
                  style={{ backgroundColor: preset.color }}
                >
                  已选择
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
