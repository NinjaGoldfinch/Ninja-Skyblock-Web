import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

const SIDEBAR_SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "authentication", label: "Authentication" },
  { id: "endpoints", label: "Endpoints Reference" },
  { id: "websocket", label: "WebSocket Protocol" },
  { id: "rate-limits", label: "Rate Limits" },
  { id: "response-envelope", label: "Response Envelope" },
  { id: "sdks", label: "SDKs & Quickstart" },
];

interface EndpointDef {
  method: "GET" | "POST" | "DELETE";
  path: string;
  description: string;
}

const V1_ENDPOINTS: EndpointDef[] = [
  { method: "GET", path: "/v1/profile", description: "Get a player profile by UUID" },
  { method: "GET", path: "/v1/profiles", description: "Get all profiles for a player" },
  { method: "GET", path: "/v1/bazaar", description: "Get all bazaar products" },
  { method: "GET", path: "/v1/bazaar/:itemId", description: "Get a specific bazaar product" },
  { method: "GET", path: "/v1/auctions/player", description: "Get auctions for a player" },
  { method: "GET", path: "/v1/auctions/ended", description: "Get recently ended auctions" },
  { method: "GET", path: "/v1/collections", description: "Get all collection data" },
  { method: "GET", path: "/v1/skills", description: "Get skill data and XP tables" },
  { method: "GET", path: "/v1/items", description: "Get all SkyBlock items" },
  { method: "GET", path: "/v1/election", description: "Get current election/mayor data" },
  { method: "GET", path: "/v1/player/uuid", description: "Look up player UUID" },
  { method: "GET", path: "/v1/player/username", description: "Look up player username" },
];

const V2_ENDPOINTS: EndpointDef[] = [
  { method: "GET", path: "/v2/profile", description: "Enhanced profile data with computed stats" },
  { method: "GET", path: "/v2/bazaar/:itemId", description: "Enhanced bazaar product data" },
  { method: "GET", path: "/v2/bazaar/:itemId/history", description: "Historical bazaar data with time series" },
  { method: "GET", path: "/v2/auctions/lowest", description: "Lowest BIN auctions" },
  { method: "GET", path: "/v2/auctions/lowest?key_by", description: "Lowest BIN auctions keyed by item" },
  { method: "GET", path: "/v2/auctions/lowest/:item", description: "Lowest BIN for a specific item" },
  { method: "GET", path: "/v2/auctions/search", description: "Search auctions by query" },
  { method: "GET", path: "/v2/items", description: "Enhanced items list with metadata" },
  { method: "GET", path: "/v2/items/:itemId", description: "Get single item detail" },
  { method: "GET", path: "/v2/items/lookup/:name", description: "Look up item by display name" },
];

const REALTIME_ENDPOINTS: EndpointDef[] = [
  { method: "GET", path: "/v1/bazaar/stream", description: "SSE stream of bazaar price changes" },
  { method: "GET", path: "/ws", description: "WebSocket endpoint for real-time subscriptions" },
];

const ADMIN_ENDPOINTS: EndpointDef[] = [
  { method: "POST", path: "/admin/keys", description: "Create a new API key" },
  { method: "GET", path: "/admin/watched-players", description: "List watched players" },
  { method: "POST", path: "/admin/watched-players", description: "Add a watched player" },
  { method: "DELETE", path: "/admin/watched-players", description: "Remove a watched player" },
];

const UTILITY_ENDPOINTS: EndpointDef[] = [
  { method: "GET", path: "/health", description: "Health check endpoint" },
  { method: "GET", path: "/docs", description: "API documentation page" },
  { method: "GET", path: "/openapi.json", description: "OpenAPI spec in JSON format" },
  { method: "GET", path: "/openapi.yaml", description: "OpenAPI spec in YAML format" },
];

function MethodBadge({ method }: { method: string }) {
  const colors =
    method === "GET"
      ? "bg-green-500/10 text-green-400 border-green-500/20"
      : method === "POST"
      ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
      : "bg-red-500/10 text-red-400 border-red-500/20";
  return (
    <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold border tracking-wider ${colors}`}>
      {method}
    </span>
  );
}

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="bg-void/60 border border-dungeon/30 p-4 font-mono text-xs overflow-x-auto rounded-xl my-3 text-body leading-relaxed">
      {children}
    </pre>
  );
}

function EndpointGroup({
  title,
  endpoints,
  expanded,
  toggle,
}: {
  title: string;
  endpoints: EndpointDef[];
  expanded: boolean;
  toggle: () => void;
}) {
  return (
    <div className="rounded-2xl border border-dungeon/40 mb-4 overflow-hidden">
      <button
        onClick={toggle}
        className="w-full text-left px-5 py-4 flex items-center justify-between glass hover:bg-dungeon/10 transition-colors"
      >
        <span className="text-coin font-semibold text-sm">{title}</span>
        {expanded ? <ChevronDown size={16} className="text-muted" /> : <ChevronRight size={16} className="text-muted" />}
      </button>
      {expanded && (
        <div className="divide-y divide-dungeon/20">
          {endpoints.map((ep, i) => (
            <div key={i} className="px-5 py-3.5 space-y-1.5 hover:bg-coin/2 transition-colors">
              <div className="flex items-center gap-2.5">
                <MethodBadge method={ep.method} />
                <code className="font-mono text-sm text-body">{ep.path}</code>
              </div>
              <p className="text-muted text-xs">{ep.description}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function DocsPage() {
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    v1: false,
    v2: false,
    realtime: false,
    admin: false,
    utility: false,
  });
  const [codeTab, setCodeTab] = useState<"ts" | "py" | "curl">("ts");

  const toggleGroup = (key: string) =>
    setExpandedGroups((prev) => ({ ...prev, [key]: !prev[key] }));

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="flex animate-fade-in">
      {/* Sidebar */}
      <nav className="w-56 shrink-0 border-r border-dungeon/30 p-5 sticky top-0 h-screen overflow-y-auto hidden md:block">
        <h2 className="font-display text-gradient-coin text-lg font-bold mb-5">API Docs</h2>
        <ul className="space-y-0.5">
          {SIDEBAR_SECTIONS.map((s) => (
            <li key={s.id}>
              <button
                onClick={() => scrollTo(s.id)}
                className="text-muted hover:text-coin text-sm w-full text-left py-2 px-3 rounded-xl hover:bg-coin/5 transition-all"
              >
                {s.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* Content */}
      <main className="flex-1 p-6 max-w-4xl">
        {/* Overview */}
        <section id="overview" className="mb-14">
          <h2 className="font-display text-gradient-coin text-2xl font-bold mb-5">Overview</h2>
          <p className="text-body mb-5 leading-relaxed">
            The Ninja SkyBlock API provides programmatic access to Hypixel SkyBlock data
            including player profiles, bazaar prices, auction house listings, items, collections,
            and real-time event streams. All responses follow a consistent envelope format.
          </p>
          <h3 className="text-body font-semibold mb-2">Response Envelope</h3>
          <p className="text-muted text-sm mb-2">
            Every successful response wraps data in a standard envelope:
          </p>
          <CodeBlock>{`{
  "success": true,
  "data": { ... },
  "meta": {
    "cached": true,
    "cache_ttl": 60,
    "timestamp": "2026-03-30T12:00:00Z"
  }
}`}</CodeBlock>
          <h3 className="text-body font-semibold mb-2 mt-5">Error Envelope</h3>
          <p className="text-muted text-sm mb-2">
            Errors return a similar structure with an error message and optional details:
          </p>
          <CodeBlock>{`{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Player not found",
    "details": null
  }
}`}</CodeBlock>
        </section>

        {/* Authentication */}
        <section id="authentication" className="mb-14">
          <h2 className="font-display text-gradient-coin text-2xl font-bold mb-5">Authentication</h2>
          <p className="text-body mb-5 leading-relaxed">
            The API supports three authentication strategies:
          </p>
          <div className="overflow-x-auto mb-5 rounded-2xl border border-dungeon/40">
            <table className="w-full text-sm">
              <thead className="glass">
                <tr className="text-muted text-left">
                  <th className="px-5 py-3 border-b border-dungeon/30 text-xs font-medium">Strategy</th>
                  <th className="px-5 py-3 border-b border-dungeon/30 text-xs font-medium">Header</th>
                  <th className="px-5 py-3 border-b border-dungeon/30 text-xs font-medium">Description</th>
                </tr>
              </thead>
              <tbody className="text-body">
                <tr className="border-b border-dungeon/20 hover:bg-coin/2 transition-colors">
                  <td className="px-5 py-3 font-mono text-coin font-medium">API Key</td>
                  <td className="px-5 py-3 font-mono text-xs">X-API-Key: your-key</td>
                  <td className="px-5 py-3 text-muted text-sm">Simple key-based auth for most use cases</td>
                </tr>
                <tr className="border-b border-dungeon/20 hover:bg-coin/2 transition-colors">
                  <td className="px-5 py-3 font-mono text-coin font-medium">HMAC</td>
                  <td className="px-5 py-3 font-mono text-xs">X-Signature: hmac-sha256=... <br/>X-Timestamp: epoch</td>
                  <td className="px-5 py-3 text-muted text-sm">HMAC-SHA256 signed requests for higher security</td>
                </tr>
                <tr className="hover:bg-coin/2 transition-colors">
                  <td className="px-5 py-3 font-mono text-coin font-medium">Dev Bypass</td>
                  <td className="px-5 py-3 font-mono text-xs">X-Dev-Key: dev-key</td>
                  <td className="px-5 py-3 text-muted text-sm">Development-only bypass (local/staging)</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3 className="text-body font-semibold mb-2">HMAC Signature (JavaScript)</h3>
          <CodeBlock>{`import crypto from "crypto";

function signRequest(secret, method, path, body, timestamp) {
  const payload = [timestamp, method.toUpperCase(), path, body || ""].join("\\n");
  return crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");
}

// Usage
const ts = Math.floor(Date.now() / 1000).toString();
const sig = signRequest(SECRET, "GET", "/v1/profile?uuid=abc", "", ts);
fetch(url, {
  headers: {
    "X-Signature": \`hmac-sha256=\${sig}\`,
    "X-Timestamp": ts,
  },
});`}</CodeBlock>

          <h3 className="text-body font-semibold mb-2 mt-5">HMAC Signature (Python)</h3>
          <CodeBlock>{`import hmac, hashlib, time, requests

def sign_request(secret: str, method: str, path: str, body: str, timestamp: str) -> str:
    payload = f"{timestamp}\\n{method.upper()}\\n{path}\\n{body}"
    return hmac.new(
        secret.encode(), payload.encode(), hashlib.sha256
    ).hexdigest()

ts = str(int(time.time()))
sig = sign_request(SECRET, "GET", "/v1/profile?uuid=abc", "", ts)
resp = requests.get(url, headers={
    "X-Signature": f"hmac-sha256={sig}",
    "X-Timestamp": ts,
})`}</CodeBlock>
        </section>

        {/* Endpoints Reference */}
        <section id="endpoints" className="mb-14">
          <h2 className="font-display text-gradient-coin text-2xl font-bold mb-5">Endpoints Reference</h2>
          <EndpointGroup
            title="v1 Endpoints"
            endpoints={V1_ENDPOINTS}
            expanded={expandedGroups.v1 ?? false}
            toggle={() => toggleGroup("v1")}
          />
          <EndpointGroup
            title="v2 Endpoints"
            endpoints={V2_ENDPOINTS}
            expanded={expandedGroups.v2 ?? false}
            toggle={() => toggleGroup("v2")}
          />
          <EndpointGroup
            title="Real-Time"
            endpoints={REALTIME_ENDPOINTS}
            expanded={expandedGroups.realtime ?? false}
            toggle={() => toggleGroup("realtime")}
          />
          <EndpointGroup
            title="Admin"
            endpoints={ADMIN_ENDPOINTS}
            expanded={expandedGroups.admin ?? false}
            toggle={() => toggleGroup("admin")}
          />
          <EndpointGroup
            title="Utility"
            endpoints={UTILITY_ENDPOINTS}
            expanded={expandedGroups.utility ?? false}
            toggle={() => toggleGroup("utility")}
          />
        </section>

        {/* WebSocket Protocol */}
        <section id="websocket" className="mb-14">
          <h2 className="font-display text-gradient-coin text-2xl font-bold mb-5">WebSocket Protocol</h2>
          <p className="text-body mb-5 leading-relaxed">
            Connect to <code className="font-mono text-coin bg-coin/8 px-1.5 py-0.5 rounded-md text-sm">/ws</code> for real-time subscriptions.
            Messages are JSON-encoded.
          </p>

          <h3 className="text-body font-semibold mb-2">Subscribe</h3>
          <CodeBlock>{`{
  "type": "subscribe",
  "channel": "bazaar:alerts",
  "filters": {
    "item_id": "ENCHANTED_DIAMOND"
  }
}`}</CodeBlock>

          <h3 className="text-body font-semibold mb-2 mt-5">Unsubscribe</h3>
          <CodeBlock>{`{
  "type": "unsubscribe",
  "channel": "bazaar:alerts"
}`}</CodeBlock>

          <h3 className="text-body font-semibold mb-2 mt-5">Channels</h3>
          <ul className="text-body text-sm space-y-2 list-none mb-5">
            <li className="flex items-start gap-2"><span className="text-coin mt-1">&#x2022;</span><span><code className="font-mono text-coin bg-coin/8 px-1.5 py-0.5 rounded-md text-xs">bazaar:alerts</code> - Bazaar price change alerts. Filters: <code className="font-mono text-xs">item_id</code></span></li>
            <li className="flex items-start gap-2"><span className="text-coin mt-1">&#x2022;</span><span><code className="font-mono text-coin bg-coin/8 px-1.5 py-0.5 rounded-md text-xs">auction:alerts</code> - Auction alerts with price filters. Filters: <code className="font-mono text-xs">item_id</code>, <code className="font-mono text-xs">price</code></span></li>
            <li className="flex items-start gap-2"><span className="text-coin mt-1">&#x2022;</span><span><code className="font-mono text-coin bg-coin/8 px-1.5 py-0.5 rounded-md text-xs">auction:ending</code> - Auctions ending soon</span></li>
            <li className="flex items-start gap-2"><span className="text-coin mt-1">&#x2022;</span><span><code className="font-mono text-coin bg-coin/8 px-1.5 py-0.5 rounded-md text-xs">profile:changes</code> - Player profile change notifications</span></li>
          </ul>

          <h3 className="text-body font-semibold mb-2">Server Message</h3>
          <CodeBlock>{`{
  "type": "event",
  "channel": "bazaar:alerts",
  "timestamp": "2026-03-30T12:00:00Z",
  "data": {
    "item_id": "ENCHANTED_DIAMOND",
    "field": "buyPrice",
    "old_value": 1500.0,
    "new_value": 1650.0
  }
}`}</CodeBlock>
        </section>

        {/* Rate Limits */}
        <section id="rate-limits" className="mb-14">
          <h2 className="font-display text-gradient-coin text-2xl font-bold mb-5">Rate Limits</h2>
          <div className="overflow-x-auto rounded-2xl border border-dungeon/40">
            <table className="w-full text-sm">
              <thead className="glass">
                <tr className="text-muted text-left">
                  <th className="px-5 py-3 border-b border-dungeon/30 text-xs font-medium">Tier</th>
                  <th className="px-5 py-3 border-b border-dungeon/30 text-xs font-medium">Limit</th>
                  <th className="px-5 py-3 border-b border-dungeon/30 text-xs font-medium">Window</th>
                  <th className="px-5 py-3 border-b border-dungeon/30 text-xs font-medium">Description</th>
                </tr>
              </thead>
              <tbody className="text-body">
                <tr className="border-b border-dungeon/20 hover:bg-coin/2 transition-colors">
                  <td className="px-5 py-3 font-mono text-coin font-medium">CLIENT_RATE_LIMIT</td>
                  <td className="px-5 py-3">60 requests</td>
                  <td className="px-5 py-3">per minute</td>
                  <td className="px-5 py-3 text-muted">Authenticated requests with API key</td>
                </tr>
                <tr className="hover:bg-coin/2 transition-colors">
                  <td className="px-5 py-3 font-mono text-coin font-medium">PUBLIC_RATE_LIMIT</td>
                  <td className="px-5 py-3">30 requests</td>
                  <td className="px-5 py-3">per minute</td>
                  <td className="px-5 py-3 text-muted">Unauthenticated / public requests</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-muted text-xs mt-3">
            Rate limit headers are included in every response: <code className="font-mono text-xs">X-RateLimit-Limit</code>,{" "}
            <code className="font-mono text-xs">X-RateLimit-Remaining</code>, <code className="font-mono text-xs">X-RateLimit-Reset</code>.
          </p>
        </section>

        {/* Response Envelope */}
        <section id="response-envelope" className="mb-14">
          <h2 className="font-display text-gradient-coin text-2xl font-bold mb-5">Response Envelope</h2>
          <p className="text-body mb-5">Full schema breakdown of the response envelope:</p>
          <div className="overflow-x-auto rounded-2xl border border-dungeon/40">
            <table className="w-full text-sm">
              <thead className="glass">
                <tr className="text-muted text-left">
                  <th className="px-5 py-3 border-b border-dungeon/30 text-xs font-medium">Field</th>
                  <th className="px-5 py-3 border-b border-dungeon/30 text-xs font-medium">Type</th>
                  <th className="px-5 py-3 border-b border-dungeon/30 text-xs font-medium">Description</th>
                </tr>
              </thead>
              <tbody className="text-body">
                {[
                  ["success", "boolean", "Whether the request was successful"],
                  ["data", "T | null", "Response payload (null on error)"],
                  ["meta", "object | null", "Metadata about the response"],
                  ["  meta.cached", "boolean", "Whether the response was served from cache"],
                  ["  meta.cache_ttl", "number", "Cache TTL in seconds"],
                  ["  meta.timestamp", "string", "ISO 8601 timestamp of the response"],
                  ["error", "object | null", "Error details (null on success)"],
                  ["  error.code", "string", "Machine-readable error code"],
                  ["  error.message", "string", "Human-readable error message"],
                  ["  error.details", "any | null", "Additional error context"],
                ].map(([field, type, desc], i) => (
                  <tr key={i} className="border-b border-dungeon/15 hover:bg-coin/2 transition-colors last:border-b-0">
                    <td className={`px-5 py-3 font-mono text-coin ${field?.startsWith("  ") ? "pl-10" : ""}`}>{field?.trim()}</td>
                    <td className="px-5 py-3 font-mono text-muted text-xs">{type}</td>
                    <td className="px-5 py-3 text-sm">{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* SDKs & Quickstart */}
        <section id="sdks" className="mb-14">
          <h2 className="font-display text-gradient-coin text-2xl font-bold mb-5">SDKs & Quickstart</h2>

          <div className="flex gap-1 border-b border-dungeon/40 mb-5">
            {(["ts", "py", "curl"] as const).map((tab) => (
              <button
                key={tab}
                className={`px-5 py-2.5 text-sm font-medium transition-all rounded-t-xl ${
                  codeTab === tab
                    ? "border-b-2 border-coin text-coin bg-coin/5"
                    : "text-muted hover:text-body hover:bg-dungeon/20"
                }`}
                onClick={() => setCodeTab(tab)}
              >
                {tab === "ts" ? "TypeScript" : tab === "py" ? "Python" : "cURL"}
              </button>
            ))}
          </div>

          {codeTab === "ts" && (
            <div className="space-y-5">
              <h3 className="text-body font-semibold">Authentication & Player Lookup</h3>
              <CodeBlock>{`const API_BASE = "https://api.ninja-skyblock.com";
const API_KEY = "your-api-key";

// Player lookup
const res = await fetch(\`\${API_BASE}/v1/player/uuid?username=Technoblade\`, {
  headers: { "X-API-Key": API_KEY },
});
const { data } = await res.json();
console.log(data.uuid);`}</CodeBlock>

              <h3 className="text-body font-semibold">WebSocket Subscribe</h3>
              <CodeBlock>{`const ws = new WebSocket("wss://api.ninja-skyblock.com/ws");

ws.onopen = () => {
  ws.send(JSON.stringify({
    type: "subscribe",
    channel: "bazaar:alerts",
    filters: { item_id: "ENCHANTED_DIAMOND" },
  }));
};

ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  console.log(msg.channel, msg.data);
};`}</CodeBlock>
            </div>
          )}

          {codeTab === "py" && (
            <div className="space-y-5">
              <h3 className="text-body font-semibold">Authentication & Player Lookup</h3>
              <CodeBlock>{`import requests

API_BASE = "https://api.ninja-skyblock.com"
API_KEY = "your-api-key"

# Player lookup
resp = requests.get(
    f"{API_BASE}/v1/player/uuid",
    params={"username": "Technoblade"},
    headers={"X-API-Key": API_KEY},
)
data = resp.json()["data"]
print(data["uuid"])`}</CodeBlock>

              <h3 className="text-body font-semibold">WebSocket Subscribe</h3>
              <CodeBlock>{`import asyncio, websockets, json

async def main():
    async with websockets.connect("wss://api.ninja-skyblock.com/ws") as ws:
        await ws.send(json.dumps({
            "type": "subscribe",
            "channel": "bazaar:alerts",
            "filters": {"item_id": "ENCHANTED_DIAMOND"},
        }))
        async for message in ws:
            msg = json.loads(message)
            print(msg["channel"], msg["data"])

asyncio.run(main())`}</CodeBlock>
            </div>
          )}

          {codeTab === "curl" && (
            <div className="space-y-5">
              <h3 className="text-body font-semibold">Authentication & Player Lookup</h3>
              <CodeBlock>{`# Player lookup with API key
curl -H "X-API-Key: your-api-key" \\
  "https://api.ninja-skyblock.com/v1/player/uuid?username=Technoblade"

# Bazaar product
curl -H "X-API-Key: your-api-key" \\
  "https://api.ninja-skyblock.com/v1/bazaar/ENCHANTED_DIAMOND"

# SSE stream (stays open)
curl -N -H "X-API-Key: your-api-key" \\
  "https://api.ninja-skyblock.com/v1/bazaar/stream"`}</CodeBlock>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
