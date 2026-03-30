import { useState } from 'react'
import { Shield, Key, Unlock, Sun, Moon, Menu, Wifi, WifiOff } from 'lucide-react'
import { getSettings, saveSettings } from '@/lib/settings'
import { applyTheme } from '@/lib/theme'
import { useSseLiveStatus } from '@/hooks/useSseLiveStatus'

function formatAgo(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`
}

interface HeaderProps {
  onMenuToggle?: () => void
}

export function Header({ onMenuToggle }: HeaderProps) {
  const settings = getSettings()
  const [theme, setTheme] = useState(settings.theme)
  const { sseActive, sseAgo } = useSseLiveStatus('__bazaar_listing__')

  const authIcon = {
    apikey: <Key size={14} />,
    hmac: <Shield size={14} />,
    bypass: <Unlock size={14} />,
  }[settings.authMode]

  const authLabel = {
    apikey: 'API Key',
    hmac: 'HMAC',
    bypass: 'Dev Bypass',
  }[settings.authMode]

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    saveSettings({ theme: next })
    applyTheme(next)
  }

  return (
    <header className="h-14 glass-heavy border-b border-dungeon/50 flex items-center px-5 gap-4 sticky top-0 z-30">
      <button
        onClick={onMenuToggle}
        className="md:hidden text-muted hover:text-coin transition-colors p-1.5 rounded-lg hover:bg-coin/5"
        aria-label="Toggle menu"
      >
        <Menu size={20} />
      </button>

      <h1 className="font-display text-gradient-coin text-sm tracking-[0.2em] font-semibold hidden md:block">
        NINJA SKYBLOCK
      </h1>

      <div className="ml-auto flex items-center gap-2">
        {/* SSE status */}
        {sseActive ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-mono px-2.5 py-1 rounded-full border border-green-500/20 text-green-400 bg-green-500/5">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-50" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-400" />
            </span>
            <Wifi size={11} />
            SSE
            {sseAgo != null && sseAgo >= 0 && (
              <span className="text-green-400/60">
                · {sseAgo > 0 ? formatAgo(sseAgo) : 'now'}
              </span>
            )}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-xs font-mono px-2.5 py-1 rounded-full border border-muted/20 text-muted/60 bg-muted/5">
            <span className="relative flex h-1.5 w-1.5">
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-muted/40" />
            </span>
            <WifiOff size={11} />
            SSE
          </span>
        )}

        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg text-muted hover:text-coin hover:bg-coin/5 transition-all duration-200"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        <span className="inline-flex items-center gap-1.5 text-xs font-mono text-muted px-2.5 py-1 rounded-lg border border-dungeon/60 bg-dungeon/20">
          {authIcon}
          {authLabel}
        </span>
      </div>
    </header>
  )
}
