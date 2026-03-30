import { useState } from "react";
import { toast } from "sonner";
import { Eye, EyeOff, Save } from "lucide-react";
import { saveSettings, getSettings } from "@/lib/settings";
import { applyTheme } from "@/lib/theme";
import type { AppSettings } from "@/types/api";

export default function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = getSettings();
    return {
      apiBaseUrl: saved.apiBaseUrl ?? "http://localhost:3000",
      authMode: saved.authMode ?? "bypass",
      apiKey: saved.apiKey ?? "",
      hmacSecret: saved.hmacSecret ?? "",
      autoRefreshInterval: saved.autoRefreshInterval ?? 60,
      priceAbbreviated: saved.priceAbbreviated ?? true,
      theme: saved.theme ?? "dark",
      showChartAnnotations: saved.showChartAnnotations ?? true,
      showStatsBar: saved.showStatsBar ?? true,
      liveDataMode: saved.liveDataMode ?? 'off',
    };
  });

  const [showApiKey, setShowApiKey] = useState(false);
  const [showHmacSecret, setShowHmacSecret] = useState(false);

  const handleSave = () => {
    saveSettings(settings);
    toast.success("Settings saved successfully");
  };

  const update = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="animate-fade-in">
      <div className="mx-auto max-w-2xl space-y-5">
        <h1 className="font-display text-4xl text-gradient-coin font-bold mb-2">Settings</h1>
        <p className="text-muted text-sm mb-6">Configure your dashboard preferences</p>

        {/* API Base URL */}
        <div className="glass rounded-2xl border border-dungeon/40 p-6 space-y-3">
          <label className="block font-display text-sm text-gradient-coin font-semibold">
            API Base URL
          </label>
          <input
            type="text"
            value={settings.apiBaseUrl}
            onChange={(e) => update("apiBaseUrl", e.target.value)}
            className="w-full border border-dungeon/50 bg-void/50 px-4 py-3 font-mono text-body placeholder-muted rounded-xl focus:border-coin/50 focus:outline-none"
          />
        </div>

        {/* Auth Mode */}
        <div className="glass rounded-2xl border border-dungeon/40 p-6 space-y-4">
          <span className="block font-display text-sm text-gradient-coin font-semibold">
            Authentication Mode
          </span>
          <div className="flex flex-col gap-3">
            {([
              ["apikey", "API Key"],
              ["hmac", "HMAC"],
              ["bypass", "Dev Bypass"],
            ] as const).map(([value, label]) => (
              <label key={value} className="flex items-center gap-3 text-body cursor-pointer group">
                <input
                  type="radio"
                  name="authMode"
                  value={value}
                  checked={settings.authMode === value}
                  onChange={() => update("authMode", value)}
                  className="accent-coin w-4 h-4"
                />
                <span className="group-hover:text-body-light transition-colors">{label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* API Key */}
        <div className="glass rounded-2xl border border-dungeon/40 p-6 space-y-3">
          <label className="block font-display text-sm text-gradient-coin font-semibold">
            API Key
          </label>
          <div className="relative">
            <input
              type={showApiKey ? "text" : "password"}
              value={settings.apiKey}
              onChange={(e) => update("apiKey", e.target.value)}
              className="w-full border border-dungeon/50 bg-void/50 px-4 py-3 pr-12 font-mono text-body placeholder-muted rounded-xl focus:border-coin/50 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setShowApiKey((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-coin p-1 rounded-lg transition-colors"
            >
              {showApiKey ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        {/* HMAC Secret */}
        <div className="glass rounded-2xl border border-dungeon/40 p-6 space-y-3">
          <label className="block font-display text-sm text-gradient-coin font-semibold">
            HMAC Secret
          </label>
          <div className="relative">
            <input
              type={showHmacSecret ? "text" : "password"}
              value={settings.hmacSecret}
              onChange={(e) => update("hmacSecret", e.target.value)}
              className="w-full border border-dungeon/50 bg-void/50 px-4 py-3 pr-12 font-mono text-body placeholder-muted rounded-xl focus:border-coin/50 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setShowHmacSecret((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-coin p-1 rounded-lg transition-colors"
            >
              {showHmacSecret ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        {/* Auto-Refresh Interval */}
        <div className="glass rounded-2xl border border-dungeon/40 p-6 space-y-3">
          <label className="block font-display text-sm text-gradient-coin font-semibold">
            Auto-Refresh Interval (seconds)
          </label>
          <input
            type="number"
            min={5}
            value={settings.autoRefreshInterval}
            onChange={(e) =>
              update("autoRefreshInterval", Number(e.target.value))
            }
            className="w-36 border border-dungeon/50 bg-void/50 px-4 py-3 font-mono text-body placeholder-muted rounded-xl focus:border-coin/50 focus:outline-none"
          />
        </div>

        {/* Theme */}
        <div className="glass rounded-2xl border border-dungeon/40 p-6 space-y-4">
          <span className="block font-display text-sm text-gradient-coin font-semibold">
            Theme
          </span>
          <div className="flex flex-col gap-3">
            {([
              ["dark", "Dark"],
              ["light", "Light"],
            ] as const).map(([value, label]) => (
              <label key={value} className="flex items-center gap-3 text-body cursor-pointer group">
                <input
                  type="radio"
                  name="theme"
                  value={value}
                  checked={settings.theme === value}
                  onChange={() => {
                    update("theme", value);
                    applyTheme(value);
                  }}
                  className="accent-coin w-4 h-4"
                />
                <span className="group-hover:text-body-light transition-colors">{label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Price Display */}
        <div className="glass rounded-2xl border border-dungeon/40 p-6 space-y-4">
          <span className="block font-display text-sm text-gradient-coin font-semibold">
            Price Display
          </span>
          <label className="flex items-center gap-3 text-body cursor-pointer">
            <input
              type="checkbox"
              checked={settings.priceAbbreviated}
              onChange={(e) => update("priceAbbreviated", e.target.checked)}
              className="accent-coin w-4 h-4 rounded"
            />
            Abbreviate prices (e.g. 1.5M instead of 1,500,000)
          </label>
        </div>

        {/* Live Data Mode */}
        <div className="glass rounded-2xl border border-dungeon/40 p-6 space-y-4">
          <span className="block font-display text-sm text-gradient-coin font-semibold">
            Live Data Mode
          </span>
          <p className="text-muted text-xs">
            Controls how SSE events update bazaar data in real-time.
          </p>
          <div className="flex flex-col gap-3">
            {([
              ["off", "Off", "No live updates from SSE (default)"],
              ["full", "Full Data", "SSE events update displayed prices in real-time"],
              ["extrapolated", "Extrapolated", "Prices update + chart history appends datapoints with carry-forward fill"],
            ] as const).map(([value, label, desc]) => (
              <label key={value} className="flex items-start gap-3 text-body cursor-pointer group">
                <input
                  type="radio"
                  name="liveDataMode"
                  value={value}
                  checked={settings.liveDataMode === value}
                  onChange={() => update("liveDataMode", value)}
                  className="accent-coin w-4 h-4 mt-0.5"
                />
                <div>
                  <span className="group-hover:text-body-light transition-colors font-medium">{label}</span>
                  <p className="text-muted text-xs mt-0.5">{desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          className="flex items-center gap-2.5 bg-gradient-to-r from-coin to-coin-light text-white px-7 py-3 font-semibold rounded-xl hover:shadow-lg hover:shadow-coin/20 transition-all hover:-translate-y-0.5 active:translate-y-0"
        >
          <Save size={16} />
          Save Settings
        </button>
      </div>
    </div>
  );
}
