import { formatCoins } from '@/lib/format'

interface PriceDisplayProps {
  amount: number
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export function PriceDisplay({ amount, className = '', size = 'md' }: PriceDisplayProps) {
  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-xl font-semibold',
  }

  return (
    <span className={`font-mono text-gold inline-flex items-center gap-1.5 ${sizeClasses[size]} ${className}`}>
      <span className="text-xs opacity-80">&#x1FA99;</span>
      {formatCoins(amount)}
    </span>
  )
}
