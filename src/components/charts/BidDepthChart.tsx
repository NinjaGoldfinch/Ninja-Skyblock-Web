import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import type { BazaarOrder } from '@/types/api'
import { formatCoins, formatNumber } from '@/lib/format'

interface BidDepthChartProps {
  buyOrders: BazaarOrder[]
  sellOrders: BazaarOrder[]
  className?: string
}

export function BidDepthChart({ buyOrders, sellOrders, className = '' }: BidDepthChartProps) {
  const data = [
    ...buyOrders.slice(0, 10).map((o, i) => ({
      label: `Buy ${i + 1}`,
      buy: o.amount,
      price: o.pricePerUnit,
    })),
    ...sellOrders.slice(0, 10).map((o, i) => ({
      label: `Sell ${i + 1}`,
      sell: o.amount,
      price: o.pricePerUnit,
    })),
  ]

  return (
    <div className={`h-52 ${className}`}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e2130" strokeOpacity={0.6} />
          <XAxis
            dataKey="label"
            stroke="#6b7394"
            tick={{ fontSize: 9, fontFamily: 'JetBrains Mono' }}
            axisLine={{ stroke: '#1e2130' }}
            tickLine={{ stroke: '#1e2130' }}
          />
          <YAxis
            stroke="#6b7394"
            tick={{ fontSize: 9, fontFamily: 'JetBrains Mono' }}
            tickFormatter={(v) => formatNumber(v)}
            axisLine={{ stroke: '#1e2130' }}
            tickLine={{ stroke: '#1e2130' }}
          />
          <Tooltip
            contentStyle={{
              background: 'linear-gradient(135deg, #111318 0%, #16181f 100%)',
              border: '1px solid rgba(30, 33, 48, 0.6)',
              borderRadius: 12,
              fontFamily: 'JetBrains Mono',
              fontSize: 11,
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
            }}
            formatter={(value: unknown) => [formatNumber(Number(value)), 'Volume']}
            labelFormatter={(label: unknown, payload: unknown) => {
              const items = payload as Array<{ payload?: { price?: number } }> | undefined
              const item = items?.[0]?.payload
              return `${String(label)} — ${formatCoins(item?.price ?? 0)}`
            }}
          />
          <Bar dataKey="buy" fill="#5ee7df" radius={[4, 4, 0, 0]} />
          <Bar dataKey="sell" fill="#fbbf24" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
