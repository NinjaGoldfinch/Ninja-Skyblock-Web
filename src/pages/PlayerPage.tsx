import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";

import { DataCard } from "@/components/ui/DataCard";
import { PlayerHead } from "@/components/ui/PlayerHead";
import { CardSkeleton, LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { JsonViewer } from "@/components/ui/JsonViewer";
import { resolveUsername, getProfiles, getProfile } from "@/api/endpoints";
import { formatCoins } from "@/lib/format";
import type { ProfileSummary, ProfileV2 } from "@/types/api";

export default function PlayerPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const paramId = searchParams.get("id") ?? undefined;
  const paramUsername = searchParams.get("username") ?? undefined;

  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [showRawJson, setShowRawJson] = useState(false);

  const {
    data: resolvedResp,
    isLoading: resolvingUsername,
    isError: resolveError,
    error: resolveErrorData,
  } = useQuery({
    queryKey: ["resolveUsername", paramUsername],
    queryFn: () => resolveUsername(paramUsername!),
    enabled: !!paramUsername && !paramId,
  });

  const uuid = paramId ?? resolvedResp?.data?.id;

  const {
    data: profilesResp,
    isLoading: profilesLoading,
    isError: profilesError,
    error: profilesErrorData,
  } = useQuery({
    queryKey: ["profiles", uuid],
    queryFn: () => getProfiles(uuid!),
    enabled: !!uuid,
  });

  const rawProfiles = profilesResp?.data as { profiles?: ProfileSummary[] } | ProfileSummary[] | undefined;
  const profiles: ProfileSummary[] | undefined = Array.isArray(rawProfiles)
    ? rawProfiles
    : rawProfiles?.profiles;

  useEffect(() => {
    if (profiles && profiles.length > 0 && !selectedProfileId) {
      const selected = profiles.find((p) => p.selected) ?? profiles[0];
      if (selected) setSelectedProfileId(selected.profile_id);
    }
  }, [profiles, selectedProfileId]);

  const activeProfileId =
    selectedProfileId ??
    profiles?.find((p) => p.selected)?.profile_id ??
    profiles?.[0]?.profile_id;

  const {
    data: profileResp,
    isLoading: profileLoading,
    isError: profileError,
    error: profileErrorData,
  } = useQuery({
    queryKey: ["profile", uuid, activeProfileId],
    queryFn: () => getProfile(activeProfileId!),
    enabled: !!uuid && !!activeProfileId,
  });

  const profile: ProfileV2 | undefined = profileResp?.data;
  const displayUsername = paramUsername ?? paramId ?? "Unknown";

  // No params: show search form
  if (!paramId && !paramUsername) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center animate-fade-in">
        <div className="max-w-md w-full">
          <h1 className="font-display text-gradient-coin text-4xl mb-2 text-center font-bold">Player Lookup</h1>
          <p className="text-muted text-sm text-center mb-8">Search for any SkyBlock player</p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const trimmed = searchInput.trim();
              if (!trimmed) return;
              const stripped = trimmed.replace(/-/g, "");
              if (/^[0-9a-fA-F]{32}$/.test(stripped)) {
                navigate(`/player?id=${encodeURIComponent(trimmed)}`);
              } else {
                navigate(`/player?username=${encodeURIComponent(trimmed)}`);
              }
            }}
            className="flex gap-3"
          >
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Username or UUID..."
                className="w-full bg-nightstone border border-dungeon/50 text-body font-mono pl-11 pr-4 py-3 rounded-xl focus:outline-none focus:border-coin/50"
              />
            </div>
            <button
              type="submit"
              className="bg-gradient-to-r from-coin to-coin-light text-white font-semibold px-6 py-3 rounded-xl hover:shadow-lg hover:shadow-coin/20 transition-all duration-200"
            >
              Search
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (resolvingUsername || profilesLoading) {
    return (
      <div className="max-w-5xl mx-auto animate-fade-in">
        <h1 className="font-display text-gradient-coin text-4xl mb-6 font-bold">Player Lookup</h1>
        <LoadingSkeleton />
      </div>
    );
  }

  if (resolveError) {
    return (
      <div className="max-w-5xl mx-auto animate-fade-in">
        <h1 className="font-display text-gradient-coin text-4xl mb-6 font-bold">Player Lookup</h1>
        <ErrorState error={resolveErrorData instanceof Error ? resolveErrorData : new Error("Failed to resolve username")} />
      </div>
    );
  }

  if (profilesError) {
    return (
      <div className="max-w-5xl mx-auto animate-fade-in">
        <h1 className="font-display text-gradient-coin text-4xl mb-6 font-bold">Player Lookup</h1>
        <ErrorState error={profilesErrorData instanceof Error ? profilesErrorData : new Error("Failed to fetch profiles")} />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto animate-fade-in">
      <h1 className="font-display text-gradient-coin text-4xl mb-6 font-bold">Player Lookup</h1>

      {/* Player Header */}
      {uuid && (
        <DataCard>
          <div className="flex items-center gap-4">
            <PlayerHead uuid={uuid} size={64} />
            <div>
              <p className="text-body-light font-semibold text-xl">{displayUsername}</p>
              {profiles?.find((p) => p.profile_id === activeProfileId)?.cute_name && (
                <p className="text-muted text-sm">{profiles.find((p) => p.profile_id === activeProfileId)!.cute_name}</p>
              )}
            </div>
          </div>
        </DataCard>
      )}

      {/* Profile Tabs */}
      {profiles && profiles.length > 0 && (
        <div className="flex gap-1 mt-5 mb-5 border-b border-dungeon/40 overflow-x-auto">
          {profiles.map((p) => (
            <button
              key={p.profile_id}
              onClick={() => setSelectedProfileId(p.profile_id)}
              className={`px-5 py-2.5 text-sm font-medium transition-all whitespace-nowrap rounded-t-xl ${
                activeProfileId === p.profile_id
                  ? "border-b-2 border-coin text-coin bg-coin/5"
                  : "text-muted hover:text-body hover:bg-dungeon/20"
              }`}
            >
              {p.cute_name}
            </button>
          ))}
        </div>
      )}

      {/* Profile Content */}
      {profileLoading && <CardSkeleton />}
      {profileError && (
        <ErrorState error={profileErrorData instanceof Error ? profileErrorData : new Error("Failed to load profile")} />
      )}

      {profile && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 stagger-children">
          {/* Skills */}
          <DataCard title="Skills" className="md:col-span-2">
            <p className="text-muted text-sm mb-4">
              Skill Average: <span className="text-coin font-semibold text-base">{profile.skill_average?.toFixed(2) ?? "--"}</span>
            </p>
            <div className="space-y-3">
              {Object.entries(profile.skills ?? {}).map(([name, skill]) => (
                <div key={name}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="text-body capitalize font-medium">{name}</span>
                    <span className="text-muted font-mono text-xs">
                      Lv {skill.level}{skill.maxLevel ? `/${skill.maxLevel}` : ''} &middot; {skill.xp.toLocaleString()} XP
                    </span>
                  </div>
                  <div className="h-2 bg-dungeon/40 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-coin to-coin-light rounded-full transition-all duration-500"
                      style={{ width: `${(skill.progress * 100).toFixed(1)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </DataCard>

          {/* Slayers */}
          <DataCard title="Slayers">
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(profile.slayers ?? {}).map(([name, slayer]) => (
                <div key={name} className="bg-void/40 border border-dungeon/30 rounded-xl p-3.5">
                  <p className="text-body font-medium capitalize text-sm">{name}</p>
                  <p className="text-gradient-coin text-2xl font-display font-bold">{slayer.level}</p>
                  <p className="text-muted text-xs font-mono">{slayer.xp.toLocaleString()} XP</p>
                </div>
              ))}
            </div>
          </DataCard>

          {/* Dungeons */}
          <DataCard title="Dungeons">
            <div className="mb-4">
              <p className="text-body text-sm">Catacombs Level</p>
              <p className="text-gradient-coin text-3xl font-display font-bold">{profile.dungeons?.catacombs_level ?? "--"}</p>
              <p className="text-muted text-xs font-mono">{(profile.dungeons?.catacombs_xp ?? 0).toLocaleString()} XP</p>
            </div>
            <div className="space-y-3">
              {(() => {
                const dungeons = profile.dungeons;
                if (!dungeons) return null;
                // Handle both class_levels (Record<string,number>) and classes (Record<string,DungeonClass>)
                const entries: [string, { level: number; progress?: number }][] = dungeons.classes
                  ? Object.entries(dungeons.classes)
                  : dungeons.class_levels
                    ? Object.entries(dungeons.class_levels).map(([k, v]) => [k, { level: v as number }])
                    : [];
                return entries.map(([name, cls]) => (
                  <div key={name}>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="text-body capitalize font-medium">{name}</span>
                      <span className="text-muted font-mono text-xs">Lv {cls.level}</span>
                    </div>
                    {cls.progress != null && (
                      <div className="h-2 bg-dungeon/40 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-enchant to-enchant-light rounded-full transition-all duration-500"
                          style={{ width: `${(cls.progress * 100).toFixed(1)}%` }}
                        />
                      </div>
                    )}
                  </div>
                ));
              })()}
            </div>
          </DataCard>

          {/* Networth */}
          <DataCard title="Networth" className="md:col-span-2">
            <p className="text-gradient-coin text-3xl font-display font-bold mb-5">
              {formatCoins(profile.networth?.total ?? 0)}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {Object.entries(profile.networth?.breakdown ?? {}).map(([key, value]) => (
                <div key={key} className="bg-void/40 border border-dungeon/30 rounded-xl p-3">
                  <p className="text-muted text-xs capitalize mb-1">{key}</p>
                  <p className="text-body text-sm font-mono">{formatCoins(value as number)}</p>
                </div>
              ))}
            </div>
          </DataCard>

          {/* Raw JSON */}
          <DataCard title="Raw Data" className="md:col-span-2">
            <button
              onClick={() => setShowRawJson(!showRawJson)}
              className="text-muted hover:text-coin text-sm transition-colors mb-3 font-medium"
            >
              {showRawJson ? "Hide JSON" : "Show JSON"}
            </button>
            {showRawJson && <JsonViewer data={profile} />}
          </DataCard>
        </div>
      )}
    </div>
  );
}
