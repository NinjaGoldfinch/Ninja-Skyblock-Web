# Ninja SkyBlock Web

A modern dashboard for the Ninja SkyBlock API, providing real-time access to Hypixel SkyBlock data including bazaar prices, auction house listings, player profiles, and more.

## Tech Stack

- **React 18** with TypeScript
- **Vite** for fast development and builds
- **Tailwind CSS 4** for styling
- **TanStack React Query** for server state management
- **React Router** for client-side routing
- **Recharts** for data visualization
- **Lucide React** for icons

## Getting Started

### Prerequisites

- Node.js 20+
- npm

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

The dev server starts at `http://localhost:8080`.

### Build

```bash
npm run build
```

Output is written to `dist/`.

### Preview

```bash
npm run preview
```

## Configuration

Create a `.env` file in the project root:

```env
VITE_API_BASE=http://localhost:3000
```

API base URL, authentication mode, and other preferences can also be configured in the Settings page at runtime.

## Features

- **Dashboard** — Overview with health status, quick stats, and player search
- **Player Lookup** — Search players by username or UUID, view skills, slayers, dungeons, and networth
- **Bazaar** — Browse all bazaar items with real-time prices, sorting, and search
- **Auction House** — Lowest BIN auctions, search, player auctions, and ended auctions
- **Items Database** — Complete SkyBlock item catalog with tier/category filtering
- **Real-Time** — Live bazaar price streams (SSE) and WebSocket subscriptions
- **API Explorer** — Interactive endpoint tester with auth and request history
- **API Docs** — Full endpoint reference with code examples
- **Admin** — API key management and watched player tracking
- **Health** — Service health monitoring dashboard
- **Settings** — Theme, auth mode, API URL, and display preferences

## License

Private
