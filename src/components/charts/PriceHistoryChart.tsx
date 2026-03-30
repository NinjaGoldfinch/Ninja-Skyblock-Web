import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import type { BazaarHistoryPoint } from '@/types/api'
import { formatCoins } from '@/lib/format'

interface PriceHistoryChartProps {
  data: BazaarHistoryPoint[]
  className?: string
}

export function PriceHistoryChart({ data, className = '' }: PriceHistoryChartProps) {
  const formatted = data.map(d => ({
    ...d,
    time: new Date(d.timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    }),
  }))

  return (
    <div className={`h-72 ${className}`}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={formatted}>
          <defs>
            <linearGradient id="sellGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fbbf24" stopOpacity={0.25} />
              <stop offset="100%" stopColor="#fbbf24" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="buyGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#5ee7df" stopOpacity={0.25} />
              <stop offset="100%" stopColor="#5ee7df" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e2130" strokeOpacity={0.6} />
          <XAxis
            dataKey="time"
            stroke="#6b7394"
            tick={{ fontSize: 10, fontFamily: 'JetBrains Mono' }}
            axisLine={{ stroke: '#1e2130' }}
            tickLine={{ stroke: '#1e2130' }}
          />
          <YAxis
            stroke="#6b7394"
            tick={{ fontSize: 10, fontFamily: 'JetBrains Mono' }}
            tickFormatter={(v) => formatCoins(v)}
            axisLine={{ stroke: '#1e2130' }}
            tickLine={{ stroke: '#1e2130' }}
          />
          <Tooltip
            contentStyle={{
              background: 'linear-gradient(135deg, #111318 0%, #16181f 100%)',
              border: '1px solid rgba(30, 33, 48, 0.6)',
              borderRadius: 12,
              fontFamily: 'JetBrains Mono',
              fontSize: 12,
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
              backdropFilter: 'blur(12px)',
            }}
            labelStyle={{ color: '#6b7394' }}
            formatter={(value: unknown, name: unknown) => [
              formatCoins(Number(value)),
              String(name) === 'sell_price' ? 'Sell Price' : 'Buy Price',
            ]}
          />
          <Area
            type="monotone"
            dataKey="sell_price"
            stroke="#fbbf24"
            fill="url(#sellGrad)"
            strokeWidth={2}
            dot={false}
          />
          <Area
            type="monotone"
            dataKey="buy_price"
            stroke="#5ee7df"
            fill="url(#buyGrad)"
            strokeWidth={2}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
