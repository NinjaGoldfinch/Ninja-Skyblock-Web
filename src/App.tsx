import { useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'

import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { useSseCacheBridge } from '@/hooks/useSseCacheBridge'
import { useSseToasts } from '@/hooks/useSseToasts'

function SseBridge() {
  useSseCacheBridge()
  useSseToasts()
  return null
}

import DashboardPage from '@/pages/DashboardPage'
import PlayerPage from '@/pages/PlayerPage'
import BazaarPage from '@/pages/BazaarPage'
import BazaarItemPage from '@/pages/BazaarItemPage'
import BazaarChartPage from '@/pages/BazaarChartPage'
import AuctionHousePage from '@/pages/AuctionHousePage'
import ItemsPage from '@/pages/ItemsPage'
import RealTimePage from '@/pages/RealTimePage'
import DocsPage from '@/pages/DocsPage'
import ApiExplorerPage from '@/pages/ApiExplorerPage'
import AdminPage from '@/pages/AdminPage'
import HealthPage from '@/pages/HealthPage'
import SettingsPage from '@/pages/SettingsPage'

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

  return (
    <QueryClientProvider client={queryClient}>
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
              <Routes>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/player" element={<PlayerPage />} />
                <Route path="/bazaar" element={<BazaarPage />} />
                <Route path="/bazaar/chart" element={<BazaarChartPage />} />
                <Route path="/bazaar/:itemId" element={<BazaarItemPage />} />
                <Route path="/auctions" element={<AuctionHousePage />} />
                <Route path="/auctions/player/:playerUuid" element={<AuctionHousePage />} />
                <Route path="/items" element={<ItemsPage />} />
                <Route path="/realtime" element={<RealTimePage />} />
                <Route path="/docs" element={<DocsPage />} />
                <Route path="/explorer" element={<ApiExplorerPage />} />
                <Route path="/admin" element={<AdminPage />} />
                <Route path="/health" element={<HealthPage />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Routes>
            </main>
          </div>
        </div>
        <Toaster
          theme="dark"
          position="bottom-right"
          toastOptions={{
            style: {
              background: 'linear-gradient(135deg, #111318 0%, #16181f 100%)',
              border: '1px solid rgba(168, 85, 247, 0.15)',
              color: '#c8cfe0',
              borderRadius: '12px',
              backdropFilter: 'blur(12px)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 12px rgba(168, 85, 247, 0.06)',
              fontFamily: 'DM Sans, sans-serif',
            },
          }}
        />
      </BrowserRouter>
    </QueryClientProvider>
  )
}
