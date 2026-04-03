import { Link } from 'react-router-dom'
import { Home, Compass } from 'lucide-react'

export default function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] animate-fade-in relative">
      {/* Ambient glow */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-96 h-96 rounded-full bg-coin/[0.04] blur-[100px]" />
      </div>

      <div className="relative z-10 flex flex-col items-center">
        <div className="relative mb-6">
          <Compass size={48} className="text-coin/20 animate-float" strokeWidth={1} />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-3 h-3 rounded-full bg-coin/30 animate-pulse-glow" />
          </div>
        </div>

        <h1 className="text-8xl font-display text-gradient-coin font-bold tracking-wider mb-3">
          404
        </h1>
        <p className="text-muted text-lg mb-2 font-light">Lost in the void.</p>
        <p className="text-muted/50 text-sm mb-10 max-w-xs text-center">
          This page doesn&apos;t exist, or it wandered off into the deep mines.
        </p>

        <Link
          to="/"
          className="group flex items-center gap-2.5 px-7 py-3 glass border border-coin/20 text-coin font-medium rounded-xl
                     hover:border-coin/40 hover:shadow-lg hover:shadow-coin/10 transition-all duration-300
                     hover:-translate-y-0.5"
        >
          <Home size={16} className="group-hover:-translate-x-0.5 transition-transform duration-200" />
          Back to Dashboard
        </Link>
      </div>
    </div>
  )
}
