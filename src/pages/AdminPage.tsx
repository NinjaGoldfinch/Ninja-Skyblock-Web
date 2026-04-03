import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Plus, Trash2, Key } from "lucide-react";
import {
  getApiKeys,
  generateApiKey,
  getWatchedPlayers,
  addWatchedPlayer,
  removeWatchedPlayer,
} from "@/api/endpoints";
import { DataCard } from "@/components/ui/DataCard";
import { PlayerHead } from "@/components/ui/PlayerHead";
import { CopyButton } from "@/components/ui/CopyButton";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";

type AdminTab = "api-keys" | "watched-players";

function ApiKeysTab() {
  const queryClient = useQueryClient();
  const [owner, setOwner] = useState("");
  const [tier, setTier] = useState<"client" | "public">("client");
  const [rateLimit, setRateLimit] = useState("");
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);

  const {
    data: apiKeysResp,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["apiKeys"],
    queryFn: () => getApiKeys(),
  });

  const apiKeys = apiKeysResp?.data;

  const generateMutation = useMutation({
    mutationFn: () =>
      generateApiKey({
        owner,
        tier,
        rate_limit: rateLimit ? Number(rateLimit) : undefined,
      }),
    onSuccess: (resp) => {
      setGeneratedKey(resp.data.key);
      setOwner("");
      setRateLimit("");
      queryClient.invalidateQueries({ queryKey: ["apiKeys"] });
    },
  });

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!owner.trim()) return;
    generateMutation.mutate();
  };

  return (
    <div className="space-y-6">
      <DataCard>
        <h2 className="text-xs font-semibold text-muted mb-4 flex items-center gap-2 uppercase tracking-wider">
          <Key className="w-4 h-4 text-coin" />
          Generate API Key
        </h2>
        <form onSubmit={handleGenerate} className="space-y-4">
          <div>
            <label className="text-xs text-muted block mb-1.5 font-medium">Owner Name</label>
            <input
              type="text"
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
              placeholder="Key owner..."
              className="w-full px-4 py-2.5 bg-void/50 border border-dungeon/50 text-body text-sm rounded-xl focus:outline-none focus:border-coin/50 placeholder:text-muted/50"
            />
          </div>
          <div>
            <label className="text-xs text-muted block mb-1.5 font-medium">Tier</label>
            <div className="flex gap-5">
              <label className="flex items-center gap-2 text-sm text-body cursor-pointer">
                <input
                  type="radio"
                  name="tier"
                  value="client"
                  checked={tier === "client"}
                  onChange={() => setTier("client")}
                  className="accent-coin"
                />
                Client
              </label>
              <label className="flex items-center gap-2 text-sm text-body cursor-pointer">
                <input
                  type="radio"
                  name="tier"
                  value="public"
                  checked={tier === "public"}
                  onChange={() => setTier("public")}
                  className="accent-coin"
                />
                Public
              </label>
            </div>
          </div>
          <div>
            <label className="text-xs text-muted block mb-1.5 font-medium">
              Rate Limit Override (optional)
            </label>
            <input
              type="number"
              value={rateLimit}
              onChange={(e) => setRateLimit(e.target.value)}
              placeholder="Default"
              className="w-full px-4 py-2.5 bg-void/50 border border-dungeon/50 text-body text-sm rounded-xl focus:outline-none focus:border-coin/50 placeholder:text-muted/50"
            />
          </div>
          <button
            type="submit"
            disabled={generateMutation.isPending}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-coin to-coin-light text-white text-sm font-semibold rounded-xl hover:shadow-lg hover:shadow-coin/20 transition-all disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            {generateMutation.isPending ? "Generating..." : "Generate Key"}
          </button>
          {generateMutation.isError && (
            <p className="text-damage text-sm">Failed to generate key.</p>
          )}
        </form>
      </DataCard>

      {isLoading && <LoadingSkeleton />}
      {error && <ErrorState error={error} />}
      {apiKeys && apiKeys.length > 0 && (
        <div className="rounded-2xl overflow-hidden border border-dungeon/40">
          <table className="w-full text-sm text-body">
            <thead>
              <tr className="glass text-muted text-left">
                <th className="py-3 px-4 text-xs font-medium border-b border-dungeon/30">Owner</th>
                <th className="py-3 px-4 text-xs font-medium border-b border-dungeon/30">Tier</th>
                <th className="py-3 px-4 text-xs font-medium border-b border-dungeon/30">Rate Limit</th>
                <th className="py-3 px-4 text-xs font-medium border-b border-dungeon/30">Created</th>
              </tr>
            </thead>
            <tbody>
              {apiKeys.map((key, i) => (
                <tr
                  key={`${key.owner}-${i}`}
                  className="border-b border-dungeon/15 hover:bg-coin/3 transition-colors"
                >
                  <td className="py-3 px-4 font-medium">{key.owner}</td>
                  <td className="py-3 px-4 capitalize">{key.tier}</td>
                  <td className="py-3 px-4 font-mono">{key.rate_limit}</td>
                  <td className="py-3 px-4 text-muted">{key.created_at}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {generatedKey && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="glass-heavy border border-dungeon/40 rounded-2xl p-7 max-w-md w-full space-y-5 shadow-2xl">
            <h3 className="text-xl font-display text-gradient-coin flex items-center gap-2 font-bold">
              <Key className="w-5 h-5 text-coin" />
              API Key Generated
            </h3>
            <p className="text-sm text-yellow-400 bg-yellow-400/5 border border-yellow-400/15 rounded-xl px-4 py-2.5">
              This key will not be shown again.
            </p>
            <div className="flex items-center gap-2 bg-void/60 border border-dungeon/40 px-4 py-3 rounded-xl">
              <code className="flex-1 text-sm text-body break-all font-mono">
                {generatedKey}
              </code>
              <CopyButton text={generatedKey} />
            </div>
            <button
              onClick={() => setGeneratedKey(null)}
              className="w-full px-5 py-3 bg-gradient-to-r from-coin to-coin-light text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-coin/20 transition-all"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function WatchedPlayersTab() {
  const queryClient = useQueryClient();
  const [addInput, setAddInput] = useState("");

  const {
    data: playersResp,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["watchedPlayers"],
    queryFn: () => getWatchedPlayers(),
  });

  const players = playersResp?.data;

  const addMutation = useMutation({
    mutationFn: (uuidOrName: string) => addWatchedPlayer(uuidOrName),
    onSuccess: () => {
      setAddInput("");
      queryClient.invalidateQueries({ queryKey: ["watchedPlayers"] });
    },
  });

  const removeMutation = useMutation({
    mutationFn: (uuid: string) => removeWatchedPlayer(uuid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["watchedPlayers"] });
    },
  });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addInput.trim()) return;
    addMutation.mutate(addInput.trim());
  };

  const handleRemove = (uuid: string) => {
    if (window.confirm(`Remove watched player ${uuid}?`)) {
      removeMutation.mutate(uuid);
    }
  };

  return (
    <div className="space-y-6">
      <DataCard>
        <h2 className="text-xs font-semibold text-muted mb-4 uppercase tracking-wider">
          Add Watched Player
        </h2>
        <form onSubmit={handleAdd} className="flex gap-3">
          <input
            type="text"
            value={addInput}
            onChange={(e) => setAddInput(e.target.value)}
            placeholder="UUID or username..."
            className="flex-1 px-4 py-2.5 bg-void/50 border border-dungeon/50 text-body text-sm rounded-xl focus:outline-none focus:border-coin/50 placeholder:text-muted/50"
          />
          <button
            type="submit"
            disabled={addMutation.isPending}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-coin to-coin-light text-white text-sm font-semibold rounded-xl hover:shadow-lg hover:shadow-coin/20 transition-all disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            Add
          </button>
        </form>
        {addMutation.isError && (
          <p className="text-damage text-sm mt-2">Failed to add player.</p>
        )}
      </DataCard>

      {isLoading && <LoadingSkeleton />}
      {error && <ErrorState error={error} />}

      {players && players.length > 0 && (
        <div className="space-y-2">
          {players.map((player) => (
            <div
              key={player.uuid}
              className="flex items-center gap-4 px-5 py-4 glass rounded-2xl border border-dungeon/40 hover:border-dungeon/60 transition-all"
            >
              <PlayerHead uuid={player.uuid} />
              <div className="flex-1 min-w-0">
                <Link
                  to={`/player?id=${player.uuid}`}
                  className="font-mono text-sm text-coin hover:text-coin-light transition-colors"
                >
                  {player.uuid}
                </Link>
                {player.username && (
                  <p className="text-sm text-body">{player.username}</p>
                )}
              </div>
              <button
                onClick={() => handleRemove(player.uuid)}
                disabled={removeMutation.isPending}
                className="p-2.5 text-damage/70 hover:text-damage hover:bg-damage/5 rounded-xl transition-all disabled:opacity-50"
                title="Remove player"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
      {players && players.length === 0 && (
        <p className="text-muted text-center py-12">No watched players.</p>
      )}
    </div>
  );
}

const adminTabs: { key: AdminTab; label: string }[] = [
  { key: "api-keys", label: "API Keys" },
  { key: "watched-players", label: "Watched Players" },
];

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<AdminTab>("api-keys");

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-4xl font-display text-gradient-coin font-bold">Admin</h1>

      <div className="flex gap-1 border-b border-dungeon/40">
        {adminTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-5 py-2.5 text-sm font-medium transition-all rounded-t-xl ${
              activeTab === tab.key
                ? "border-b-2 border-coin text-coin bg-coin/5"
                : "text-muted hover:text-body hover:bg-dungeon/20"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div>
        {activeTab === "api-keys" && <ApiKeysTab />}
        {activeTab === "watched-players" && <WatchedPlayersTab />}
      </div>
    </div>
  );
}
