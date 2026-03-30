# Bazaar Enhancement Plan

## 1. Sparkline Mini-Charts on Cards

**Goal:** Show a tiny 7-day price trend line on each bazaar card so users can see direction at a glance.

### Backend Changes
- **New endpoint:** `GET /v2/skyblock/bazaar/sparklines`
  - Returns a map of `{ [item_id]: number[] }` — an array of ~24-48 sampled prices (e.g. every 3-6 hours over 7 days)
  - Precomputed/cached server-side so it's a single lightweight request, not 1200 individual history calls
  - Cache TTL: 5-10 minutes (sparklines don't need to be real-time)
  - Uses existing history data, just downsampled

### Frontend Changes
- **New endpoint function** in `src/api/endpoints.ts`: `getBazaarSparklines()`
- **New component:** `src/components/ui/Sparkline.tsx`
  - Pure SVG `<polyline>` — no chart library needed, keeps it tiny
  - Props: `data: number[]`, `width`, `height`, `color`
  - Color: green if last > first, red if last < first
  - ~30px tall, ~80px wide, no axes/labels
- **BazaarPage changes:**
  - Fetch sparklines query alongside bazaar data: `useQuery({ queryKey: ['bazaar-sparklines'] })`
  - Pass sparkline data to each card, render below the price
  - Sparkline data is optional — cards render fine without it (loading/error states)

### Query Key
`['bazaar-sparklines']` — staleTime: 5 minutes

---

## 2. Top Movers Banner

**Goal:** Highlight items with the biggest price change in the last hour/day above the grid.

### Backend Changes
- **New endpoint:** `GET /v2/skyblock/bazaar/movers?period=1h` (or `24h`)
  - Returns top 5-10 items sorted by absolute % change
  - Response: `{ gainers: MoverItem[], losers: MoverItem[] }`
  - `MoverItem: { item_id, name, price_change_percent, current_price, previous_price }`
  - Computed from history data comparing current vs N-hours-ago price
  - Cache TTL: 1-2 minutes

### Frontend Changes
- **New endpoint function:** `getTopMovers(period)`
- **New component:** `src/components/bazaar/TopMovers.tsx`
  - Horizontal scrollable row of small cards/pills
  - Each shows: icon, name, % change (green/red), mini sparkline if available
  - Two sections: "Top Gainers" and "Top Losers"
  - Collapsible to save space
- **BazaarPage changes:**
  - Render `<TopMovers />` between the controls and the grid
  - Items link to `/bazaar/{itemId}`

### Query Key
`['bazaar-movers', period]` — staleTime: 1 minute

---

## 3. Favorites / Watchlist

**Goal:** Let users pin items that appear in a dedicated section at the top of the bazaar.

### Backend Changes
None — purely client-side using localStorage.

### Frontend Changes
- **New localStorage key:** `'ninja-bazaar-favorites'` → `string[]` (array of item IDs)
- **New hook:** `src/hooks/useFavorites.ts`
  - `useFavorites()` → `{ favorites: string[], toggle(id), isFavorite(id) }`
  - Reads/writes localStorage, triggers re-render via `useSyncExternalStore`
- **BazaarPage changes:**
  - Add a star/heart toggle button on each card (top-right corner)
  - If any favorites exist, render a "Watchlist" section above the main grid
  - Watchlist section shows favorited items as a horizontal row or small grid
  - Favorites persist across sessions, no account needed
- **BazaarItemPage changes:**
  - Add a favorite toggle button in the header next to the item name

---

## 4. Category Filters

**Goal:** Clickable tags for quick filtering by item category (Ores, Enchantments, Farming, etc.).

### Backend Changes
- **Option A (preferred):** Add `category` field to the texture/items endpoint response if not already present
- **Option B:** Derive categories client-side from item ID patterns (already partially done in `ItemIcon.tsx` with `guessIconFromId`)

### Frontend Changes
- **New utility:** `src/lib/itemCategories.ts`
  - Maps item IDs to categories using ID patterns:
    - `ENCHANTMENT_*` → Enchantments
    - `*_ORE`, `*_INGOT`, `DIAMOND`, etc. → Mining
    - `*_ESSENCE` → Essence
    - `ENCHANTED_*` (non-book) → Enchanted Materials
    - `*_GEM*`, `*_GEMSTONE` → Gemstones
    - `LOG*`, `*_WOOD*` → Foraging
    - Farming items by keyword → Farming
    - etc.
  - Export `getCategory(itemId): string` and `CATEGORIES: string[]`
- **BazaarPage changes:**
  - Render category pills between search bar and grid
  - URL param: `?cat=enchantments` (synced like search/sort)
  - Active category highlighted with `bg-coin/10 text-coin border-coin/30`
  - "All" pill selected by default
  - Selecting a category filters the product list (in addition to search)

---

## 5. Card Flip Animation (Volume/Orders on Back)

**Goal:** Reveal extra stats (volume, order count, 24h change) on hover or click.

### Backend Changes
None — volume and order data already in `BazaarProductRaw.sell_summary` / `buy_summary`.

### Frontend Changes
- **BazaarPage card changes:**
  - Wrap each card in a perspective container
  - Front: current layout (icon, name, buy/sell/spread)
  - Back: buy volume, sell volume, buy orders, sell orders, spread amount
  - CSS: `transform-style: preserve-3d`, `backface-visibility: hidden`, `rotateY(180deg)` on hover
  - On mobile: tap to flip (toggle state), tap again to navigate
  - Animation: `transition: transform 0.5s ease`
- **CSS additions in `index.css`:**
  ```css
  .card-flip { perspective: 600px; }
  .card-flip-inner { transition: transform 0.5s; transform-style: preserve-3d; }
  .card-flip:hover .card-flip-inner { transform: rotateY(180deg); }
  .card-front, .card-back { backface-visibility: hidden; }
  .card-back { transform: rotateY(180deg); }
  ```

---

## 6. Color-Coded Price Direction

**Goal:** Subtle green/red background tint on cards based on whether buy price is trending up or down.

### Backend Changes
- Relies on sparkline data (feature #1) or the movers endpoint (feature #2)
- If neither is available, can use SSE: track `old_value` vs `new_value` from recent events

### Frontend Changes
- **BazaarPage card changes:**
  - Compare current price to previous (from sparkline last 2 points, or SSE delta)
  - Apply subtle background class: `bg-green-500/3` (up) or `bg-red-500/3` (down)
  - Optional: tiny arrow icon (▲/▼) next to price
- **New hook (if no sparkline):** `src/hooks/usePriceDirection.ts`
  - Subscribes to SSE event bus
  - Tracks `Map<itemId, 'up' | 'down' | 'stable'>` based on last price change
  - Resets to 'stable' after 60 seconds of no updates

---

## 7. Grid/List View Toggle

**Goal:** Compact table layout for power users who want to scan many items quickly.

### Backend Changes
None.

### Frontend Changes
- **BazaarPage changes:**
  - Add toggle button group next to sort dropdown: grid icon / list icon
  - URL param: `?view=list` (default: grid)
  - Persist preference in localStorage via settings
- **Grid view:** Current card layout (unchanged)
- **List view:** `<table>` with columns:
  - Icon (24px) | Name | Buy Price | Sell Price | Spread % | Buy Volume | Sell Volume
  - Sortable column headers (click to sort, syncs with existing sort param)
  - Hover highlight row, click navigates to item page
  - Compact rows (~40px height)
  - Sticky header
- **Settings change:** Add `bazaarViewMode: 'grid' | 'list'` to `AppSettings`

---

## 8. Items Per Page Selector

**Goal:** Let users choose how many items per page.

### Backend Changes
None.

### Frontend Changes
- **BazaarPage changes:**
  - Already partially implemented with `ITEMS_PER_PAGE` constant
  - Add a `<select>` next to the sort dropdown with options: 20, 40, 80, 160, All
  - URL param: `?per_page=40` (already reading from URL)
  - "All" disables pagination entirely
  - Changing per-page resets to page 1

**Status:** This appears to already be implemented based on the current BazaarPage code with `PER_PAGE_OPTIONS`. Verify and polish if needed.

---

## 9. Keyboard Navigation

**Goal:** Arrow keys to move between cards, Enter to open detail page.

### Backend Changes
None.

### Frontend Changes
- **BazaarPage changes:**
  - Track `focusedIndex` state (default: -1, none focused)
  - `onKeyDown` handler on the grid container:
    - `ArrowRight` / `ArrowLeft`: move focus ±1
    - `ArrowDown` / `ArrowUp`: move focus ±cols (detect column count from grid)
    - `Enter`: navigate to `/bazaar/{focusedItem.product_id}`
    - `Escape`: clear focus
  - Focused card gets `ring-2 ring-coin/50` outline
  - `tabIndex={0}` on grid container to receive keyboard events
  - Scroll focused card into view with `scrollIntoView({ block: 'nearest' })`
- Works in both grid and list view

---

## 10. Comparison Mode

**Goal:** Select 2-3 items and overlay their price charts on one graph.

### Backend Changes
None — uses existing history endpoint per item.

### Frontend Changes
- **New page:** `src/pages/BazaarComparePage.tsx` at route `/bazaar/compare`
- **UI flow:**
  1. Item picker (reuse BazaarItemPage's picker component) — select up to 3 items
  2. URL: `/bazaar/compare?items=DIAMOND,EMERALD,GOLD_INGOT`
  3. Fetch history for each selected item in parallel
  4. Render all series on one chart with different colors
  5. Legend with item names + colors
  6. Shared time axis, independent price axis (or normalized % change mode)
- **BazaarPage integration:**
  - Add checkboxes on cards (visible in a "compare mode" toggle)
  - "Compare Selected" button appears when 2+ items checked
  - Navigates to compare page with selected items
- **Chart setup:**
  - Reuse `useChart()` hook
  - Color palette: teal, gold, rose (3 distinct colors)
  - Toggle between absolute price and % change from start
- **Sidebar:** Add "Compare" link under Bazaar

---

## 11. Profit Calculator

**Goal:** Input buy price + quantity, see projected profit at current sell price minus tax.

### Backend Changes
None — Hypixel bazaar tax is a known constant (currently no tax on buy orders, and a configurable tax on sell, but in practice it's a flat calculation).

### Frontend Changes
- **Location:** Add as a collapsible section on `BazaarItemPage`, below the chart
- **Component:** `src/components/bazaar/ProfitCalculator.tsx`
- **Inputs:**
  - Buy price (default: current instant buy price)
  - Sell price (default: current instant sell price)
  - Quantity (default: 1)
  - Tax rate toggle (with/without BZ tax — currently 1.125% sell tax)
- **Outputs:**
  - Total cost: `buyPrice × quantity`
  - Total revenue: `sellPrice × quantity × (1 - taxRate)`
  - Profit: `revenue - cost`
  - Profit per item: `profit / quantity`
  - ROI %: `(profit / cost) × 100`
- **Features:**
  - Auto-updates when SSE pushes new prices (if "live" toggle is on)
  - Preset quantity buttons: 64, 640, 2304 (common stack sizes)
  - Visual: green if profitable, red if not

---

## 12. Price Alerts

**Goal:** Set a price threshold, get a browser notification when crossed.

### Backend Changes
None — uses the existing SSE stream client-side.

### Frontend Changes
- **New localStorage key:** `'ninja-price-alerts'` → `PriceAlert[]`
  ```typescript
  interface PriceAlert {
    id: string
    itemId: string
    field: 'instant_buy_price' | 'instant_sell_price'
    condition: 'above' | 'below'
    threshold: number
    enabled: boolean
    createdAt: number
    lastTriggeredAt?: number
  }
  ```
- **New hook:** `src/hooks/usePriceAlerts.ts`
  - Loads alerts from localStorage
  - Subscribes to SSE event bus
  - On each price update, checks all enabled alerts for that item
  - If triggered: browser Notification API + sonner toast
  - Cooldown: don't re-trigger same alert within 5 minutes
  - Requests notification permission on first alert creation
- **UI — Alert creation (BazaarItemPage):**
  - Bell icon button in header → opens alert modal/popover
  - Form: select field (buy/sell), condition (above/below), threshold (pre-filled with current price ± 10%)
  - Shows existing alerts for this item with enable/disable toggles
- **UI — Alert management (new section in Settings or dedicated page):**
  - Table of all alerts: item name, condition, threshold, status, last triggered
  - Delete/disable buttons
  - Could also be a sidebar badge showing active alert count

---

## Implementation Priority

| # | Feature | Effort | Impact | Dependencies |
|---|---------|--------|--------|-------------|
| 3 | Favorites/Watchlist | Small | High | None |
| 4 | Category Filters | Small | High | None |
| 8 | Items Per Page | Tiny | Medium | None (may already exist) |
| 7 | Grid/List Toggle | Medium | High | None |
| 11 | Profit Calculator | Small | Medium | None |
| 6 | Price Direction | Small | Medium | SSE (exists) |
| 9 | Keyboard Nav | Small | Low | None |
| 1 | Sparkline Charts | Medium | High | New backend endpoint |
| 2 | Top Movers | Medium | High | New backend endpoint |
| 5 | Card Flip | Small | Low | None |
| 12 | Price Alerts | Medium | Medium | SSE (exists) |
| 10 | Comparison Mode | Large | Medium | None (uses existing endpoints) |

### Suggested Implementation Order
1. **Phase 1 (frontend-only, quick wins):** #3, #4, #8, #7
2. **Phase 2 (frontend features):** #11, #6, #9, #5
3. **Phase 3 (backend + frontend):** #1, #2
4. **Phase 4 (advanced):** #12, #10
