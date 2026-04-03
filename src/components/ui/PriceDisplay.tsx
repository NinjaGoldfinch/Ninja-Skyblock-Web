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
    <span className={`font-mono text-gradient-gold inline-flex items-center gap-1.5 ${sizeClasses[size]} ${className}`}>
      <span className="text-gold text-xs opacity-70">&#x1FA99;</span>
      <span className="text-gold">{formatCoins(amount)}</span>
    </span>
  )
}
