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
    <div className={`flex flex-col items-center justify-center py-16 text-center ${className}`}>
      <div className="relative mb-5">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-damage/15 to-damage/5 border border-damage/15 flex items-center justify-center">
          <AlertTriangle className="text-damage" size={26} />
        </div>
        <div className="absolute -inset-3 rounded-3xl bg-damage/5 blur-xl -z-10" />
      </div>
      <span className="font-mono text-[11px] text-damage/60 mb-2 tracking-[0.15em] uppercase">{code}</span>
      <p className="text-muted text-sm mb-6 max-w-md leading-relaxed">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="group inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-dungeon/40 border border-dungeon/50
                     text-body hover:border-coin/30 hover:text-coin hover:bg-coin/5 transition-all duration-200 text-sm font-medium"
        >
          <RefreshCw size={14} className="group-hover:rotate-90 transition-transform duration-300" />
          Retry
        </button>
      )}
    </div>
  )
}
