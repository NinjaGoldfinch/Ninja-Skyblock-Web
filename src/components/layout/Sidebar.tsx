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
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden transition-opacity"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          fixed top-0 left-0 h-full z-50 glass-heavy border-r border-dungeon/40
          transition-transform duration-300 ease-out w-60
          md:relative md:translate-x-0 md:z-auto
          ${collapsed ? '-translate-x-full' : 'translate-x-0'}
        `}
      >
        {/* Logo area */}
        <div className="p-5 border-b border-dungeon/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-coin to-coin-light flex items-center justify-center shadow-lg shadow-coin/20">
              <span className="font-display text-white text-sm font-bold">N</span>
            </div>
            <div>
              <h2 className="font-display text-gradient-coin text-base tracking-wider font-semibold leading-tight">NINJA</h2>
              <p className="text-[10px] text-muted font-mono tracking-widest">SKYBLOCK API</p>
            </div>
          </div>
        </div>

        <nav className="p-3 space-y-0.5 overflow-y-auto h-[calc(100%-80px)]">
          {navGroups.map((group, gi) => (
            <div key={gi}>
              {group.label && (
                <div className="px-3 pt-5 pb-2 text-[10px] uppercase tracking-[0.15em] text-muted/60 font-semibold">
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
                    `flex items-center gap-3 px-3 py-2.5 text-sm rounded-xl transition-all duration-200
                    ${isActive
                      ? 'text-coin bg-coin/8 shadow-sm shadow-coin/5 font-medium'
                      : 'text-muted hover:text-body hover:bg-dungeon/30'
                    }`
                  }
                >
                  <item.icon size={17} strokeWidth={1.8} />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
      </aside>
    </>
  )
}
