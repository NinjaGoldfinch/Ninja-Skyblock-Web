import { useState, useCallback, useEffect } from "react";
import { DataCard } from "@/components/ui/DataCard";
import { CopyButton } from "@/components/ui/CopyButton";
import { JsonViewer } from "@/components/ui/JsonViewer";
import { getSettings } from "@/lib/settings";
import { buildAuthHeaders } from "@/lib/auth";

interface EndpointDef {
  method: string;
  path: string;
  description: string;
  group: string;
}

const ENDPOINTS: EndpointDef[] = [
  // v1
  { method: "GET", path: "/v1/profile", description: "Get player profile", group: "v1" },
  { method: "GET", path: "/v1/profiles", description: "Get all profiles", group: "v1" },
  { method: "GET", path: "/v1/bazaar", description: "Get all bazaar products", group: "v1" },
  { method: "GET", path: "/v1/bazaar/:itemId", description: "Get bazaar product", group: "v1" },
  { method: "GET", path: "/v1/auctions/player", description: "Get player auctions", group: "v1" },
  { method: "GET", path: "/v1/auctions/ended", description: "Get ended auctions", group: "v1" },
  { method: "GET", path: "/v1/collections", description: "Get collections", group: "v1" },
  { method: "GET", path: "/v1/skills", description: "Get skills", group: "v1" },
  { method: "GET", path: "/v1/items", description: "Get all items", group: "v1" },
  { method: "GET", path: "/v1/election", description: "Get election data", group: "v1" },
  { method: "GET", path: "/v1/player/uuid", description: "Lookup player UUID", group: "v1" },
  { method: "GET", path: "/v1/player/username", description: "Lookup player username", group: "v1" },
  // v2
  { method: "GET", path: "/v2/profile", description: "Enhanced profile", group: "v2" },
  { method: "GET", path: "/v2/bazaar/:itemId", description: "Enhanced bazaar product", group: "v2" },
  { method: "GET", path: "/v2/bazaar/:itemId/history", description: "Bazaar history", group: "v2" },
  { method: "GET", path: "/v2/auctions/lowest", description: "Lowest BIN auctions", group: "v2" },
  { method: "GET", path: "/v2/auctions/lowest/:item", description: "Lowest BIN for item", group: "v2" },
  { method: "GET", path: "/v2/auctions/search", description: "Search auctions", group: "v2" },
  { method: "GET", path: "/v2/items", description: "Enhanced items list", group: "v2" },
  { method: "GET", path: "/v2/items/:itemId", description: "Item detail", group: "v2" },
  { method: "GET", path: "/v2/items/lookup/:name", description: "Lookup item by name", group: "v2" },
  // admin
  { method: "POST", path: "/admin/keys", description: "Create API key", group: "admin" },
  { method: "GET", path: "/admin/watched-players", description: "List watched players", group: "admin" },
  { method: "POST", path: "/admin/watched-players", description: "Add watched player", group: "admin" },
  { method: "DELETE", path: "/admin/watched-players", description: "Remove watched player", group: "admin" },
];

interface HistoryEntry {
  method: string;
  path: string;
  status: number;
  time: number;
  timestamp: string;
}

const HISTORY_KEY = "ninja-skyblock-explorer-history";

function getHistory(): HistoryEntry[] {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveHistory(entries: HistoryEntry[]) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(entries.slice(-20)));
}

function extractPathParams(path: string): string[] {
  const matches = path.match(/:(\w+)/g);
  return matches ? matches.map((m) => m.slice(1)) : [];
}

function getQueryParams(path: string): string[] {
  if (path.includes("/auctions/search")) return ["search"];
  if (path.includes("/auctions/lowest") && !path.includes(":")) return ["key_by"];
  if (path.includes("/player/uuid")) return ["username"];
  if (path.includes("/player/username")) return ["uuid"];
  if (path.includes("/v1/profile") || path.includes("/v2/profile")) return ["uuid", "profile"];
  if (path.includes("/v1/profiles")) return ["uuid"];
  if (path.includes("/auctions/player")) return ["uuid"];
  return [];
}

export default function ApiExplorerPage() {
  const firstEndpoint = ENDPOINTS[0];
  const [selectedEndpoint, setSelectedEndpoint] = useState(
    firstEndpoint ? `${firstEndpoint.method} ${firstEndpoint.path}` : ""
  );
  const [pathParams, setPathParams] = useState<Record<string, string>>({});
  const [queryParams, setQueryParams] = useState<Record<string, string>>({});
  const [authMode, setAuthMode] = useState<"apikey" | "hmac" | "dev">("apikey");
  const [authValue, setAuthValue] = useState(() => {
    try {
      const settings = getSettings();
      return (settings as any)?.apiKey || "";
    } catch {
      return "";
    }
  });
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<{
    status: number;
    data: unknown;
    headers: Record<string, string>;
    time: number;
  } | null>(null);
  const [activeTab, setActiveTab] = useState<"response" | "history">("response");
  const [history, setHistory] = useState<HistoryEntry[]>(getHistory);

  const parsed = selectedEndpoint.split(" ");
  const method = parsed[0] ?? "GET";
  const pathTemplate = parsed.slice(1).join(" ");
  const pathParamNames = extractPathParams(pathTemplate);
  const queryParamNames = getQueryParams(pathTemplate);

  useEffect(() => {
    setPathParams({});
    setQueryParams({});
    setResponse(null);
  }, [selectedEndpoint]);

  const buildUrl = useCallback(() => {
    const settings = getSettings() as any;
    const base = settings?.apiBase || window.location.origin;
    let path = pathTemplate;
    for (const [key, value] of Object.entries(pathParams)) {
      path = path.replace(`:${key}`, encodeURIComponent(value));
    }
    const qp = new URLSearchParams();
    for (const [key, value] of Object.entries(queryParams)) {
      if (value) qp.set(key, value);
    }
    const qs = qp.toString();
    return `${base}${path}${qs ? `?${qs}` : ""}`;
  }, [pathTemplate, pathParams, queryParams]);

  const buildHeaders = useCallback((): Record<string, string> => {
    try {
      return buildAuthHeaders();
    } catch {
      if (authMode === "apikey") return { "X-API-Key": authValue };
      if (authMode === "dev") return { "X-Dev-Key": authValue };
      return {};
    }
  }, [authMode, authValue]);

  const buildCurl = useCallback(() => {
    const url = buildUrl();
    const headers = buildHeaders();
    const headerFlags = Object.entries(headers)
      .map(([k, v]) => `-H "${k}: ${v}"`)
      .join(" \\\n  ");
    const methodFlag = method !== "GET" ? `-X ${method} ` : "";
    return `curl ${methodFlag}${headerFlags ? headerFlags + " \\\n  " : ""}"${url}"`;
  }, [buildUrl, buildHeaders, method]);

  const handleSend = useCallback(async () => {
    setLoading(true);
    setActiveTab("response");
    const url = buildUrl();
    const headers = buildHeaders();
    const start = performance.now();

    try {
      const res = await fetch(url, {
        method,
        headers,
      });
      const elapsed = Math.round(performance.now() - start);
      const data = await res.json().catch(() => null);
      const resHeaders: Record<string, string> = {};
      res.headers.forEach((v, k) => {
        resHeaders[k] = v;
      });

      setResponse({ status: res.status, data, headers: resHeaders, time: elapsed });

      const entry: HistoryEntry = {
        method,
        path: pathTemplate,
        status: res.status,
        time: elapsed,
        timestamp: new Date().toISOString(),
      };
      const updated = [...history, entry].slice(-20);
      setHistory(updated);
      saveHistory(updated);
    } catch (err) {
      const elapsed = Math.round(performance.now() - start);
      setResponse({
        status: 0,
        data: { error: String(err) },
        headers: {},
        time: elapsed,
      });
    } finally {
      setLoading(false);
    }
  }, [buildUrl, buildHeaders, method, pathTemplate, history]);

  const loadFromHistory = (entry: HistoryEntry) => {
    const match = ENDPOINTS.find(
      (e) => e.method === entry.method && e.path === entry.path
    );
    if (match) {
      setSelectedEndpoint(`${match.method} ${match.path}`);
      setActiveTab("response");
    }
  };

  const statusColor = response
    ? response.status >= 200 && response.status < 300
      ? "bg-green-500/10 text-green-400 border-green-500/20"
      : response.status >= 400 && response.status < 500
      ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
      : "bg-red-500/10 text-red-400 border-red-500/20"
    : "";

  const groups = ["v1", "v2", "admin"] as const;

  return (
    <div className="animate-fade-in">
      <h1 className="font-display text-gradient-coin text-4xl font-bold mb-6">API Explorer</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Request pane */}
        <DataCard>
          <h2 className="text-body-light font-semibold mb-5 text-lg">Request</h2>

          <label className="block text-muted text-xs mb-1.5 font-medium">Endpoint</label>
          <select
            value={selectedEndpoint}
            onChange={(e) => setSelectedEndpoint(e.target.value)}
            className="w-full bg-void/50 border border-dungeon/50 text-body font-mono text-sm px-4 py-3 rounded-xl mb-5"
          >
            {groups.map((g) => (
              <optgroup key={g} label={g.toUpperCase()}>
                {ENDPOINTS.filter((e) => e.group === g).map((e) => (
                  <option
                    key={`${e.method} ${e.path}`}
                    value={`${e.method} ${e.path}`}
                  >
                    {e.method} {e.path} - {e.description}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>

          {pathParamNames.length > 0 && (
            <div className="mb-5">
              <h3 className="text-muted text-xs mb-2 font-medium uppercase tracking-wider">Path Parameters</h3>
              <div className="space-y-2">
                {pathParamNames.map((name) => (
                  <div key={name}>
                    <label className="block text-muted text-xs mb-1">:{name}</label>
                    <input
                      type="text"
                      value={pathParams[name] || ""}
                      onChange={(e) =>
                        setPathParams((p) => ({ ...p, [name]: e.target.value }))
                      }
                      placeholder={name}
                      className="w-full bg-void/50 border border-dungeon/50 text-body font-mono text-sm px-4 py-2.5 rounded-xl placeholder:text-muted/50"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {queryParamNames.length > 0 && (
            <div className="mb-5">
              <h3 className="text-muted text-xs mb-2 font-medium uppercase tracking-wider">Query Parameters</h3>
              <div className="space-y-2">
                {queryParamNames.map((name) => (
                  <div key={name}>
                    <label className="block text-muted text-xs mb-1">{name}</label>
                    <input
                      type="text"
                      value={queryParams[name] || ""}
                      onChange={(e) =>
                        setQueryParams((p) => ({ ...p, [name]: e.target.value }))
                      }
                      placeholder={name}
                      className="w-full bg-void/50 border border-dungeon/50 text-body font-mono text-sm px-4 py-2.5 rounded-xl placeholder:text-muted/50"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mb-5">
            <h3 className="text-muted text-xs mb-2 font-medium uppercase tracking-wider">Authentication</h3>
            <div className="flex gap-4 mb-3">
              {(
                [
                  ["apikey", "API Key"],
                  ["hmac", "HMAC"],
                  ["dev", "Dev Bypass"],
                ] as const
              ).map(([mode, label]) => (
                <label key={mode} className="flex items-center gap-2 text-body text-sm cursor-pointer">
                  <input
                    type="radio"
                    name="auth"
                    checked={authMode === mode}
                    onChange={() => setAuthMode(mode)}
                    className="accent-coin"
                  />
                  {label}
                </label>
              ))}
            </div>
            <input
              type="text"
              value={authValue}
              onChange={(e) => setAuthValue(e.target.value)}
              placeholder={
                authMode === "apikey"
                  ? "API Key"
                  : authMode === "hmac"
                  ? "HMAC Secret"
                  : "Dev Key"
              }
              className="w-full bg-void/50 border border-dungeon/50 text-body font-mono text-sm px-4 py-2.5 rounded-xl placeholder:text-muted/50"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSend}
              disabled={loading}
              className="bg-gradient-to-r from-coin to-coin-light text-white font-semibold px-6 py-2.5 rounded-xl text-sm disabled:opacity-50 flex items-center gap-2 hover:shadow-lg hover:shadow-coin/20 transition-all"
            >
              {loading && (
                <svg
                  className="animate-spin h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
              )}
              Send
            </button>
            <CopyButton text={buildCurl()} />
          </div>
        </DataCard>

        {/* Response pane */}
        <DataCard>
          <div className="flex gap-1 border-b border-dungeon/40 mb-5">
            <button
              className={`px-5 py-2.5 text-sm font-medium transition-all rounded-t-xl ${
                activeTab === "response"
                  ? "border-b-2 border-coin text-coin bg-coin/5"
                  : "text-muted hover:text-body hover:bg-dungeon/20"
              }`}
              onClick={() => setActiveTab("response")}
            >
              Response
            </button>
            <button
              className={`px-5 py-2.5 text-sm font-medium transition-all rounded-t-xl ${
                activeTab === "history"
                  ? "border-b-2 border-coin text-coin bg-coin/5"
                  : "text-muted hover:text-body hover:bg-dungeon/20"
              }`}
              onClick={() => setActiveTab("history")}
            >
              History ({history.length})
            </button>
          </div>

          {activeTab === "response" && (
            <>
              {response ? (
                <div className="space-y-5">
                  <div className="flex items-center gap-3">
                    <span
                      className={`px-3 py-1 rounded-lg text-xs font-bold border ${statusColor}`}
                    >
                      {response.status || "ERR"}
                    </span>
                    <span className="text-muted text-xs font-mono">{response.time}ms</span>
                  </div>

                  <div>
                    <h3 className="text-muted text-xs mb-2 font-medium">Body</h3>
                    <div className="bg-void/40 border border-dungeon/30 rounded-xl p-4 overflow-x-auto max-h-[400px] overflow-y-auto">
                      <JsonViewer data={response.data} />
                    </div>
                  </div>

                  {Object.keys(response.headers).length > 0 && (
                    <div>
                      <h3 className="text-muted text-xs mb-2 font-medium">Response Headers</h3>
                      <div className="bg-void/40 border border-dungeon/30 rounded-xl overflow-x-auto">
                        <table className="w-full text-xs">
                          <tbody>
                            {Object.entries(response.headers).map(([k, v]) => (
                              <tr
                                key={k}
                                className="border-b border-dungeon/15 last:border-b-0"
                              >
                                <td className="px-4 py-2 font-mono text-coin whitespace-nowrap">
                                  {k}
                                </td>
                                <td className="px-4 py-2 font-mono text-body">
                                  {v}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-muted text-sm py-8 text-center">
                  Send a request to see the response here.
                </p>
              )}
            </>
          )}

          {activeTab === "history" && (
            <div className="space-y-0">
              {history.length === 0 ? (
                <p className="text-muted text-sm py-8 text-center">No requests yet.</p>
              ) : (
                <div className="bg-void/40 border border-dungeon/30 rounded-xl overflow-y-auto max-h-[500px]">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 glass border-b border-dungeon/30">
                      <tr className="text-muted text-left">
                        <th className="px-4 py-3 font-medium">Method</th>
                        <th className="px-4 py-3 font-medium">Path</th>
                        <th className="px-4 py-3 font-medium">Status</th>
                        <th className="px-4 py-3 font-medium">Time</th>
                        <th className="px-4 py-3 font-medium">When</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...history].reverse().map((entry, i) => {
                        const sc =
                          entry.status >= 200 && entry.status < 300
                            ? "text-green-400"
                            : entry.status >= 400 && entry.status < 500
                            ? "text-yellow-400"
                            : "text-red-400";
                        return (
                          <tr
                            key={i}
                            className="border-b border-dungeon/15 hover:bg-coin/3 cursor-pointer transition-colors"
                            onClick={() => loadFromHistory(entry)}
                          >
                            <td className="px-4 py-2.5 font-mono text-coin font-medium">
                              {entry.method}
                            </td>
                            <td className="px-4 py-2.5 font-mono text-body">
                              {entry.path}
                            </td>
                            <td className={`px-4 py-2.5 font-mono ${sc}`}>
                              {entry.status}
                            </td>
                            <td className="px-4 py-2.5 text-muted">
                              {entry.time}ms
                            </td>
                            <td className="px-4 py-2.5 text-muted whitespace-nowrap">
                              {new Date(entry.timestamp).toLocaleTimeString()}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </DataCard>
      </div>
    </div>
  );
}
