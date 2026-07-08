# Saanp Roll — Project Structure & Architecture

> **Full explanation of every file, its purpose, and how the project fits together**

---

## 🗺️ Route Map

```
/              → Landing.tsx       (Marketing landing page — public)
/auth          → Auth.tsx          (Sign in / Sign up — public)
/home          → Home.tsx          (Dashboard hub — public)
/game/setup    → GameSetup.tsx     (Create new game — public)
/game/play     → GamePlay.tsx      (Active game — public)
/settings      → Settings.tsx      (Sound + Appearance controls — public)
/history       → History.tsx       (Match history, static sample data — public)
/leaderboard   → Leaderboard.tsx   (Top players, static sample data — public)
/*             → NotFound.tsx      (404 fallback — public)
```

All routes are **lazy loaded** via React.lazy() + Suspense. Auth is optional (anonymous play supported).

---

## 📁 Root Files

### `src/main.tsx` — App Entry Point

**Purpose:** Bootstrap the React app, configure providers, and define routes.

**What it does:**
- Creates the React root and renders the app
- Wraps everything in providers: `StrictMode`, `InstrumentationProvider`, `ThemeProvider` (next-themes), `ConvexAuthProvider`, `BrowserRouter`
- `ThemeProvider` configured with `attribute="class"`, `defaultTheme="system"`, `enableSystem`, `disableTransitionOnChange`
- Configures lazy-loaded routes with a `RouteLoading` fallback (animated pulse)
- `RouteSyncer` component posts route changes to parent frame (Freebuff iframe integration)
- All 9 routes defined with Suspense-wrapped lazy imports

**File flow:** This is the entry point. It renders the provider tree which wraps the route-switched pages.

---

### `src/index.css` — Global Styles & Theme

**Purpose:** Define Tailwind CSS base, theme tokens, and global styles.

**What it does:**
- Imports Tailwind CSS v4 + tw-animate-css
- Defines CSS custom properties (oklch colors) for light and dark modes
- All shadcn/ui design tokens: background, foreground, primary, secondary, card, accent, destructive, chart colors, sidebar colors
- Global base styles: border-box, font-family (Inter), cursor-pointer on buttons
- Game-specific theme: indigo primary (#6366f1), warm neutrals, soft borders
- `.dark` class overrides all color tokens for dark mode

**File flow:** Imported by `main.tsx` — all components inherit these theme colors.

---

### `src/instrumentation.tsx` — Error Monitoring

**Purpose:** Global error boundary and runtime error reporting.

**What it does:**
- `ErrorBoundary` class component wrapping the app — catches React render errors
- `InstrumentationProvider` — wraps the app with window-level `error` and `unhandledrejection` listeners
- Error dialog UI showing stack traces with collapsible details
- Reports errors to Vly monitoring service for production tracking

**File flow:** Wraps the entire app in `main.tsx`. Any uncaught error in any component triggers the error dialog.

---

## 📁 `src/pages/` — Route Pages

### `src/pages/Landing.tsx` — Landing Page (`/`)

**Purpose:** Marketing landing page — attract users, explain the game, drive to sign-up or play.

**What it renders:**
- Header with logo dropdown, "Saanp Roll" branding, and Sign In/Get Started buttons
- **Hero section:** Animated headline "Saanp Seedhi Reimagined" with gradient text, tagline, Play Now + Local Game CTAs
- **Modes section:** Side-by-side cards for Classic mode (amber-themed) and Venom mode (red-themed), each with icons and descriptions
- **Features section:** Three feature cards (Pass & Play, Two Board Modes, Fair & Authoritative) with staggered framer-motion entrance
- **CTA section:** "Ready to Roll?" with Start Playing button
- **Footer:** Credits text

**Data flow:** No data dependencies. All static content with navigation hooks. Uses `LogoDropdown` for auth-aware logo menu.

---

### `src/pages/Auth.tsx` — Auth Page (`/auth`)

**Purpose:** User authentication — sign in with email OTP or continue anonymously.

**What it renders:**
- Two-step flow: Step 1 — enter email → Step 2 — enter 6-digit OTP
- "Continue as Guest" button for anonymous sign-in (via Convex Auth)
- Redirects to `/home` after successful auth (or custom `redirectAfterAuth` prop)
- Loading states with `Loader2` spinner
- Error messages for failed sign-in/verification

**Data flow:**
- Uses `useAuth()` hook from `@/hooks/use-auth`
- Calls `signIn("email-otp", formData)` for email auth
- Calls `signIn("anonymous")` for guest login
- On successful auth, `useEffect` watches `isAuthenticated` and navigates

---

### `src/pages/Home.tsx` — Dashboard Hub (`/home`)

**Purpose:** Central hub after login — quick actions and stats.

**What it renders:**
- Header with logo, title, and settings gear icon (navigates to `/settings`)
- **Stats row:** Games Won (trophy icon), Games Played (dice icon) — both show 0
- **Play Local button:** Large card with Users icon, navigates to `/game/setup`
- **Play Online button:** Disabled with "SOON" badge, shows upcoming online multiplayer feature
- **Action buttons row:** Match History (`/history`) and Leaderboard (`/leaderboard`)

**Data flow:** Static UI with navigation hooks. Stats not yet connected to Convex.

---

### `src/pages/GameSetup.tsx` — Game Setup (`/game/setup`)

**Purpose:** Configure a new game before playing.

**What it renders:**
- Back button to return to `/home`
- **Player count selector:** Minus/plus buttons (2–4 players), colored circle indicators
- **Player name inputs:** Color-coded input fields for each player's name
- **Board mode selector:** Two clickable cards — Classic (indigo, with play icon) and Venom (red, with skull icon, "High Variance" badge)
- **Start Game button:** Navigates to `/game/play` with state containing `boardMode` and `players`

**Data flow:**
- Local state: `playerCount`, `boardMode`, `names[]`
- On start: creates `PlayerSetup[]` array with colored IDs
- Passes data via React Router's `location.state` to `GamePlay`

---

### `src/pages/GamePlay.tsx` — Active Game (`/game/play`)

**Purpose:** The main game experience — board, dice, player interaction.

**This is the most complex page in the app.**

**What it renders:**
- **Header:** Board mode name, turn counter, move log toggle, new game button
- **Game Over Banner** (conditional): Trophy animation, winner name, move count, Rematch + New Game buttons
- **Board:** SVG board rendered via `Board` component with animated player positions
- **Player Turn Card:** Current player's name with color, position, extra roll badge, last roll display
- **Dice Roll:** Animated 3D dice via `DiceRoll` component
- **All Players Progress:** Color-coded progress bars for each player
- **Move Log** (collapsible): Scrollable list of all move entries

**Animation System:**
- `handleRoll` orchestrates the full animation sequence
- Tile-by-tile stepping via `setInterval` (60ms per tile)
- `animatedPositions` state tracks in-flight player positions
- `animatingPlayer` state shows "Moving piece..." during animation
- Snake/ladder sounds scheduled to align with animation completion
- Win fanfare plays after a 800ms delay
- Overshoot handled immediately (no step animation)

**Sound Integration:**
- `soundManager.init()` called in `useEffect`
- Sounds triggered: `dice_roll`, `tile_step`, `snake_bite`, `ladder_climb`, `win_fanfare`, `overshoot`
- SoundManager checks `muted` and `volume` properties before playing (synced from `useSoundSettings`)

**Data flow:**
1. Receives `boardMode` + `players` from `location.state` (from GameSetup)
2. Creates initial `GameState` via `createInitialGameState()`
3. On roll: `applyRoll()` → animation → `advanceTurn()` or extra roll
4. `displayPlayers` derives positions from animated state or game state
5. Game over: sets `gameState.status = "game_over"`, shows winner banner

---

### `src/pages/Settings.tsx` — Settings Page (`/settings`)

**Purpose:** Customize game experience — appearance theme and sound/volume controls.

**This is the settings hub with two live sections.**

**What it renders:**

**Appearance section (functional):**
- Header row with icon (dynamic — Sun/Moon/Monitor based on current theme) and label
- 3-button theme selector: Light ☀️, Dark 🌙, System 💻
- Active theme highlighted with indigo border + background
- Uses `useAppTheme()` from `@/hooks/use-theme`

**Sound & Effects section (functional):**
- Header row with Volume2/VolumeX icon (dynamic based on sound state) and label
- Mute/unmute Switch toggle
- Collapsible volume slider (animated expand/collapse via Framer Motion)
- Volume percentage display with Off/Max labels
- Uses `useSoundSettings()` from `@/hooks/use-sound-settings`

**Placeholder sections (all "Soon"):**
- Notifications
- Accessibility
- Privacy & Security
- About

---

### `src/pages/History.tsx` — Match History (`/history`)

**Purpose:** Display past match results with summary stats.

**What it renders:**
- Header with back navigation and LogoDropdown
- Summary stats row: Total Games, Wins, Best Streak (3-column grid)
- Match list with sample data showing mode, player count, winner, duration, date
- Each match card has hover effects and staggered entrance animations
- Empty state hint: "Match history is stored locally for now. Online sync is coming soon!"

**Data flow:** Static sample data. Future: connect to Convex for real match recording.

---

### `src/pages/Leaderboard.tsx` — Leaderboard (`/leaderboard`)

**Purpose:** Show top players ranked by performance.

**What it renders:**
- Header with back navigation and LogoDropdown
- Stats overview: Top Player name, This Week games, Record Streak
- Ranked entries (1–5) with podium styling for top 3 (gold/silver/bronze borders + backgrounds)
- Each entry shows: rank, icon (Crown/Medal/TrendingUp), player name, wins/games, win rate %
- Placeholder note: "Leaderboard is populated with sample data."

**Data flow:** Static sample data. Real online ranking coming in a future update.

---

### `src/pages/NotFound.tsx` — 404 Page (`/*`)

**Purpose:** Catch-all for unknown routes. Simple "404 Page Not Found" display.

---

## 📁 `src/components/game/` — Game Components

### `src/components/game/Board.tsx` — SVG Board Renderer

**Purpose:** Render the 10×10 game board as an SVG with snakes, ladders, and player tokens.

**Key implementation details:**
- `buildTiles()` generates 100 tile positions in zigzag layout
- Tiles 1–100 arranged: row 9 (tiles 1-10, left→right), row 8 (tiles 11-20, right→left), etc.
- Each tile is 100×100 in SVG coordinates
- Snake paths: cubic bezier curves via `snakePath()` with perpendicular control points for organic curves
- Ladders: parallel lines with rungs at 20%, 40%, 60%, 80% positions
- Player tokens: colored circles with white border and first-letter initial
- Tile colors: alternating light/dark using `getTileColor()` from engine
- Snake/ladder indicators: 🐍 and 🪜 emojis on affected tiles
- Highlighted tile: golden border for current landing position

**Snake rendering details:**
```typescript
function snakePath(fromX, fromY, toX, toY): string {
  const mx = (fromX + toX) / 2;
  const my = (fromY + toY) / 2;
  const dx = toX - fromX;
  const dy = toY - fromY;
  const cpx1 = mx + dy * 0.3;
  const cpy1 = my - dx * 0.3;
  const cpx2 = mx - dy * 0.3;
  const cpy2 = my + dx * 0.3;
  return `M ${fromX} ${fromY} C ${cpx1} ${cpy1}, ${cpx2} ${cpy2}, ${toX} ${toY}`;
}
```

**Props:**
- `boardId: BoardMode` — determines snake/ladder layout and color scheme
- `players: PlayerState[]` — current positions for token rendering
- `highlightedTile?: number | null` — tile to highlight (golden border)
- `className?: string` — additional CSS classes

---

### `src/components/game/DiceRoll.tsx` — Animated Dice

**Purpose:** Clickable dice with 3D tumble animation and sound.

**Key implementation details:**
- Dot positions defined in a 3×3 grid with specific row/col mapping
- `handleRoll()` is async — plays sound, runs 4-8 frames of random face flips, then settles on final value
- Framer Motion 3D animation: `rotateX` [0→360→720→1080], `rotateY` [0→180→540→720]
- Scale pulse and box-shadow glow during roll
- Shine overlay: gradient sweep across the dice surface
- Spring-animated dots: each dot scales up from 0 with spring physics
- `whileTap` scale-down for tactile feedback
- Extra roll indicator text below dice

**Props:**
- `onRoll: (value: number) => void` — callback with final roll value
- `disabled?: boolean` — prevent clicking during resolution
- `currentPlayerColor?: string` — border color matches current player
- `isExtraRoll?: boolean` — show "Extra roll!" label

---

## 📁 `src/lib/game-engine/` — Pure Game Logic

### `src/lib/game-engine/types.ts` — Type Definitions

**Purpose:** All TypeScript types and interfaces for the game engine.

**Key types:**
- `BoardMode: "classic" | "venom"` — two board variants
- `BoardConfig` — complete board definition (ladders, snakes, metadata)
- `PlayerSetup` — initial player configuration (id, name, color)
- `PlayerState` — runtime player state (adds position, consecutiveSixes)
- `GameConfig` — game configuration object
- `GameStatus` — state machine enum (7 states)
- `GameState` — full game state (boardId, players[], currentPlayerIndex, status, winnerId, lastRoll, turnPhase, moveLog)
- `GameAction` — action types for turn resolution
- `RollResult` — dice roll result
- `MoveResult` — discriminated union (moved | overshoot | snake_bite | ladder_climb | win | forfeit)

---

### `src/lib/game-engine/boards.ts` — Board Configurations

**Purpose:** Define snake and ladder positions for each board mode.

**Key exports:**
- `BOARD_CONFIGS` — Record mapping each `BoardMode` to its `BoardConfig`
  - **Classic:** 9 ladders, 10 snakes (traditional layout)
  - **Venom:** 0 ladders, 15 snakes (hardcore variant)
- `getSnakeHeads(boardId)` — return all snake head positions
- `getLadderBottoms(boardId)` — return all ladder bottom positions
- `getSnakeTail(boardId, tile)` — check if tile is a snake head, return tail
- `getLadderTop(boardId, tile)` — check if tile is a ladder bottom, return top

---

### `src/lib/game-engine/engine.ts` — Core Engine Functions

**Purpose:** Pure functions implementing all game rules.

**Key exports:**

| Function | Purpose | Returns |
|----------|---------|---------|
| `rollDice()` | Random 1-6 | `number` |
| `applyRoll(state, roll)` | Process a dice roll | `GameState` |
| `advanceTurn(state)` | Move to next player | `GameState` |
| `getTileColor(position, boardId)` | Look up tile colors | `{ bg, text }` |
| `createInitialGameState(boardId, players)` | Fresh game state | `GameState` |
| `resolveTurn(state, roll)` | Full turn resolution | `{ newState, results }` |

**`applyRoll` logic:**
1. Checks three consecutive sixes → forfeit if true
2. Calculates new position = player.position + roll
3. Checks overshoot (newPos > 100) → no move
4. Checks snake/ladder at newPos → resolve to final position
5. Checks win at position 100 → game_over
6. Checks extra roll (rolled 6) → same player rolls again
7. Default: advance to next player

**State is immutable:** Every function returns a new `GameState` object. Never mutates the input.

---

### `src/lib/game-engine/index.ts` — Public API

**Purpose:** Re-export all game engine types and functions.

```typescript
export * from "./types";
export * from "./boards";
export * from "./engine";
```

Components import from `@/lib/game-engine` which resolves to this barrel file.

---

## 📁 `src/lib/` — Utilities

### `src/lib/sounds.ts` — Sound System

**Purpose:** Synthesize and play game sound effects.

**Architecture:**
1. `SoundConfig` defines frequency, duration, volume, waveform type, and noise flag
2. `renderSfx(config)` creates an `OfflineAudioContext`, renders the tone to a buffer, converts to WAV, and returns a blob URL
3. `SoundManager` singleton class manages:
   - `muted: boolean` getter/setter — if true, `play()` does nothing
   - `volume: number` getter/setter — clamped 0–1, applied to Howl instances on play
   - `init()` — renders all 6 sounds in parallel, creates Howl instances
   - `play(name)` — plays a cached sound (checks muted, applies volume)
   - `stopAll()` — stops all playing sounds
   - `dispose()` — releases blob URLs and clears cache
4. `bufferToWav()` — converts AudioBuffer to standard WAV format
5. `writeString()` — helper for WAV header

**Sound configurations:**
| Sound | Waveform | Frequency | Duration | Volume | Noise |
|-------|----------|-----------|----------|--------|-------|
| dice_roll | triangle | 200→800Hz | 0.3s | 0.15 | Yes |
| tile_step | sine | 600Hz | 0.04s | 0.06 | No |
| snake_bite | sawtooth | 400→120Hz | 0.35s | 0.2 | No |
| ladder_climb | sine | 300→700Hz | 0.3s | 0.18 | No |
| win_fanfare | sine | 784Hz (G5) | 0.5s | 0.25 | No |
| overshoot | triangle | 300→100Hz | 0.25s | 0.12 | No |

**Settings sync:** `useSoundSettings` hook reads from localStorage and sets `soundManager.muted` and `soundManager.volume` on every change.

---

### `src/lib/utils.ts` — Utility Functions

**Purpose:** General utility functions.

- `cn(...inputs)` — merges Tailwind CSS classes using `clsx` + `tailwind-merge`. Used by all shadcn/ui components and custom components for conditional class merging.

---

### `src/lib/vly-integrations.ts` — Vly Integration

**Purpose:** Configure Vly (Freebuff) integration for AI, email, and payments.

- Creates a `vly` client with `createVlyIntegrations()` using the deployment token
- Used in Convex actions for server-side AI/email/payments operations
- See `integrations.md` for full documentation

---

## 📁 `src/convex/` — Backend (Convex)

### `src/convex/schema.ts` — Database Schema

**Purpose:** Define the Convex database schema.

**Current tables:**
- `authTables` — auto-generated auth tables (sessions, verification tokens, etc.)
- `users` — user profiles with fields: `name`, `image`, `email`, `emailVerificationTime`, `isAnonymous`, `role`

**Future tables (Phase 2):**
- `games` — game rooms with state, players, status
- `matchmaking` — queue for online matching

---

### `src/convex/auth.ts` — Auth Configuration

**READ ONLY.** Configures Convex Auth with email OTP and anonymous providers.

### `src/convex/auth.config.ts` — Auth Domain Config

**READ ONLY.** Sets the auth domain and application ID.

### `src/convex/auth/emailOtp.ts` — Email OTP Implementation

**READ ONLY.** Implements email OTP verification flow for Convex Auth.

### `src/convex/users.ts` — User Queries

**Purpose:** Query helpers for the current user.

- `currentUser` — Convex query returning the signed-in user or null
- `getCurrentUser(ctx)` — internal helper used by other queries

### `src/convex/http.ts` — HTTP Routes

**Purpose:** Register Convex HTTP routes for auth callbacks.

---

## 📁 `src/hooks/` — Custom React Hooks

### `src/hooks/use-auth.ts` — Auth Hook

**Purpose:** Convenience wrapper around Convex Auth.

**Exports:**
```typescript
const { isLoading, isAuthenticated, user, signIn, signOut } = useAuth();
```

- Combines `useConvexAuth()` (auth state) with `useQuery(api.users.currentUser)` (user data)
- Derives `isLoading` from both auth loading and user query loading

### `src/hooks/use-mobile.ts` — Mobile Detection

**Purpose:** Detect mobile viewport width.

- Uses `window.matchMedia` for breakpoint detection at 768px
- Returns boolean `isMobile`

### `src/hooks/use-sound-settings.ts` — Sound Settings

**Purpose:** Manage sound on/off and volume state with localStorage persistence.

**Functionality:**
- Loads initial settings from localStorage key `saanp-roll-sound`
- Returns `soundEnabled`, `soundVolume`, `setSoundEnabled`, `setSoundVolume`
- On every settings change, syncs to `soundManager.muted` and `soundManager.volume`
- Handles corrupt localStorage data gracefully with fallback to defaults `{ enabled: true, volume: 0.7 }`

### `src/hooks/use-theme.ts` — Theme Hook

**Purpose:** Convenience wrapper around `next-themes`'s `useTheme`.

**Exports:**
```typescript
const { theme, isDark, setTheme, systemTheme, cycleTheme } = useAppTheme();
```

- `theme`: current setting ("light" | "dark" | "system")
- `isDark`: whether the resolved theme is dark
- `setTheme`: set a specific theme
- `systemTheme`: OS-level preference
- `cycleTheme`: cycle through light → dark → system

---

## 📁 `src/components/` — React Components

### `src/components/ui/` — shadcn/ui Primitives

**Purpose:** Auto-generated shadcn/ui component library. 40+ components:
`Button`, `Card`, `Badge`, `Input`, `Select`, `Dialog`, `DropdownMenu`, `Tabs`, `Tooltip`, `Avatar`, `Separator`, `Progress`, `ScrollArea`, `Switch`, `Slider`, `Checkbox`, `RadioGroup`, `Form`, `Table`, `Calendar`, `Carousel`, `Chart`, `Command`, `Sheet`, `Sidebar`, `Skeleton`, `Sonner` (toaster), `Spinner`, `Toggle`, `ToggleGroup`, `Alert`, `AlertDialog`, `Accordion`, `AspectRatio`, `Breadcrumb`, `ButtonGroup`, `Collapsible`, `ContextMenu`, `Drawer`, `Empty`, `Field`, `HoverCard`, `InputGroup`, `InputOTP`, `Item`, `Kbd`, `Label`, `Menubar`, `NavigationMenu`, `Pagination`, `Popover`, `Resizable`

All components:
- Use `cn()` utility for class merging
- Support dark mode via CSS variables
- Are accessible (WAI-ARIA compliant)
- Import from `@/components/ui/` path

### `src/components/LogoDropdown.tsx` — Logo Dropdown

**Purpose:** App logo with dropdown menu for navigation.

**Features:**
- Displays the Freebuff logo SVG
- Dropdown menu with "Landing Page" option
- When authenticated: also shows "Sign Out" option (red text)

---

## 🔄 Data Flow Summary

### Game Flow
```
User lands on /
        │
        ▼
Landing page → "Play Now" or "Local Game"
        │
        ▼
Home page → "Play Local" button
        │
        ▼
Game Setup → Configure players & board mode
        │
        ▼
Game Play
  ├── createInitialGameState(boardMode, players)
  ├── Player taps dice
  │     ├── soundManager.play("dice_roll")
  │     ├── DiceRoll animates 3D tumble
  │     └── onRoll(value) fires
  ├── applyRoll(gameState, value)
  ├── Tile-by-tile animation (setInterval)
  │     ├── soundManager.play("tile_step") per step
  │     └── animatedPositions updated
  ├── Snake/ladder check → animate & play sound
  ├── Win check → game over banner + fanfare
  └── advanceTurn() → next player
```

### Settings Flow
```
Settings page
        │
        ├── Appearance section
        │     ├── Light button → setTheme("light")
        │     ├── Dark button → setTheme("dark")
        │     └── System button → setTheme("system")
        │     └── next-themes persists to localStorage
        │
        └── Sound & Effects section
              ├── Switch toggle → setSoundEnabled(bool)
              ├── Volume slider → setSoundVolume(0-1)
              └── useSoundSettings syncs to soundManager.muted/.volume
```

### Auth Flow
```
User clicks "Sign In" or "Get Started"
        │
        ▼
Auth page → Enter email
        │
        ▼
Email OTP sent → Enter 6-digit code
        │
        ▼
Convex Auth verifies → Redirect to /home
```

---

## 🎯 Key Design Principles

1. **Pure Engine:** Game logic has zero side effects — no DOM, no audio, no network calls.
2. **Immutable State:** Every engine function returns new state objects.
3. **Lazy Pages:** All routes are lazy-loaded for fast initial load.
4. **Procedural Audio:** No audio files to load — sounds are synthesized at runtime.
5. **SVG Board:** Crisp at any resolution, easy to draw complex paths.
6. **Framer Motion:** Consistent animation API across all components.
7. **Dark Mode:** Full dark mode support via next-themes + CSS custom properties.
8. **Settings Persistence:** Sound + theme preferences survive page reloads via localStorage.
9. **Mobile First:** Responsive design with max-width containers and touch-friendly targets.
