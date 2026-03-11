import { useEffect, useState } from 'react'
import type { DialogMode } from './workspace-types'

interface WorkspaceDialogsProps {
  dialog: DialogMode
  onClose: () => void
  onSubmit: (value: string) => void
  isPending: boolean
}

export function WorkspaceDialogs({ dialog, onClose, onSubmit, isPending }: WorkspaceDialogsProps) {
  if (!dialog) return null

  const title =
    dialog.kind === 'create-folder'
      ? '新建文件夹'
      : dialog.kind === 'create-file'
        ? '新建文件'
        : '重命名'

  const placeholder =
    dialog.kind === 'create-folder'
      ? '文件夹名称'
      : dialog.kind === 'create-file'
        ? '文件名称（如 README.md）'
        : '新名称'

  const defaultValue = dialog.kind === 'rename' ? dialog.currentName : ''
  const confirmLabel = dialog.kind === 'rename' ? '保存' : '创建'

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-bg-secondary rounded-xl p-6 w-96 border border-border-subtle"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold text-text-primary mb-4">{title}</h3>
        <DialogInput
          defaultValue={defaultValue}
          placeholder={placeholder}
          onSubmit={onSubmit}
          isPending={isPending}
          confirmLabel={confirmLabel}
          onCancel={onClose}
        />
      </div>
    </div>
  )
}

/* ─── Reusable dialog input form ─── */

function DialogInput({
  defaultValue,
  placeholder,
  onSubmit,
  isPending,
  confirmLabel,
  onCancel,
}: {
  defaultValue: string
  placeholder: string
  onSubmit: (value: string) => void
  isPending: boolean
  confirmLabel: string
  onCancel: () => void
}) {
  const [inputValue, setInputValue] = useState(defaultValue)

  useEffect(() => {
    setInputValue(defaultValue)
  }, [defaultValue])

  return (
    <>
      <input
        type="text"
        value={inputValue}
        onChange={(e) => {
          setInputValue(e.target.value)
        }}
        onKeyDown={(e) => {
          e.stopPropagation()
          if (e.key === 'Enter' && !e.nativeEvent.isComposing && e.keyCode !== 229) {
            const val = inputValue.trim()
            if (val) onSubmit(val)
          } else if (e.key === 'Escape') {
            onCancel()
          }
        }}
        placeholder={placeholder}
        className="w-full bg-bg-tertiary text-text-primary rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-primary mb-4"
      />
      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-text-secondary hover:text-text-primary transition rounded-lg"
        >
          取消
        </button>
        <button
          type="button"
          onClick={() => {
            const val = inputValue.trim()
            if (val) onSubmit(val)
          }}
          disabled={isPending}
          className="px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg transition disabled:opacity-50 font-bold"
        >
          {confirmLabel}
        </button>
      </div>
    </>
  )
}
