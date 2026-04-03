import type { PriceStats } from "@/lib/chartStats";
import { formatCoins } from "@/lib/format";

interface PriceStatsBarProps {
  stats: PriceStats;
  className?: string;
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0 p-3 rounded-xl bg-void/30 border border-dungeon/15 transition-colors hover:border-dungeon/30">
      <p className="text-muted text-[10px] uppercase tracking-[0.12em] mb-1 font-medium">{label}</p>
      <div className="text-body font-mono text-sm truncate">{children}</div>
    </div>
  );
}

function PctBadge({ value }: { value: number }) {
  const positive = value >= 0;
  return (
    <span className={`inline-flex items-center gap-1 font-mono text-sm font-medium ${positive ? "text-enchant" : "text-damage"}`}>
      <span className={`inline-block w-0 h-0 border-l-[4px] border-r-[4px] border-transparent ${
        positive ? "border-b-[5px] border-b-enchant" : "border-t-[5px] border-t-damage"
      }`} />
      {positive ? "+" : ""}{value.toFixed(2)}%
    </span>
  );
}

export function PriceStatsBar({ stats, className = "" }: PriceStatsBarProps) {
  return (
    <div className={`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 p-4 glass rounded-xl border border-dungeon/25 ${className}`}>
      <Stat label="Buy High">
        <span className="text-enchant">{formatCoins(stats.highBuy)}</span>
      </Stat>
      <Stat label="Buy Low">
        <span className="text-enchant/55">{formatCoins(stats.lowBuy)}</span>
      </Stat>
      <Stat label="Sell High">
        <span className="text-gold">{formatCoins(stats.highSell)}</span>
      </Stat>
      <Stat label="Sell Low">
        <span className="text-gold/55">{formatCoins(stats.lowSell)}</span>
      </Stat>
      <Stat label="Buy Change">
        <PctBadge value={stats.pctChangeBuy} />
      </Stat>
      <Stat label="Spread">
        <span className={stats.spread >= 0 ? "text-enchant" : "text-damage"}>
          {formatCoins(Math.abs(stats.spread))}
        </span>
      </Stat>
    </div>
  );
}
