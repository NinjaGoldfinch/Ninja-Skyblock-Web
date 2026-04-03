import { Navigate, useLocation } from 'react-router-dom'
import { getSettings } from '@/lib/settings'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const settings = getSettings()

  const hasAuth =
    (settings.authMode === 'apikey' && !!settings.apiKey) ||
    (settings.authMode === 'hmac' && !!settings.hmacSecret) ||
    settings.authMode === 'bypass'

  if (!hasAuth) {
    return <Navigate to="/settings" state={{ from: location.pathname, authRequired: true }} replace />
  }

  return <>{children}</>
}
