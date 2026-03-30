import { useState, useRef, useEffect, useCallback } from "react";
import { Zap, Play, Pause, Trash2, Wifi, WifiOff } from "lucide-react";
import { useSseStream } from "@/hooks/useSseStream";
import { useWebSocket } from "@/hooks/useWebSocket";
import { DataCard } from "@/components/ui/DataCard";
import { LiveDot } from "@/components/ui/LiveDot";
import { JsonViewer } from "@/components/ui/JsonViewer";
import { formatDate } from "@/lib/format";
import { useItemNames } from "@/hooks/useItemNames";
import type { BazaarSseEvent } from "@/types/api";

const CHANNELS = [
  "bazaar:alerts",
  "auction:alerts",
  "auction:ending",
  "profile:changes",
] as const;

type Channel = (typeof CHANNELS)[number];

export default function RealTimePage() {
  const [activeTab, setActiveTab] = useState<"sse" | "ws">("sse");

  return (
    <div className="animate-fade-in">
      <h1 className="font-display text-gradient-coin text-4xl font-bold mb-6 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-coin to-enchant flex items-center justify-center shadow-lg shadow-coin/20">
          <Zap className="w-5 h-5 text-white" />
        </div>
        Real-Time Events
      </h1>

      <div className="flex gap-1 border-b border-dungeon/40 mb-6">
        <button
          className={`px-5 py-2.5 text-sm font-medium transition-all rounded-t-xl ${
            activeTab === "sse"
              ? "border-b-2 border-coin text-coin bg-coin/5"
              : "text-muted hover:text-body hover:bg-dungeon/20"
          }`}
          onClick={() => setActiveTab("sse")}
        >
          Bazaar SSE Stream
        </button>
        <button
          className={`px-5 py-2.5 text-sm font-medium transition-all rounded-t-xl ${
            activeTab === "ws"
              ? "border-b-2 border-coin text-coin bg-coin/5"
              : "text-muted hover:text-body hover:bg-dungeon/20"
          }`}
          onClick={() => setActiveTab("ws")}
        >
          WebSocket Subscriptions
        </button>
      </div>

      {activeTab === "sse" ? <SseTab /> : <WsTab />}
    </div>
  );
}

function SseTab() {
  const { events, connected, paused, connect, disconnect, togglePause, clearEvents } =
    useSseStream();
  const { getName } = useItemNames();
  const [filter, setFilter] = useState("");
  const [eventsPerSec, setEventsPerSec] = useState(0);
  const prevLengthRef = useRef(0);
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      const currentLength = events.length;
      const newEvents = currentLength - prevLengthRef.current;
      setEventsPerSec(Math.max(0, newEvents));
      prevLengthRef.current = currentLength;
    }, 1000);
    return () => clearInterval(interval);
  }, [events.length]);

  useEffect(() => {
    if (!paused) {
      logEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [events.length, paused]);

  const filtered = filter
    ? (events as BazaarSseEvent[]).filter((e) =>
        e.item_id.toLowerCase().includes(filter.toLowerCase())
      )
    : (events as BazaarSseEvent[]);

  const display = filtered.slice(-200);

  return (
    <DataCard>
      <div className="flex flex-wrap items-center gap-3 mb-5">
        {connected ? (
          <button
            onClick={disconnect}
            className="flex items-center gap-2 px-4 py-2 bg-damage/10 text-damage rounded-xl text-sm font-semibold border border-damage/20 hover:bg-damage/15 transition-all"
          >
            <WifiOff className="w-4 h-4" />
            Disconnect
          </button>
        ) : (
          <button
            onClick={connect}
            className="flex items-center gap-2 px-4 py-2 bg-coin/10 text-coin rounded-xl text-sm font-semibold border border-coin/20 hover:bg-coin/15 transition-all"
          >
            <Wifi className="w-4 h-4" />
            Connect
          </button>
        )}

        <button
          onClick={togglePause}
          className="flex items-center gap-2 px-4 py-2 glass border border-dungeon/40 text-body rounded-xl text-sm hover:border-dungeon/60 transition-all"
        >
          {paused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
          {paused ? "Resume" : "Pause"}
        </button>

        <button
          onClick={clearEvents}
          className="flex items-center gap-2 px-4 py-2 glass border border-dungeon/40 text-body rounded-xl text-sm hover:border-dungeon/60 transition-all"
        >
          <Trash2 className="w-4 h-4" />
          Clear
        </button>

        <div className="flex items-center gap-2 ml-auto">
          {connected && <LiveDot />}
          <span className="text-muted text-xs font-mono">
            {eventsPerSec} events/sec &middot; {events.length} total
          </span>
        </div>
      </div>

      <div className="mb-5">
        <input
          type="text"
          placeholder="Filter by item ID..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="w-full max-w-xs bg-void/50 border border-dungeon/50 text-body font-mono text-sm px-4 py-2.5 rounded-xl placeholder:text-muted/50"
        />
      </div>

      <div className="bg-void/40 border border-dungeon/30 rounded-2xl overflow-y-auto max-h-[500px]">
        <table className="w-full text-xs">
          <thead className="sticky top-0 glass border-b border-dungeon/30">
            <tr className="text-muted text-left">
              <th className="px-4 py-3 font-medium">Timestamp</th>
              <th className="px-4 py-3 font-medium">Item</th>
              <th className="px-4 py-3 font-medium">Field</th>
              <th className="px-4 py-3 font-medium">Old</th>
              <th className="px-4 py-3 font-medium">New</th>
            </tr>
          </thead>
          <tbody>
            {display.map((event, i) => (
              <tr
                key={i}
                className="border-b border-dungeon/15 hover:bg-coin/3 transition-colors"
              >
                <td className="px-4 py-2.5 text-muted whitespace-nowrap">
                  {formatDate(event.timestamp)}
                </td>
                <td className="px-4 py-2.5 text-coin font-medium">
                  <span>{getName(event.item_id)}</span>
                  <span className="block text-[10px] font-mono text-muted/60">{event.item_id}</span>
                </td>
                <td className="px-4 py-2.5 text-body">{event.field}</td>
                <td className="px-4 py-2.5 font-mono text-red-400">
                  {String(event.old_value)}
                </td>
                <td className="px-4 py-2.5 font-mono text-green-400">
                  {String(event.new_value)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div ref={logEndRef} />
      </div>
    </DataCard>
  );
}

function WsTab() {
  const { state, messages, connect, disconnect, subscribe, unsubscribe, clearMessages } =
    useWebSocket();

  const [channel, setChannel] = useState<Channel>("bazaar:alerts");
  const [itemFilter, setItemFilter] = useState("");
  const [priceField, setPriceField] = useState("buyPrice");
  const [priceOp, setPriceOp] = useState("gt");
  const [priceValue, setPriceValue] = useState("");
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const handleSubscribe = useCallback(() => {
    const filters: Record<string, unknown> = {};
    if (channel === "bazaar:alerts" && itemFilter) {
      filters.item_id = itemFilter;
    }
    if (channel === "auction:alerts") {
      if (itemFilter) filters.item_id = itemFilter;
      if (priceValue) {
        filters.price = {
          field: priceField,
          operator: priceOp,
          value: Number(priceValue),
        };
      }
    }
    subscribe(channel, Object.keys(filters).length > 0 ? filters : undefined);
  }, [channel, itemFilter, priceField, priceOp, priceValue, subscribe]);

  const handleUnsubscribe = useCallback(() => {
    unsubscribe(channel);
  }, [channel, unsubscribe]);

  const toggleRaw = (index: number) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const statusColor =
    state === "connected"
      ? "bg-green-500/10 text-green-400 border-green-500/20"
      : state === "reconnecting"
      ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
      : "bg-red-500/10 text-red-400 border-red-500/20";

  const displayMessages = messages.slice(-200);

  return (
    <DataCard>
      <div className="flex flex-wrap items-center gap-3 mb-5">
        {state === "connected" ? (
          <button
            onClick={disconnect}
            className="flex items-center gap-2 px-4 py-2 bg-damage/10 text-damage rounded-xl text-sm font-semibold border border-damage/20 hover:bg-damage/15 transition-all"
          >
            <WifiOff className="w-4 h-4" />
            Disconnect
          </button>
        ) : (
          <button
            onClick={connect}
            className="flex items-center gap-2 px-4 py-2 bg-coin/10 text-coin rounded-xl text-sm font-semibold border border-coin/20 hover:bg-coin/15 transition-all"
          >
            <Wifi className="w-4 h-4" />
            Connect
          </button>
        )}

        <span className={`px-3 py-1 rounded-lg text-xs font-semibold border ${statusColor}`}>
          {state}
        </span>

        <button
          onClick={clearMessages}
          className="flex items-center gap-2 px-4 py-2 glass border border-dungeon/40 text-body rounded-xl text-sm ml-auto hover:border-dungeon/60 transition-all"
        >
          <Trash2 className="w-4 h-4" />
          Clear
        </button>
      </div>

      {/* Subscribe UI */}
      <div className="glass border border-dungeon/40 rounded-2xl p-5 mb-5 space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-muted text-xs mb-1.5 font-medium">Channel</label>
            <select
              value={channel}
              onChange={(e) => setChannel(e.target.value as Channel)}
              className="bg-void/50 border border-dungeon/50 text-body font-mono text-sm px-4 py-2.5 rounded-xl"
            >
              {CHANNELS.map((ch) => (
                <option key={ch} value={ch}>
                  {ch}
                </option>
              ))}
            </select>
          </div>

          {(channel === "bazaar:alerts" || channel === "auction:alerts") && (
            <div>
              <label className="block text-muted text-xs mb-1.5 font-medium">Item ID Filter</label>
              <input
                type="text"
                value={itemFilter}
                onChange={(e) => setItemFilter(e.target.value)}
                placeholder="e.g. ENCHANTED_DIAMOND"
                className="bg-void/50 border border-dungeon/50 text-body font-mono text-sm px-4 py-2.5 rounded-xl placeholder:text-muted/50"
              />
            </div>
          )}

          {channel === "auction:alerts" && (
            <>
              <div>
                <label className="block text-muted text-xs mb-1.5 font-medium">Price Field</label>
                <select
                  value={priceField}
                  onChange={(e) => setPriceField(e.target.value)}
                  className="bg-void/50 border border-dungeon/50 text-body font-mono text-sm px-4 py-2.5 rounded-xl"
                >
                  <option value="buyPrice">buyPrice</option>
                  <option value="sellPrice">sellPrice</option>
                  <option value="startingBid">startingBid</option>
                  <option value="highestBid">highestBid</option>
                </select>
              </div>
              <div>
                <label className="block text-muted text-xs mb-1.5 font-medium">Operator</label>
                <select
                  value={priceOp}
                  onChange={(e) => setPriceOp(e.target.value)}
                  className="bg-void/50 border border-dungeon/50 text-body font-mono text-sm px-4 py-2.5 rounded-xl"
                >
                  <option value="lt">&lt;</option>
                  <option value="gt">&gt;</option>
                  <option value="lte">&lt;=</option>
                  <option value="gte">&gt;=</option>
                </select>
              </div>
              <div>
                <label className="block text-muted text-xs mb-1.5 font-medium">Value</label>
                <input
                  type="number"
                  value={priceValue}
                  onChange={(e) => setPriceValue(e.target.value)}
                  placeholder="0"
                  className="bg-void/50 border border-dungeon/50 text-body font-mono text-sm px-4 py-2.5 rounded-xl w-28 placeholder:text-muted/50"
                />
              </div>
            </>
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleSubscribe}
            disabled={state !== "connected"}
            className="px-5 py-2.5 bg-coin/10 text-coin rounded-xl text-sm font-semibold border border-coin/20 disabled:opacity-40 hover:bg-coin/15 transition-all"
          >
            Subscribe
          </button>
          <button
            onClick={handleUnsubscribe}
            disabled={state !== "connected"}
            className="px-5 py-2.5 bg-damage/10 text-damage rounded-xl text-sm font-semibold border border-damage/20 disabled:opacity-40 hover:bg-damage/15 transition-all"
          >
            Unsubscribe
          </button>
        </div>
      </div>

      {/* Message log */}
      <div className="bg-void/40 border border-dungeon/30 rounded-2xl overflow-y-auto max-h-[500px]">
        <table className="w-full text-xs">
          <thead className="sticky top-0 glass border-b border-dungeon/30">
            <tr className="text-muted text-left">
              <th className="px-4 py-3 font-medium">Timestamp</th>
              <th className="px-4 py-3 font-medium">Channel</th>
              <th className="px-4 py-3 font-medium">Data</th>
              <th className="px-4 py-3 w-16 font-medium">Raw</th>
            </tr>
          </thead>
          <tbody>
            {displayMessages.map((msg, i) => {
              const data = typeof msg === "object" ? msg : ({} as Record<string, unknown>);
              const ts = (data as any).timestamp || new Date().toISOString();
              const ch = (data as any).channel || "unknown";
              const payload = (data as any).data;
              const summary =
                payload && typeof payload === "object"
                  ? JSON.stringify(payload).slice(0, 80) + "..."
                  : String(payload ?? "");

              return (
                <>
                  <tr
                    key={`row-${i}`}
                    className="border-b border-dungeon/15 hover:bg-coin/3 transition-colors"
                  >
                    <td className="px-4 py-2.5 text-muted whitespace-nowrap">
                      {formatDate(ts)}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-coin font-medium">{ch}</td>
                    <td className="px-4 py-2.5 text-body truncate max-w-xs">
                      {summary}
                    </td>
                    <td className="px-4 py-2.5">
                      <button
                        onClick={() => toggleRaw(i)}
                        className="text-muted hover:text-coin text-xs font-medium transition-colors"
                      >
                        {expandedRows.has(i) ? "Hide" : "Show"}
                      </button>
                    </td>
                  </tr>
                  {expandedRows.has(i) && (
                    <tr key={`raw-${i}`} className="border-b border-dungeon/15">
                      <td colSpan={4} className="px-4 py-3">
                        <JsonViewer data={data} />
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
        <div ref={logEndRef} />
      </div>
    </DataCard>
  );
}
