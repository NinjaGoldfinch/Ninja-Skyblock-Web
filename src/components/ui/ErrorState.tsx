import { AlertTriangle, RefreshCw } from 'lucide-react'
import { ApiRequestError } from '@/api/client'

interface ErrorStateProps {
  error: Error
  onRetry?: () => void
  className?: string
}

export function ErrorState({ error, onRetry, className = '' }: ErrorStateProps) {
  const isApiError = error instanceof ApiRequestError
  const code = isApiError ? error.code : 'ERROR'
  const message = error.message || 'An unexpected error occurred'

  return (
    <div className={`flex flex-col items-center justify-center py-12 text-center ${className}`}>
      <div className="w-14 h-14 rounded-2xl bg-damage/10 border border-damage/20 flex items-center justify-center mb-4">
        <AlertTriangle className="text-damage" size={24} />
      </div>
      <span className="font-mono text-xs text-damage/80 mb-1.5 tracking-wider">{code}</span>
      <p className="text-muted text-sm mb-5 max-w-md leading-relaxed">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-dungeon/50 border border-dungeon
                     text-body hover:border-enchant/40 hover:text-enchant transition-all duration-200 text-sm font-medium"
        >
          <RefreshCw size={14} />
          Retry
        </button>
      )}
    </div>
  )
}
