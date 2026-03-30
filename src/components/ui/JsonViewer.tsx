import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { CopyButton } from './CopyButton'

interface JsonViewerProps {
  data: unknown
  title?: string
  defaultCollapsed?: boolean
}

export function JsonViewer({ data, title = 'Raw JSON', defaultCollapsed = true }: JsonViewerProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed)
  const jsonString = JSON.stringify(data, null, 2)

  return (
    <div className="rounded-xl border border-dungeon/40 overflow-hidden">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center gap-2 px-4 py-3 glass hover:bg-dungeon/20 transition-colors text-sm text-muted"
      >
        {collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
        <span className="font-medium">{title}</span>
        <span className="ml-auto">
          <CopyButton text={jsonString} />
        </span>
      </button>
      {!collapsed && (
        <pre className="p-4 overflow-x-auto text-xs font-mono text-body bg-void/50 max-h-96 overflow-y-auto border-t border-dungeon/30 leading-relaxed">
          {jsonString}
        </pre>
      )}
    </div>
  )
}
