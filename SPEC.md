# Saanp Seedhi — Game Specification

> **Version:** 1.0 (Phase 1 — Local Pass & Play)  
> **Code Name:** Saanp Roll  
> **Last Updated:** July 2026

---

## 1. Overview

Saanp Seedhi (साँप सीढ़ी) is the classic Indian board game of Snakes & Ladders, rebuilt as a modern web application. The game pits 2–4 players against each other in a race to reach tile 100, with snakes that pull you down and ladders that lift you up.

### 1.1 Vision

A beautifully animated, authoritative online board game that works seamlessly across devices. Phase 1 delivers local pass-and-play. Future phases add online multiplayer, leaderboards, match history, and ranked play.

### 1.2 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + TypeScript + Vite 7 |
| Styling | Tailwind CSS v4 + shadcn/ui |
| Animation | Framer Motion |
| Audio | Howler.js (procedural synthesis via Web Audio API) |
| Backend | Convex (realtime database + serverless functions) |
| Auth | Convex Auth (email OTP + anonymous) |
| Icons | Lucide Icons |
| Package Manager | Bun |

---

## 2. Game Rules

### 2.1 Core Rules

- **Board:** 100 tiles arranged in a 10×10 zigzag pattern (left-to-right on even rows, right-to-left on odd rows).
- **Start:** All players begin off the board (position 0).
- **Roll:** Each turn, the active player rolls a single 6-sided die (1–6).
- **Move:** The player advances their token by the rolled number.
- **Exact 100:** A player must land exactly on tile 100 to win. Rolling higher than the remaining distance results in no move (overshoot).
- **Snakes:** Landing on a snake head sends the player down to the snake's tail.
- **Ladders:** Landing on a ladder bottom lifts the player up to the ladder's top.

### 2.2 Special Rules

- **Extra Roll on 6:** Rolling a 6 grants an immediate extra turn. The same player rolls again.
- **Three Consecutive Sixes:** Rolling three 6s in a row forfeits the turn. The player loses their progress from those rolls (position resets to what it was before the first 6). All three rolls are void.
- **Pass & Play:** Players take turns on a single device. The UI clearly indicates whose turn it is.

### 2.3 Board Modes

#### Classic Mode
Traditional snakes and ladders layout with 9 ladders and 10 snakes. Balanced mix of risk and reward.

**Ladders:**
| Bottom | Top |
|--------|-----|
| 1 | 38 |
| 4 | 14 |
| 9 | 31 |
| 21 | 42 |
| 28 | 84 |
| 36 | 44 |
| 51 | 67 |
| 71 | 91 |
| 80 | 100 |

**Snakes:**
| Head | Tail |
|------|------|
| 16 | 6 |
| 47 | 26 |
| 49 | 11 |
| 56 | 53 |
| 62 | 19 |
| 64 | 60 |
| 87 | 24 |
| 93 | 73 |
| 95 | 75 |
| 98 | 78 |

#### Venom Mode (Snakes Only)
A high-variance variant with 15 snakes and zero ladders. Every landing is dangerous.

**Snakes:**
| Head | Tail |
|------|------|
| 8 | 3 |
| 16 | 6 |
| 24 | 5 |
| 37 | 12 |
| 47 | 26 |
| 49 | 11 |
| 56 | 53 |
| 62 | 19 |
| 64 | 60 |
| 73 | 33 |
| 87 | 24 |
| 92 | 51 |
| 93 | 73 |
| 95 | 75 |
| 98 | 78 |

---

## 3. Architecture

### 3.1 Phase 1 (Current) — Local Pass & Play

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│  React UI   │────▶│ Game Engine  │────▶│  Sound FX    │
│  (Pages)    │     │  (Pure TS)   │     │  (Howler.js) │
└─────────────┘     └──────────────┘     └──────────────┘
       │
       ▼
┌─────────────┐
│ Convex Auth  │
│ (Optional)   │
└─────────────┘
```

- The game engine is entirely client-side, implemented as pure TypeScript functions with no side effects.
- No Convex database interaction for game state (local state only).
- Auth is optional (anonymous play supported).

### 3.2 Phase 2 (Future) — Online Multiplayer

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│  React UI   │────▶│  Convex DB   │────▶│  Game Engine │
│  (Pages)    │     │  (Realtime)  │     │  (Server)    │
└─────────────┘     └──────────────┘     └──────────────┘
       │                                      │
       ▼                                      ▼
┌─────────────┐                       ┌──────────────┐
│ Convex Auth  │                       │  Sound FX    │
│ (Required)   │                       │  (Client)    │
└─────────────┘                       └──────────────┘
```

- Game engine runs as a Convex action on the server for authoritative rolls.
- Dice rolls are server-validated to prevent cheating.
- Real-time game state sync via Convex subscriptions.

---

## 4. Game Engine API

The game engine (`src/lib/game-engine/`) is a set of pure functions that operate on immutable state.

### 4.1 Pure Functions

```typescript
// Create a fresh game state
createInitialGameState(boardMode, players): GameState

// Apply a dice roll to the current state
applyRoll(state, roll): GameState

// Advance to the next player's turn
advanceTurn(state): GameState

// Generate a random dice roll (1-6)
rollDice(): number

// Look up tile colors for the SVG board
getTileColor(position, boardMode): { bg: string; text: string }

// Look up snake/ladder positions
getSnakeTail(boardMode, tile): number | null
getLadderTop(boardMode, tile): number | null
```

### 4.2 State Machine

```
awaiting_roll ──roll──▶ rolling ──resolve──▶ resolving_move
       │                                        │
       │                                   ┌────┴────┐
       │                              overshoot     valid
       │                                   │         │
       │                              ┌────┘    ┌───┴───┐
       │                              │    snake/ladder  normal
       │                              │         │         │
       │                              │    checking_    │
       │                              │    snake_ladder  │
       │                              │         │        │
       │                              │    ┌────┘        │
       │                              │    │             │
       ▼                              ▼    ▼             ▼
  game_over                     ┌─ extra_roll (rolled 6)
                                │─ next_player (advanceTurn)
```

---

## 5. User Interface

### 5.1 Routes

| Route | Page | Purpose |
|-------|------|---------|
| `/` | Landing | Marketing page with hero, features, CTAs |
| `/auth` | Auth | Sign in / Sign up (email OTP or anonymous) |
| `/home` | Home | Dashboard with Play Local, Play Online, stats |
| `/game/setup` | Game Setup | Configure players, names, board mode |
| `/game/play` | Game Play | Active game with board, dice, progress |
| `*` | 404 | Not found fallback |

### 5.2 Key Components

- **Board (SVG):** Renders the 10×10 zigzag grid with snakes, ladders, and player tokens.
- **Dice Roll:** Animated 3D tumble using Framer Motion + Howler.js sound effects.
- **Player Progress:** Shows all players' positions with color-coded progress bars.
- **Move Log:** Collapsible log of all moves made during the game.
- **Game Over Banner:** Animated victory screen with rematch option.

### 5.3 Sound Effects

| Sound | Trigger | Synthesis |
|-------|---------|-----------|
| `dice_roll` | Dice tapped | Triangle wave sweep 200→800Hz + noise, 0.3s |
| `tile_step` | Each tile stepped | Sine tick 600Hz, 0.04s |
| `snake_bite` | Landing on snake | Sawtooth sweep 400→120Hz, 0.35s |
| `ladder_climb` | Landing on ladder | Sine sweep 300→700Hz, 0.3s |
| `win_fanfare` | Player reaches 100 | Sine tone 784Hz (G5), 0.5s |
| `overshoot` | Roll > remaining tiles | Triangle sweep 300→100Hz, 0.25s |

---

## 6. Future Phases

### Phase 2: Online Multiplayer
- Convex-powered game rooms
- Real-time turn notifications
- Random opponent matching
- Server-authoritative dice rolls
- Player rankings and ELO

### Phase 3: Social & Engagement
- Match history and replays
- Friend list and private games
- Achievement system
- Custom board mode editor
- Push notifications for turn reminders

---

## 7. Testing

The game engine is thoroughly unit-tested with Vitest. Test coverage includes:

- Dice roll value range (1–6, all values reachable)
- Basic movement and position tracking
- Overshoot handling (rolling past 100)
- Win detection (exact 100)
- Snake and ladder resolution
- Three consecutive sixes forfeit
- Extra roll on six
- Turn advancement and wrapping (2–4 players)
- Both Classic and Venom board modes
- Position initialization at 0

**Run tests:** `bun test` or `bun vitest run`
