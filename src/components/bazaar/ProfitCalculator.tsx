import { useState, useMemo } from 'react'
import { ChevronDown, ChevronUp, Calculator } from 'lucide-react'
import { PriceDisplay } from '@/components/ui/PriceDisplay'
import { DataCard } from '@/components/ui/DataCard'

const BZ_TAX_RATE = 0.01125 // 1.125% bazaar sell tax

const QUANTITY_PRESETS = [
  { label: '1', value: 1 },
  { label: '64', value: 64 },
  { label: '640', value: 640 },
  { label: '2304', value: 2304 },
  { label: '71680', value: 71680 },
]

interface ProfitCalculatorProps {
  buyPrice: number
  sellPrice: number
}

export function ProfitCalculator({ buyPrice, sellPrice }: ProfitCalculatorProps) {
  const [open, setOpen] = useState(false)
  const [customBuy, setCustomBuy] = useState<string>('')
  const [customSell, setCustomSell] = useState<string>('')
  const [quantity, setQuantity] = useState(64)
  const [customQty, setCustomQty] = useState<string>('')
  const [includeTax, setIncludeTax] = useState(true)

  const effectiveBuy = customBuy ? parseFloat(customBuy) || 0 : buyPrice
  const effectiveSell = customSell ? parseFloat(customSell) || 0 : sellPrice
  const effectiveQty = customQty ? parseInt(customQty, 10) || 0 : quantity

  const calc = useMemo(() => {
    const totalCost = effectiveBuy * effectiveQty
    const grossRevenue = effectiveSell * effectiveQty
    const tax = includeTax ? grossRevenue * BZ_TAX_RATE : 0
    const totalRevenue = grossRevenue - tax
    const profit = totalRevenue - totalCost
    const profitPerItem = effectiveQty > 0 ? profit / effectiveQty : 0
    const roi = totalCost > 0 ? (profit / totalCost) * 100 : 0

    return { totalCost, totalRevenue, tax, profit, profitPerItem, roi }
  }, [effectiveBuy, effectiveSell, effectiveQty, includeTax])

  const profitable = calc.profit > 0

  return (
    <DataCard>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-coin/10 flex items-center justify-center">
            <Calculator size={16} className="text-coin" />
          </div>
          <span className="font-display text-sm uppercase tracking-widest text-gradient-coin font-semibold">
            Profit Calculator
          </span>
        </div>
        {open ? <ChevronUp size={16} className="text-muted" /> : <ChevronDown size={16} className="text-muted" />}
      </button>

      {open && (
        <div className="mt-5 space-y-5">
          {/* Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-muted font-medium mb-1.5 block">Buy Price</label>
              <input
                type="number"
                placeholder={buyPrice.toFixed(1)}
                value={customBuy}
                onChange={(e) => setCustomBuy(e.target.value)}
                className="w-full bg-void/40 border border-dungeon/40 text-body px-3 py-2 rounded-lg text-sm font-mono placeholder:text-muted/40 focus:outline-none focus:border-coin/50"
              />
            </div>
            <div>
              <label className="text-xs text-muted font-medium mb-1.5 block">Sell Price</label>
              <input
                type="number"
                placeholder={sellPrice.toFixed(1)}
                value={customSell}
                onChange={(e) => setCustomSell(e.target.value)}
                className="w-full bg-void/40 border border-dungeon/40 text-body px-3 py-2 rounded-lg text-sm font-mono placeholder:text-muted/40 focus:outline-none focus:border-coin/50"
              />
            </div>
            <div>
              <label className="text-xs text-muted font-medium mb-1.5 block">Quantity</label>
              <input
                type="number"
                placeholder={String(quantity)}
                value={customQty}
                onChange={(e) => setCustomQty(e.target.value)}
                className="w-full bg-void/40 border border-dungeon/40 text-body px-3 py-2 rounded-lg text-sm font-mono placeholder:text-muted/40 focus:outline-none focus:border-coin/50"
              />
            </div>
          </div>

          {/* Quantity presets + tax toggle */}
          <div className="flex flex-wrap items-center gap-2">
            {QUANTITY_PRESETS.map((p) => (
              <button
                key={p.value}
                onClick={() => { setQuantity(p.value); setCustomQty(''); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
                  effectiveQty === p.value && !customQty
                    ? 'bg-coin/10 text-coin border border-coin/30'
                    : 'border border-dungeon/40 text-muted hover:text-body hover:border-dungeon/60'
                }`}
              >
                {p.label}
              </button>
            ))}
            <div className="ml-auto flex items-center gap-2">
              <label className="text-xs text-muted cursor-pointer flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={includeTax}
                  onChange={(e) => setIncludeTax(e.target.checked)}
                  className="rounded border-dungeon/40 accent-coin"
                />
                BZ Tax (1.125%)
              </label>
            </div>
          </div>

          {/* Results */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-3 border-t border-dungeon/30">
            <ResultItem label="Total Cost" value={calc.totalCost} />
            <ResultItem label="Revenue" value={calc.totalRevenue} />
            {includeTax && (
              <ResultItem label="Tax" value={calc.tax} className="text-damage" />
            )}
            <div className={`rounded-xl p-3 ${profitable ? 'bg-green-500/5 border border-green-500/20' : 'bg-red-500/5 border border-red-500/20'}`}>
              <div className="text-xs text-muted mb-1">Profit</div>
              <div className={`font-mono font-semibold text-sm ${profitable ? 'text-green-400' : 'text-damage'}`}>
                {profitable ? '+' : ''}<PriceDisplay amount={Math.abs(calc.profit)} size="sm" />
              </div>
            </div>
            <div className={`rounded-xl p-3 ${profitable ? 'bg-green-500/5 border border-green-500/20' : 'bg-red-500/5 border border-red-500/20'}`}>
              <div className="text-xs text-muted mb-1">Per Item</div>
              <div className={`font-mono font-semibold text-sm ${profitable ? 'text-green-400' : 'text-damage'}`}>
                {profitable ? '+' : ''}<PriceDisplay amount={Math.abs(calc.profitPerItem)} size="sm" />
              </div>
            </div>
            <div className={`rounded-xl p-3 ${profitable ? 'bg-green-500/5 border border-green-500/20' : 'bg-red-500/5 border border-red-500/20'}`}>
              <div className="text-xs text-muted mb-1">ROI</div>
              <div className={`font-mono font-semibold text-sm ${profitable ? 'text-green-400' : 'text-damage'}`}>
                {profitable ? '+' : ''}{calc.roi.toFixed(2)}%
              </div>
            </div>
          </div>
        </div>
      )}
    </DataCard>
  )
}

function ResultItem({ label, value, className }: { label: string; value: number; className?: string }) {
  return (
    <div className="rounded-xl bg-dungeon/10 border border-dungeon/20 p-3">
      <div className="text-xs text-muted mb-1">{label}</div>
      <div className={`font-mono font-medium text-sm text-body ${className ?? ''}`}>
        <PriceDisplay amount={value} size="sm" />
      </div>
    </div>
  )
}
