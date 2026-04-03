import { NavLink } from 'react-router-dom'
import {
  Home,
  User,
  BarChart3,
  Gavel,
  Database,
  Zap,
  BookOpen,
  FlaskConical,
  ShieldCheck,
  Heart,
  Settings,
} from 'lucide-react'

const navGroups = [
  {
    items: [
      { to: '/', icon: Home, label: 'Dashboard' },
      { to: '/player', icon: User, label: 'Player Lookup' },
      { to: '/bazaar', icon: BarChart3, label: 'Bazaar' },
      { to: '/auctions', icon: Gavel, label: 'Auction House' },
      { to: '/items', icon: Database, label: 'Items' },
      { to: '/realtime', icon: Zap, label: 'Real-Time' },
    ],
  },
  {
    label: 'Developer',
    items: [
      { to: '/docs', icon: BookOpen, label: 'Docs' },
      { to: '/explorer', icon: FlaskConical, label: 'API Explorer' },
    ],
  },
  {
    label: 'System',
    items: [
      { to: '/admin', icon: ShieldCheck, label: 'Admin' },
      { to: '/health', icon: Heart, label: 'Health' },
      { to: '/settings', icon: Settings, label: 'Settings' },
    ],
  },
]

interface SidebarProps {
  collapsed?: boolean
  onClose?: () => void
}

export function Sidebar({ collapsed, onClose }: SidebarProps) {
  return (
    <>
      {/* Mobile overlay */}
      {!collapsed && (
        <div
          className="fixed inset-0 bg-void/80 backdrop-blur-md z-40 md:hidden transition-opacity"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          fixed top-0 left-0 h-full z-50 w-60
          glass-heavy border-r border-dungeon/30
          transition-transform duration-300 ease-out
          md:relative md:translate-x-0 md:z-auto
          ${collapsed ? '-translate-x-full' : 'translate-x-0'}
        `}
      >
        {/* Logo */}
        <div className="p-5 border-b border-dungeon/30">
          <div className="flex items-center gap-3">
            <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-coin via-coin-light to-enchant flex items-center justify-center shadow-lg shadow-coin/25">
              <span className="font-display text-white text-sm font-bold drop-shadow-sm">N</span>
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-coin via-coin-light to-enchant opacity-0 hover:opacity-100 transition-opacity blur-md -z-10" />
            </div>
            <div>
              <h2 className="font-display text-gradient-coin text-base tracking-wider font-semibold leading-tight">NINJA</h2>
              <p className="text-[10px] text-muted font-mono tracking-[0.2em]">SKYBLOCK API</p>
            </div>
          </div>
        </div>

        <nav className="p-3 space-y-0.5 overflow-y-auto h-[calc(100%-80px)]">
          {navGroups.map((group, gi) => (
            <div key={gi}>
              {group.label && (
                <div className="px-3 pt-6 pb-2 text-[10px] uppercase tracking-[0.18em] text-muted/50 font-semibold">
                  {group.label}
                </div>
              )}
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `group flex items-center gap-3 px-3 py-2.5 text-sm rounded-xl transition-all duration-200 relative
                    ${isActive
                      ? 'text-coin-light font-medium'
                      : 'text-muted hover:text-body-light'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-coin/10 via-coin/5 to-transparent border border-coin/15" />
                      )}
                      {!isActive && (
                        <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 bg-dungeon/25 transition-opacity duration-200" />
                      )}
                      <item.icon size={17} strokeWidth={1.7} className="relative z-10" />
                      <span className="relative z-10">{item.label}</span>
                      {isActive && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-gradient-to-b from-coin to-coin-light" />
                      )}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
      </aside>
    </>
  )
}
