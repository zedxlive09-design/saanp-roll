# Saanp Seedhi — Handoff Document

> **Project:** Saanp Roll (Snakes & Ladders Web Game)  
> **Phase:** 1 — Local Pass & Play  
> **Date:** July 2026  

---

## 1. Project State

### 1.1 What's Complete

- ✅ **Game Engine (Pure TypeScript):** All core game logic — dice rolls, movement, snakes, ladders, win detection, three-sixes forfeit, extra roll on 6, turn management. 22 unit tests passing.
- ✅ **Board Rendering (SVG):** 10×10 zigzag grid with snake and ladder overlay paths. Player tokens with initials. Animated tile highlighting.
- ✅ **Dice Roll (3D Animation):** Framer Motion rotateX/rotateY tumble effect with spring-loaded dot animations. Shine sweep during roll.
- ✅ **Sound System (Howler.js + Web Audio API):** 6 procedurally synthesized sound effects — dice rattle, tile step, snake bite, ladder climb, win fanfare, overshoot. Async init with fire-and-forget playback.
- ✅ **Tile-by-Tile Movement Animation:** Player tokens step through each intermediate tile rather than teleporting. Snake/ladder timing aligned with visual animation.
- ✅ **Game Setup UI:** 2–4 player configuration with name inputs, color indicators, board mode selection (Classic / Venom).
- ✅ **Landing Page:** Modern themed marketing page with hero, feature cards, mode descriptions, CTAs.
- ✅ **Home Page:** Dashboard with Play Local, Play Online (disabled/coming-soon), stats cards, match history/leaderboard buttons.
- ✅ **Authentication:** Email OTP + anonymous sign-in via Convex Auth. Auth page at `/auth`.
- ✅ **Routing:** All routes configured with lazy loading via React Suspense.
- ✅ **Theme:** Full light/dark mode with custom oklch color tokens.

### 1.2 What's In Progress / Known Issues

- **Play Online (Coming Soon):** The "Play Online" button on the home page is disabled with a "SOON" badge. Requires Phase 2 implementation with Convex game rooms.
- **Match History / Leaderboard:** Buttons exist but navigate to `/history` and `/leaderboard` which redirect to 404. No backend implementation yet.
- **Settings Page:** The settings gear icon navigates to `/settings` which doesn't exist yet.
- **Sound Auto-Play Policy:** Modern browsers require a user gesture before playing audio. The first dice tap initializes the AudioContext, but some browsers may briefly block the first `dice_roll` sound. No workaround needed — this is standard behavior.

### 1.3 Test Results

```
✓ src/lib/game-engine/__tests__/engine.test.ts (22 tests)
  ✓ rollDice returns 1-6
  ✓ rollDice can produce all values over many rolls
  ✓ applyRoll basic movement
  ✓ applyRoll overshoot
  ✓ applyRoll win at exactly 100
  ✓ applyRoll snake resolution
  ✓ applyRoll ladder resolution
  ✓ applyRoll three sixes forfeit
  ✓ applyRoll extra roll on six
  ✓ applyRoll tracks consecutive sixes
  ✓ advanceTurn advances to next player
  ✓ advanceTurn wraps around for 2 players
  ✓ advanceTurn wraps around for 4 players
  ✓ advanceTurn resets sixes for new player
  ✓ createInitialGameState positions at 0
  ✓ createInitialGameState first player current
  ✓ createInitialGameState empty logs
  ✓ Classic board: venom has no ladders
  ✓ Classic board: venom has more snakes
  ✓ Venom board: correct snake count
  ✓ Venom board: no ladders
  ✓ Venom board: snake resolution
```

---

## 2. Architecture Overview

```
src/
├── main.tsx                    # App bootstrap, routing, providers
├── index.css                   # Global styles, theme tokens (oklch)
├── instrumentation.tsx         # Error boundary, Vly monitoring
│
├── pages/                      # Route-level page components
│   ├── Landing.tsx             # / — Marketing landing page
│   ├── Auth.tsx                # /auth — Sign in / Sign up
│   ├── Home.tsx                # /home — Dashboard hub
│   ├── GameSetup.tsx           # /game/setup — Create new game
│   ├── GamePlay.tsx            # /game/play — Active game
│   └── NotFound.tsx            # /* — 404 fallback
│
├── components/
│   ├── game/                   # Game-specific components
│   │   ├── Board.tsx           # SVG 10×10 board with snakes/ladders
│   │   └── DiceRoll.tsx        # 3D animated dice with sound
│   ├── ui/                     # shadcn/ui primitives (auto-generated)
│   │   ├── button.tsx, card.tsx, badge.tsx, input.tsx, ...
│   │   └── index.ts            # Re-exports all UI components
│   └── LogoDropdown.tsx        # Logo with sign-out dropdown
│
├── lib/
│   ├── game-engine/            # Pure game logic (no UI, no side effects)
│   │   ├── types.ts            # TypeScript types & interfaces
│   │   ├── boards.ts           # Board configs (Classic, Venom)
│   │   ├── engine.ts           # Core engine functions
│   │   └── index.ts            # Public API re-exports
│   ├── sounds.ts               # Procedural sound synthesis + Howler.js
│   ├── utils.ts                # cn() utility for class merging
│   └── vly-integrations.ts     # Vly AI/email/payments integration config
│
├── convex/                     # Convex backend (auth only in Phase 1)
│   ├── schema.ts               # Database schema
│   ├── auth.ts                 # Auth provider config (READ ONLY)
│   ├── auth.config.ts          # Auth domain config (READ ONLY)
│   ├── auth/emailOtp.ts        # Email OTP implementation (READ ONLY)
│   ├── users.ts                # User queries (getCurrentUser)
│   └── http.ts                 # Auth HTTP routes
│
├── hooks/
│   ├── use-auth.ts             # Auth hook wrapping Convex Auth
│   └── use-mobile.ts           # Mobile breakpoint detection
│
└── __tests__/                  # Game engine unit tests
    └── engine.test.ts          # 22 Vitest test cases
```

---

## 3. Key Architectural Decisions

### 3.1 Pure Game Engine

The game engine (`src/lib/game-engine/`) is implemented as **pure functions with no side effects or DOM dependencies**. This design ensures:

- **Testability:** The engine can be unit-tested without any DOM or browser APIs.
- **Portability:** The same engine code can run on the **client** (Phase 1) or **server** (Phase 2) without modification.
- **Determinism:** Given the same state and roll, `applyRoll` always produces the same result.

### 3.2 Immutable State

All engine functions return **new state objects** rather than mutating existing ones. This simplifies React state management — `setGameState(applyRoll(gameState, roll))` is safe and predictable.

### 3.3 Procedural Audio

Rather than bundling audio files, sounds are **synthesized at runtime** using the Web Audio API's `OfflineAudioContext`. This keeps the bundle small and avoids loading external assets. The audio is rendered once during `soundManager.init()`, cached, and played back via Howler.js.

### 3.4 SVG Board

The board is rendered as an **inline SVG** element rather than a canvas or HTML grid. This provides:
- Crisp rendering at any resolution (infinitely scalable)
- Simple path drawing for snakes and ladders
- Native event handling via React
- Easy styling with CSS/Tailwind classes

### 3.5 Animations via Framer Motion

All animations use Framer Motion for consistency:
- Page transitions: `motion.div` with opacity/y animations
- Dice: 3D rotateX/rotateY keyframes with spring scales
- Player tokens: layout animations on progress bars
- Game over banner: spring-based entrance with scale + opacity

---

## 4. Code Style & Conventions

### 4.1 Imports
- Always use `@/` path alias (e.g., `import { Button } from "@/components/ui/button"`)
- Import React Router v7 from `react-router` (not `react-router-dom`)
- Import Convex hooks from `convex/react`
- Import auth from `@/hooks/use-auth`

### 4.2 Component Patterns
- Pages use `export default function PageName()` — default export for lazy loading
- Reusable components use `export function ComponentName()` — named export
- shadcn/ui primitives are re-exported via `src/components/ui/index.ts`

### 4.3 Error Handling
- `src/instrumentation.tsx` provides an `ErrorBoundary` class component wrapping the app
- Runtime errors caught by `window.onerror` and `unhandledrejection` handlers
- Vly monitoring integration for production error tracking

---

## 5. Local Development

```bash
# Install dependencies
bun install

# Start dev server
bun dev

# Run tests
bun test

# TypeScript type check
bun tsc -b --noEmit

# Build for production
bun run build
```

---

## 6. Deployment

- **Hosting:** The project runs on Freebuff's WebContainer platform with automatic HTTPS and routing.
- **Convex:** The Convex backend is deployed separately with `npx convex deploy`.
- **Environment Variables:**
  - `VITE_CONVEX_URL` — Convex deployment URL (client-side)
  - `VITE_VLY_APP_ID` — Freebuff project ID for monitoring
  - `VITE_VLY_MONITORING_URL` — Error reporting endpoint
  - Server-side: `CONVEX_SITE_URL`, `JWKS`, `JWT_PRIVATE_KEY` (Convex auth)

---

## 7. Phase 2 Preparation

The codebase is designed for easy Phase 2 expansion:

1. **Server-side engine:** The pure functions in `src/lib/game-engine/` can be copied into Convex actions directly. No code changes needed.
2. **Game rooms:** Create a Convex table `games` with fields for `state`, `players`, `status`, `currentTurn`.
3. **Real-time sync:** Use Convex queries for reactive game state subscriptions.
4. **Matchmaking:** Add a `matchmaking` queue table with timeout logic.
5. **Auth gates:** Protect game routes with `useAuth()` redirect to `/auth`.

Key files to create in Phase 2:
- `src/convex/games.ts` — Game room mutations/actions
- `src/convex/matchmaking.ts` — Queue logic
- `src/hooks/use-game-room.ts` — Realtime game state hook
- Update `GamePlay.tsx` to support both local and online modes

---

## 8. Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| react | ^19.2.0 | UI framework |
| react-dom | ^19.2.0 | DOM rendering |
| react-router | ^7.10.0 | Routing |
| framer-motion | ^12.23.25 | Animations |
| howler | ^2.2.4 | Audio playback |
| convex | ^1.30.0 | Backend + database |
| @convex-dev/auth | ^0.0.90 | Authentication |
| tailwindcss | ^4.1.17 | Utility CSS |
| @tailwindcss/vite | ^4.1.17 | Tailwind Vite plugin |
| vite | ^7.2.6 | Build tool |
| vitest | ^4.1.9 | Testing |
| typescript | ~5.9.3 | Type system |
| lucide-react | ^0.555.0 | Icons |
