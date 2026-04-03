import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Bell, Trash2 } from 'lucide-react'
import { getAlertHistoryForItem, getAlertHistory, clearAlertHistory, type AlertHistoryEntry } from '@/lib/alertHistory'
import { DataCard } from '@/components/ui/DataCard'

function formatTimeAgo(ts: number): string {
  const diff = Date.now() - ts
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function EntryRow({ entry }: { entry: AlertHistoryEntry }) {
  const fieldLabel = entry.field === 'instant_buy_price' ? 'Buy' : 'Sell'
  const condLabel = entry.condition === 'above' ? 'rose above' : 'dropped below'

  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-dungeon/20 last:border-0">
      <div
        className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${
          entry.condition === 'above' ? 'bg-green-400' : 'bg-red-400'
        }`}
      />
      <div className="flex-1 min-w-0">
        <p className="text-body-light text-sm">
          <Link to={`/bazaar/${entry.itemId}`} className="font-medium hover:text-coin transition-colors">
            {entry.itemName}
          </Link>
          {' '}{fieldLabel} price {condLabel}{' '}
          <span className="font-mono text-coin">{entry.threshold.toLocaleString()}</span>
        </p>
        <p className="text-muted text-xs mt-0.5">
          Actual: <span className="font-mono">{entry.actualValue.toLocaleString()}</span>
          {' '}&middot; {formatTimeAgo(entry.triggeredAt)}
        </p>
      </div>
    </div>
  )
}

export function AlertHistoryPanel({ itemId }: { itemId?: string }) {
  const [, setVersion] = useState(0)

  const entries = itemId ? getAlertHistoryForItem(itemId) : getAlertHistory()

  if (entries.length === 0) return null

  const handleClear = () => {
    clearAlertHistory()
    setVersion((v) => v + 1)
  }

  return (
    <DataCard>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-display text-gradient-coin uppercase tracking-widest font-semibold flex items-center gap-2">
          <Bell size={14} />
          Alert History
          <span className="text-muted/60 text-xs font-mono font-normal normal-case tracking-normal">
            {entries.length}
          </span>
        </h3>
        {!itemId && (
          <button
            onClick={handleClear}
            className="text-xs text-muted hover:text-damage flex items-center gap-1 transition-colors"
          >
            <Trash2 size={12} />
            Clear all
          </button>
        )}
      </div>
      <div className="max-h-64 overflow-y-auto">
        {entries.map((entry) => (
          <EntryRow key={entry.id} entry={entry} />
        ))}
      </div>
    </DataCard>
  )
}
