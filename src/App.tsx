import { useState, lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'

import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { useSseCacheBridge } from '@/hooks/useSseCacheBridge'
import { useSseToasts } from '@/hooks/useSseToasts'
import { useAuctionSseBridge } from '@/hooks/useAuctionSseBridge'
import { useAuctionSseToasts } from '@/hooks/useAuctionSseToasts'
import { TextureProvider } from '@/hooks/useTextureMap'
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton'
import { getSettings } from '@/lib/settings'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'

function SseBridge() {
  useSseCacheBridge()
  useSseToasts()
  useAuctionSseBridge()
  useAuctionSseToasts()
  return null
}

const DashboardPage = lazy(() => import('@/pages/DashboardPage'))
const PlayerPage = lazy(() => import('@/pages/PlayerPage'))
const BazaarPage = lazy(() => import('@/pages/BazaarPage'))
const BazaarItemPage = lazy(() => import('@/pages/BazaarItemPage'))
const AuctionHousePage = lazy(() => import('@/pages/AuctionHousePage'))
const AuctionItemPage = lazy(() => import('@/pages/AuctionItemPage'))
const ItemsPage = lazy(() => import('@/pages/ItemsPage'))
const RealTimePage = lazy(() => import('@/pages/RealTimePage'))
const DocsPage = lazy(() => import('@/pages/DocsPage'))
const ApiExplorerPage = lazy(() => import('@/pages/ApiExplorerPage'))
const AdminPage = lazy(() => import('@/pages/AdminPage'))
const HealthPage = lazy(() => import('@/pages/HealthPage'))
const SettingsPage = lazy(() => import('@/pages/SettingsPage'))
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'))

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

export default function App() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true)
  const theme = getSettings().theme

  return (
    <QueryClientProvider client={queryClient}>
      <TextureProvider>
      <SseBridge />
      <BrowserRouter>
        <div className="flex h-screen overflow-hidden bg-void">
          <Sidebar
            collapsed={sidebarCollapsed}
            onClose={() => setSidebarCollapsed(true)}
          />
          <div className="flex-1 flex flex-col min-w-0">
            <Header onMenuToggle={() => setSidebarCollapsed(c => !c)} />
            <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
              <Suspense fallback={<LoadingSkeleton lines={8} className="max-w-4xl mx-auto mt-8" />}>
                <Routes>
                  <Route path="/" element={<DashboardPage />} />
                  <Route path="/player" element={<PlayerPage />} />
                  <Route path="/bazaar" element={<BazaarPage />} />
                  <Route path="/bazaar/:itemId" element={<BazaarItemPage />} />
                  <Route path="/auctions" element={<AuctionHousePage />} />
                  <Route path="/auctions/item/:itemId" element={<AuctionItemPage />} />
                  <Route path="/auctions/player/:playerUuid" element={<AuctionHousePage />} />
                  <Route path="/items" element={<ItemsPage />} />
                  <Route path="/realtime" element={<RealTimePage />} />
                  <Route path="/docs" element={<DocsPage />} />
                  <Route path="/explorer" element={<ApiExplorerPage />} />
                  <Route path="/admin" element={<ProtectedRoute><AdminPage /></ProtectedRoute>} />
                  <Route path="/health" element={<HealthPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="*" element={<NotFoundPage />} />
                </Routes>
              </Suspense>
            </main>
          </div>
        </div>
        <Toaster
          theme={theme}
          position="bottom-right"
          visibleToasts={2}
          gap={6}
          toastOptions={{
            style: {
              background: 'linear-gradient(145deg, #0e1018 0%, #13151f 100%)',
              border: '1px solid rgba(168, 85, 247, 0.12)',
              color: '#c0c7db',
              borderRadius: '14px',
              backdropFilter: 'blur(20px) saturate(1.3)',
              boxShadow: '0 12px 40px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255,255,255,0.02) inset, 0 0 16px rgba(168, 85, 247, 0.04)',
              fontFamily: 'Plus Jakarta Sans, sans-serif',
              padding: '12px 14px',
              maxWidth: '340px',
            },
          }}
        />
      </BrowserRouter>
      </TextureProvider>
    </QueryClientProvider>
  )
}
