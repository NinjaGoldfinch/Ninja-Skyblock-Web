import { useState, useEffect } from 'react'
import { Shield, Key, Unlock, Sun, Moon, Menu, WifiOff, BarChart3, Gavel } from 'lucide-react'
import { getSettings, saveSettings } from '@/lib/settings'
import { applyTheme } from '@/lib/theme'
import { sseClient, auctionSseClient } from '@/api/sse'

interface HeaderProps {
  onMenuToggle?: () => void
}

export function Header({ onMenuToggle }: HeaderProps) {
  const settings = getSettings()
  const [theme, setTheme] = useState(settings.theme)
  // Track SSE connection state directly from clients — no event bus dependency
  const [bazaarActive, setBazaarActive] = useState(() => sseClient.state === 'connected')
  const [auctionActive, setAuctionActive] = useState(() => auctionSseClient.state === 'connected')

  useEffect(() => {
    const u1 = sseClient.onStateChange(() => setBazaarActive(sseClient.state === 'connected'))
    const u2 = auctionSseClient.onStateChange(() => setAuctionActive(auctionSseClient.state === 'connected'))
    return () => { u1(); u2() }
  }, [])

  const authIcon = {
    apikey: <Key size={13} />,
    hmac: <Shield size={13} />,
    bypass: <Unlock size={13} />,
  }[settings.authMode]

  const authLabel = {
    apikey: 'API Key',
    hmac: 'HMAC',
    bypass: 'Bypass',
  }[settings.authMode]

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    saveSettings({ theme: next })
    applyTheme(next)
  }

  const anyActive = bazaarActive || auctionActive

  return (
    <header className="h-14 glass-heavy border-b border-dungeon/30 flex items-center px-5 gap-4 sticky top-0 z-30 relative">
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-coin/20 to-transparent" />

      <button
        onClick={onMenuToggle}
        className="md:hidden text-muted hover:text-coin transition-colors p-1.5 rounded-lg hover:bg-coin/5"
        aria-label="Toggle menu"
      >
        <Menu size={20} />
      </button>

      <h1 className="font-display text-gradient-coin text-sm tracking-[0.25em] font-semibold hidden md:block">
        NINJA SKYBLOCK
      </h1>

      <div className="ml-auto flex items-center gap-2.5">
        {/* SSE status badges */}
        {anyActive ? (
          <div className="flex items-center gap-1.5">
            <SseBadge active={bazaarActive} label="Bazaar" icon={<BarChart3 size={9} />} />
            <SseBadge active={auctionActive} label="Auction" icon={<Gavel size={9} />} />
          </div>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-mono px-2.5 py-1 rounded-full border border-muted/15 text-muted/50">
            <span className="relative flex h-1.5 w-1.5">
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-muted/30" />
            </span>
            <WifiOff size={10} />
            Offline
          </span>
        )}

        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg text-muted hover:text-coin hover:bg-coin/5 transition-all duration-200 hover:shadow-sm hover:shadow-coin/10"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
        </button>

        <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-muted/70 px-2.5 py-1 rounded-lg border border-dungeon/40 bg-dungeon/15">
          {authIcon}
          {authLabel}
        </span>
      </div>
    </header>
  )
}

function SseBadge({ active, label, icon }: { active: boolean; label: string; icon: React.ReactNode }) {
  if (!active) return null

  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full border border-enchant/15 text-enchant bg-enchant/5">
      <span className="relative flex h-1.5 w-1.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-enchant opacity-35" />
        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-enchant shadow-sm shadow-enchant/50" />
      </span>
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </span>
  )
}
