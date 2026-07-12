import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useGameRoom, useMatchmaking } from "@/hooks/use-game-room";
import { useAuth } from "@/hooks/use-auth";
import { BOARD_CONFIGS } from "@/lib/game-engine";
import type { BoardMode } from "@/lib/game-engine";
import { toast } from "sonner";
import {
  ArrowLeft,
  Copy,
  Share2,
  Check,
  Users,
  Play,
  LogIn,
  Loader2,
  Link as LinkIcon,
  Skull,
  RefreshCw,
  Wifi,
  Swords,
  X,
  Coins,
  Cpu,
} from "lucide-react";

/**
 * Online lobby — full-bleed felt-green table, big translucent room-code panel,
 * translucent create/join cards, available games list as translucent cards.
 * Preserves ALL logic: useGameRoom, handleCreate/handleJoin/handleStart,
 * lobbyMode state, LandscapePrompt, mode toggle.
 */
type LobbyPhase = "menu" | "creating" | "joining" | "waiting" | "starting";

export default function OnlineLobby() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const activeGames = useQuery(api.games.getUserActiveGames);
  const activeGamesLoading = activeGames === undefined;

  const [phase, setPhase] = useState<LobbyPhase>("menu");
  const [roomCode, setRoomCode] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [createCode, setCreateCode] = useState("");
  const [playerCount, setPlayerCount] = useState(2);
  const [boardMode, setBoardMode] = useState<BoardMode>("classic");
  const [entryFee, setEntryFee] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [gameId, setGameId] = useState<string | null>(null);
  const [joinName, setJoinName] = useState("");
  const [lobbyMode, setLobbyMode] = useState<"friends" | "quickmatch">(
    "friends",
  );

  // Coins balance (DEFAULT_COINS = 500 if unauthenticated or never set).
  const coinsBalance = useQuery(api.coins.getMyCoins);
  const coins = coinsBalance ?? 0;

  const ENTRY_FEE_TIERS: { label: string; value: number; hint: string }[] = [
    { label: "Free", value: 0, hint: "No entry fee" },
    { label: "Casual", value: 50, hint: "50 coins" },
    { label: "Pro", value: 200, hint: "200 coins" },
    { label: "High Roller", value: 500, hint: "500 coins" },
  ];
  const insufficientCoins = isAuthenticated && entryFee > coins;

  // Quick Match (real matchmaking) state
  const { myQueueEntry, joinQueue, leaveQueue } = useMatchmaking();
  const [qmBoard, setQmBoard] = useState<BoardMode>("classic");
  const [qmLoading, setQmLoading] = useState(false);
  // Optimistic searching state — shown immediately on click, before Convex confirms
  const [qmSearching, setQmSearching] = useState(false);
  const [qmElapsed, setQmElapsed] = useState(0);
  const [qmError, setQmError] = useState<string | null>(null);
  const matchedNavRef = useRef<string | null>(null);

  const { game, createGame, joinGame, startGame } = useGameRoom(
    phase === "waiting" || phase === "starting" ? createCode || joinCode : null,
  );

  // Navigate to game when it starts
  useEffect(() => {
    if (game?.status === "playing" && (createCode || joinCode)) {
      navigate(`/game/online/${createCode || joinCode}`, { replace: true });
    }
  }, [game?.status, createCode, joinCode, navigate]);

  // Navigate to the matched Quick Match game once. Track the last roomCode we
  // navigated to so a re-render doesn't push twice.
  useEffect(() => {
    if (
      myQueueEntry?.status === "matched" &&
      myQueueEntry.roomCode &&
      matchedNavRef.current !== myQueueEntry.roomCode
    ) {
      matchedNavRef.current = myQueueEntry.roomCode;
      navigate(`/game/online/${myQueueEntry.roomCode}`, { replace: true });
    }
  }, [myQueueEntry, navigate]);

  // Elapsed timer for searching state
  useEffect(() => {
    if (!qmSearching) {
      setQmElapsed(0);
      return;
    }
    const start = Date.now();
    const interval = setInterval(() => {
      setQmElapsed(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [qmSearching]);

  // Stop optimistic searching when Convex confirms matched or searching is over
  useEffect(() => {
    if (myQueueEntry?.status === "matched") {
      setQmSearching(false);
    }
  }, [myQueueEntry?.status]);

  const handleCreate = async () => {
    if (entryFee > 0 && !isAuthenticated) {
      toast.error("Sign in to create a paid room");
      navigate("/auth");
      return;
    }
    if (insufficientCoins) {
      toast.error(
        `Not enough coins — need ${entryFee}, have ${coins}`,
      );
      return;
    }
    setIsLoading(true);
    try {
      const result = await createGame({
        boardId: boardMode,
        playerCount,
        entryFee,
      });
      const code = result.roomCode;
      setCreateCode(code);
      setGameId(result.gameId);
      setPhase("waiting");
      if (entryFee > 0) {
        toast.success(
          `Room created! −${entryFee} coins entry fee`,
        );
      } else {
        toast.success("Room created! Share the code with friends.");
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to create room",
      );
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoin = async () => {
    if (joinCode.length < 4) return;
    setIsLoading(true);
    try {
      const result = await joinGame({
        roomCode: joinCode.toUpperCase(),
        playerName: joinName || undefined,
      });
      setCreateCode(joinCode.toUpperCase());
      setGameId(result.gameId);
      setPhase("waiting");
      toast.success("Joined room! Waiting for host to start.");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to join room",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleStart = async () => {
    if (!gameId) return;
    setIsLoading(true);
    try {
      await startGame({ gameId: gameId as any });
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to start game",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleFindMatch = async () => {
    setQmLoading(true);
    setQmError(null);
    // Optimistic: show searching screen IMMEDIATELY
    setQmSearching(true);
    try {
      await joinQueue({ boardId: qmBoard });
      // Convex confirmed — searching state stays until matched
    } catch (err) {
      setQmSearching(false);
      const msg = err instanceof Error ? err.message : "Failed to join queue";
      setQmError(msg);
      toast.error(msg);
    } finally {
      setQmLoading(false);
    }
  };

  const handleCancelMatch = async () => {
    setQmSearching(false);
    try {
      await leaveQueue();
    } catch {
      // Even if the server call fails, we already stopped searching locally
    }
  };

  const copyRoomCode = () => {
    navigator.clipboard.writeText(createCode || joinCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareLink = async () => {
    const code = createCode || joinCode;
    if (!code) return;
    const url = `${window.location.origin}/game/online/${code}`;
    const shareData = {
      title: "Saanp Seedhi — Join my game!",
      text: `Join my Snakes & Ladders game. Room code: ${code}`,
      url,
    };
    // Try the Web Share API first (mobile/Capacitor), fall back to clipboard
    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch {
        // User cancelled or share failed — fall back to clipboard
      }
    }
    navigator.clipboard.writeText(url);
    toast.success("Invite link copied!");
  };

  const isHost =
    game?.hostUserId ===
    (isAuthenticated
      ? (game?.players[0]?.userId ?? "")
      : (game?.players[0]?.userId ?? ""));

  const joinedCount = game?.players.filter((p) => p.userId).length ?? 0;

  return (
    <>
      <div
        className="min-h-screen overflow-y-auto"
        style={{
          // Deep felt-green table gradient — matches GamePlay classic board
          background:
            "radial-gradient(ellipse at 50% 30%, oklch(0.4 0.06 150) 0%, oklch(0.28 0.05 150) 70%, oklch(0.2 0.04 150) 100%)",
        }}
      >
        {/* Warm spotlight overlay */}
        <div
          className="pointer-events-none fixed inset-0"
          style={{
            background:
              "radial-gradient(ellipse at 50% 25%, oklch(1 0.02 80 / 0.14) 0%, transparent 55%)",
          }}
        />
        {/* Vignette for depth */}
        <div
          className="pointer-events-none fixed inset-0"
          style={{ boxShadow: "inset 0 0 220px 60px oklch(0 0 0 / 0.55)" }}
        />

        <div className="relative z-10">
          {/* Back button — translucent game icon */}
          <button
            onClick={() => navigate("/home")}
            aria-label="Back"
            className="absolute left-4 top-4 z-30 flex size-11 items-center justify-center rounded-2xl border border-white/15 bg-black/30 text-white/80 backdrop-blur-md transition-colors hover:bg-black/50 hover:text-white"
          >
            <ArrowLeft className="size-5" />
          </button>

          {/* Page title */}
          <div className="mx-auto max-w-2xl px-4 pt-6 pb-2">
            <motion.div
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="text-center"
            >
              <h1 className="font-display text-3xl font-bold tracking-tight text-white/95">
                {phase === "waiting" ? "Game Lobby" : "Play Online"}
              </h1>
              <p className="mt-1 font-display text-xs uppercase tracking-[0.4em] text-white/45">
                {phase === "waiting"
                  ? "Waiting for players"
                  : "Create or join a room"}
              </p>
            </motion.div>
          </div>

          <main className="mx-auto max-w-2xl space-y-4 px-4 pb-10 pt-4">
            <AnimatePresence mode="wait">
              {phase === "menu" && (
                <motion.div
                  key="menu"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -16 }}
                  className="space-y-4"
                >
                  {/* Active games — translucent reconnect card */}
                  {!activeGamesLoading &&
                    activeGames &&
                    activeGames.length > 0 && (
                      <div className="space-y-2 rounded-2xl border border-secondary/40 bg-secondary/10 p-4 backdrop-blur-md">
                        <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-secondary">
                          <RefreshCw className="h-3.5 w-3.5" />
                          Active Games
                        </p>
                        <div className="space-y-2">
                          {activeGames.map((g) => {
                            const isPlaying = g.status === "playing";
                            const gRoomCode = g.roomCode;
                            const boardName =
                              g.boardId === "venom"
                                ? "Venom Mode"
                                : "Classic";
                            const gPlayerCount = g.players.filter(
                              (p) => p.userId,
                            ).length;
                            return (
                              <div
                                key={g._id}
                                className="flex items-center justify-between rounded-xl border border-white/15 bg-black/30 px-3 py-2.5 backdrop-blur-md"
                              >
                                <div className="flex min-w-0 items-center gap-2.5">
                                  <Wifi
                                    className={`h-4 w-4 shrink-0 ${
                                      isPlaying
                                        ? "text-secondary"
                                        : "text-primary"
                                    }`}
                                  />
                                  <div className="min-w-0">
                                    <p className="truncate text-sm font-medium text-white/90">
                                      {boardName}
                                      <span className="ml-2 rounded-md border border-white/20 bg-black/40 px-1.5 py-0.5 font-mono text-[10px] text-white/70">
                                        {gRoomCode}
                                      </span>
                                    </p>
                                    <p className="text-xs text-white/55">
                                      {isPlaying
                                        ? "In progress"
                                        : "Waiting in lobby"}
                                      · {gPlayerCount} player
                                      {gPlayerCount !== 1 ? "s" : ""}
                                    </p>
                                  </div>
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="ml-2 shrink-0 border-white/20 bg-white/5 text-white/85 hover:bg-white/10"
                                  onClick={() =>
                                    navigate(
                                      isPlaying
                                        ? `/game/online/${gRoomCode}`
                                        : `/lobby`,
                                    )
                                  }
                                >
                                  <RefreshCw className="mr-1 h-3 w-3" />
                                  {isPlaying ? "Reconnect" : "Lobby"}
                                </Button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                  {/* Mode toggle */}
                  <div className="flex rounded-2xl border border-white/15 bg-black/30 p-1 backdrop-blur-md">
                    <button
                      type="button"
                      onClick={() => setLobbyMode("friends")}
                      className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-display font-semibold transition-all ${
                        lobbyMode === "friends"
                          ? "bg-primary text-primary-foreground shadow-[0_4px_0_0_oklch(0.5_0.12_55)]"
                          : "text-white/55 hover:text-white/85"
                      }`}
                    >
                      Play with Friends
                    </button>
                    <button
                      type="button"
                      onClick={() => setLobbyMode("quickmatch")}
                      className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-display font-semibold transition-all ${
                        lobbyMode === "quickmatch"
                          ? "bg-primary text-primary-foreground shadow-[0_4px_0_0_oklch(0.5_0.12_55)]"
                          : "text-white/55 hover:text-white/85"
                      }`}
                    >
                      Quick Match
                    </button>
                  </div>

                  {lobbyMode === "friends" && (
                    <>
                      {/* Create Room — translucent game card */}
                      <div className="space-y-4 rounded-2xl border border-white/15 bg-black/30 p-5 backdrop-blur-md">
                        <h2 className="flex items-center gap-2 font-display text-base font-bold text-white/95">
                          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20 ring-1 ring-primary/30">
                            <Play className="h-4 w-4 text-primary" />
                          </span>
                          Create a Room
                        </h2>

                        {/* Board Mode */}
                        <div className="space-y-2">
                          <p className="text-xs font-medium text-white/55">
                            Board Mode
                          </p>
                          <div className="grid grid-cols-2 gap-2">
                            {(["classic", "venom"] as BoardMode[]).map(
                              (mode) => {
                                const config = BOARD_CONFIGS[mode];
                                const isSelected = boardMode === mode;
                                return (
                                  <button
                                    key={mode}
                                    type="button"
                                    onClick={() => setBoardMode(mode)}
                                    className={`flex flex-col items-center gap-1.5 rounded-xl border-2 p-3 transition-all hover:-translate-y-0.5 cursor-pointer ${
                                      isSelected
                                        ? mode === "venom"
                                          ? "border-destructive bg-destructive/15"
                                          : "border-primary bg-primary/15"
                                        : "border-white/15 bg-white/5 hover:border-white/30 hover:bg-white/10"
                                    }`}
                                  >
                                    {mode === "venom" ? (
                                      <Skull
                                        className={`h-4 w-4 ${
                                          isSelected
                                            ? "text-destructive"
                                            : "text-white/60"
                                        }`}
                                      />
                                    ) : (
                                      <Play
                                        className={`h-4 w-4 ${
                                          isSelected
                                            ? "text-primary"
                                            : "text-white/60"
                                        }`}
                                      />
                                    )}
                                    <span
                                      className={`text-xs font-semibold ${
                                        isSelected
                                          ? mode === "venom"
                                            ? "text-destructive"
                                            : "text-primary"
                                          : "text-white/70"
                                      }`}
                                    >
                                      {config.name}
                                    </span>
                                  </button>
                                );
                              },
                            )}
                          </div>
                        </div>

                        {/* Player Count */}
                        <div className="space-y-2">
                          <p className="text-xs font-medium text-white/55">
                            Players
                          </p>
                          <div className="flex items-center gap-2">
                            {[2, 3, 4].map((n) => (
                              <button
                                key={n}
                                type="button"
                                onClick={() => setPlayerCount(n)}
                                className={`flex-1 rounded-xl border-2 py-2 text-sm font-medium transition-all hover:-translate-y-0.5 cursor-pointer ${
                                  playerCount === n
                                    ? "border-primary bg-primary/15 text-primary"
                                    : "border-white/15 bg-white/5 text-white/70 hover:border-white/30 hover:bg-white/10"
                                }`}
                              >
                                {n}P
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Entry Fee */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-medium text-white/55">
                              Entry Fee
                            </p>
                            {/* Coins balance chip */}
                            <div className="flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1">
                              <Coins className="h-3 w-3 text-primary" />
                              <span className="font-display text-xs font-bold text-primary">
                                {isAuthenticated ? coins.toLocaleString() : "—"}
                              </span>
                            </div>
                          </div>
                          <div className="grid grid-cols-4 gap-2">
                            {ENTRY_FEE_TIERS.map((tier) => {
                              const isSelected = entryFee === tier.value;
                              const tooExpensive =
                                isAuthenticated && tier.value > coins;
                              return (
                                <button
                                  key={tier.value}
                                  type="button"
                                  onClick={() => setEntryFee(tier.value)}
                                  disabled={tooExpensive}
                                  className={`flex flex-col items-center gap-0.5 rounded-xl border-2 px-1 py-2 transition-all cursor-pointer ${
                                    isSelected
                                      ? "border-primary bg-primary/15"
                                      : tooExpensive
                                        ? "cursor-not-allowed border-white/10 bg-white/5 opacity-40"
                                        : "border-white/15 bg-white/5 hover:border-white/30 hover:bg-white/10"
                                  }`}
                                  title={tooExpensive ? "Not enough coins" : tier.hint}
                                >
                                  <span
                                    className={`font-display text-xs font-bold ${
                                      isSelected
                                        ? "text-primary"
                                        : "text-white/80"
                                    }`}
                                  >
                                    {tier.label}
                                  </span>
                                  <span
                                    className={`text-[10px] ${
                                      isSelected
                                        ? "text-primary/80"
                                        : "text-white/55"
                                    }`}
                                  >
                                    {tier.value === 0 ? "Free" : tier.value}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                          {insufficientCoins && (
                            <p className="text-[11px] font-medium text-destructive">
                              Not enough coins for this tier — pick a lower tier
                              or earn more.
                            </p>
                          )}
                          {entryFee > 0 && (
                            <p className="text-[11px] text-white/55">
                              Winner takes the pot ({entryFee} × joined players).
                              Leaving mid-match counts as a defeat.
                            </p>
                          )}
                        </div>

                        <Button
                          className="h-12 w-full font-semibold shadow-[0_6px_0_0_oklch(0.5_0.12_55)] hover:shadow-[0_4px_0_0_oklch(0.5_0.12_55)] active:translate-y-0.5"
                          onClick={handleCreate}
                          disabled={isLoading || insufficientCoins}
                        >
                          {isLoading ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Play className="mr-2 h-4 w-4" />
                          )}
                          Create Room
                        </Button>
                      </div>

                      {/* Or divider */}
                      <div className="relative py-1">
                        <div className="absolute inset-0 flex items-center">
                          <span className="w-full border-t border-white/15" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                          <span className="bg-black/30 px-3 font-display tracking-widest text-white/40 backdrop-blur-md">
                            Or
                          </span>
                        </div>
                      </div>

                      {/* Join Room — translucent game card */}
                      <div className="space-y-4 rounded-2xl border border-white/15 bg-black/30 p-5 backdrop-blur-md">
                        <h2 className="flex items-center gap-2 font-display text-base font-bold text-white/95">
                          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary/20 ring-1 ring-secondary/30">
                            <LogIn className="h-4 w-4 text-secondary" />
                          </span>
                          Join a Room
                        </h2>
                        <div className="space-y-2">
                          <Input
                            placeholder="Enter room code"
                            value={joinCode}
                            onChange={(e) =>
                              setJoinCode(e.target.value.toUpperCase())
                            }
                            maxLength={6}
                            className="border-white/20 bg-white/5 text-center font-mono text-lg uppercase tracking-[0.3em] text-white placeholder:text-white/40"
                          />
                          <Input
                            placeholder="Your display name (optional)"
                            value={joinName}
                            onChange={(e) => setJoinName(e.target.value)}
                            maxLength={20}
                            className="border-white/20 bg-white/5 text-white placeholder:text-white/40"
                          />
                        </div>
                        <Button
                          className="h-12 w-full border-2 border-secondary/40 bg-secondary/15 font-semibold text-secondary hover:bg-secondary/25"
                          variant="outline"
                          onClick={handleJoin}
                          disabled={isLoading || joinCode.length < 4}
                        >
                          {isLoading ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <LinkIcon className="mr-2 h-4 w-4" />
                          )}
                          Join Room
                        </Button>
                      </div>
                    </>
                  )}

                  {lobbyMode === "quickmatch" && (
                    <div className="space-y-4 rounded-2xl border border-white/15 bg-black/30 p-5 backdrop-blur-md">
                      <h2 className="flex items-center gap-2 font-display text-base font-bold text-white/95">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary/20 ring-1 ring-secondary/30">
                          <Swords className="h-4 w-4 text-secondary" />
                        </span>
                        Quick Match
                      </h2>

                      {(qmSearching || myQueueEntry?.status === "searching") ? (
                        <div className="space-y-5 py-4 text-center">
                          {/* Big 8BP-style searching spinner */}
                          <div className="relative mx-auto flex h-28 w-28 items-center justify-center">
                            <span className="absolute h-28 w-28 animate-ping rounded-full bg-secondary/20" />
                            <span className="absolute h-20 w-20 animate-pulse rounded-full bg-secondary/15" />
                            <span className="absolute h-12 w-12 rounded-full bg-secondary/10" />
                            <Loader2 className="relative h-8 w-8 animate-spin text-secondary" />
                          </div>
                          <div className="space-y-1">
                            <p className="font-display text-base font-bold text-white/95">
                              Finding Opponent
                            </p>
                            <p className="text-xs text-white/50">
                              {qmBoard === "venom" ? "Venom Mode" : "Classic Mode"}
                              {" · "}
                              {qmElapsed}s elapsed
                            </p>
                          </div>
                          {/* Progress dots */}
                          <div className="flex items-center justify-center gap-1.5">
                            {[0, 1, 2].map((i) => (
                              <span
                                key={i}
                                className="h-1.5 w-1.5 rounded-full bg-secondary/60"
                                style={{
                                  animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
                                }}
                              />
                            ))}
                          </div>
                          {qmElapsed > 15 && (
                            <p className="text-[11px] text-white/40">
                              Taking a while? Bots will fill in if no opponent is found.
                            </p>
                          )}
                          <Button
                            variant="outline"
                            className="h-11 w-full border-destructive/40 bg-destructive/10 font-semibold text-destructive hover:bg-destructive/20"
                            onClick={handleCancelMatch}
                          >
                            <X className="mr-2 h-4 w-4" />
                            Cancel
                          </Button>
                        </div>
                      ) : myQueueEntry?.status === "matched" ? (
                        <div className="space-y-3 py-2 text-center">
                          <div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-secondary/20 ring-2 ring-secondary/40">
                            <Check className="h-7 w-7 text-secondary" />
                          </div>
                          <p className="font-display text-sm font-bold text-secondary">
                            Match found!
                          </p>
                          <p className="text-xs text-white/55">
                            Opponent: {myQueueEntry.opponentName ?? "Player"}
                          </p>
                          <p className="text-xs text-white/40">
                            Joining game...
                          </p>
                        </div>
                      ) : (
                        <>
                          {/* Board Mode selector */}
                          <div className="space-y-2">
                            <p className="text-xs font-medium text-white/55">
                              Board Mode
                            </p>
                            <div className="grid grid-cols-2 gap-2">
                              {(["classic", "venom"] as BoardMode[]).map(
                                (mode) => {
                                  const config = BOARD_CONFIGS[mode];
                                  const isSelected = qmBoard === mode;
                                  return (
                                    <button
                                      key={mode}
                                      type="button"
                                      onClick={() => setQmBoard(mode)}
                                      className={`flex flex-col items-center gap-1.5 rounded-xl border-2 p-3 transition-all hover:-translate-y-0.5 cursor-pointer ${
                                        isSelected
                                          ? mode === "venom"
                                            ? "border-destructive bg-destructive/15"
                                            : "border-primary bg-primary/15"
                                          : "border-white/15 bg-white/5 hover:border-white/30 hover:bg-white/10"
                                      }`}
                                    >
                                      {mode === "venom" ? (
                                        <Skull
                                          className={`h-4 w-4 ${
                                            isSelected
                                              ? "text-destructive"
                                              : "text-white/60"
                                          }`}
                                        />
                                      ) : (
                                        <Play
                                          className={`h-4 w-4 ${
                                            isSelected
                                              ? "text-primary"
                                              : "text-white/60"
                                          }`}
                                        />
                                      )}
                                      <span
                                        className={`text-xs font-semibold ${
                                          isSelected
                                            ? mode === "venom"
                                              ? "text-destructive"
                                              : "text-primary"
                                            : "text-white/70"
                                        }`}
                                      >
                                        {config.name}
                                      </span>
                                    </button>
                                  );
                                },
                              )}
                            </div>
                          </div>

                          <Button
                            className="h-12 w-full font-semibold shadow-[0_6px_0_0_oklch(0.5_0.12_55)] hover:shadow-[0_4px_0_0_oklch(0.5_0.12_55)] active:translate-y-0.5"
                            onClick={handleFindMatch}
                            disabled={qmLoading || isAuthLoading}
                          >
                            {qmLoading ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <Swords className="mr-2 h-4 w-4" />
                            )}
                            Find Match
                          </Button>
                          {qmError && (
                            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-center text-xs text-destructive">
                              {qmError}
                            </div>
                          )}
                          <p className="text-center text-xs text-white/45">
                            Matched with a random opponent. Games start
                            instantly when an opponent is found.
                          </p>
                        </>
                      )}
                    </div>
                  )}
                </motion.div>
              )}

              {phase === "waiting" && (
                <motion.div
                  key="waiting"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -16 }}
                  className="space-y-4"
                >
                  {/* Big game-style room code panel — translucent, gold accent */}
                  <div className="rounded-2xl border-2 border-primary/40 bg-gradient-to-b from-primary/15 to-transparent p-6 text-center backdrop-blur-md">
                    <p className="font-display text-xs uppercase tracking-[0.4em] text-white/55">
                      Room Code
                    </p>
                    <div className="mt-3 flex items-center justify-center gap-3">
                      <span className="font-mono text-3xl font-bold tracking-[0.25em] text-primary sm:text-4xl">
                        {createCode || joinCode}
                      </span>
                      <button
                        onClick={copyRoomCode}
                        aria-label="Copy code"
                        className="flex size-10 items-center justify-center rounded-xl border border-white/15 bg-black/30 text-white/80 backdrop-blur-md transition-colors hover:bg-black/50 hover:text-white"
                      >
                        {copied ? (
                          <Check className="h-4 w-4 text-secondary" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    <p className="mt-3 text-xs text-white/55">
                      Share this code with friends to join the game
                    </p>
                    <button
                      onClick={shareLink}
                      className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-primary/40 bg-primary/15 font-semibold text-primary backdrop-blur-md transition-colors hover:bg-primary/25"
                    >
                      <Share2 className="h-4 w-4" />
                      Share Invite Link
                    </button>
                  </div>

                  {/* Players list — translucent game card */}
                  <div className="space-y-3 rounded-2xl border border-white/15 bg-black/30 p-5 backdrop-blur-md">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-white/60" />
                        <span className="font-display text-sm font-semibold text-white/95">
                          Players
                        </span>
                      </div>
                      <Badge className="border border-secondary/30 bg-secondary/15 text-secondary">
                        {joinedCount}/{game?.players.length ?? 2}
                      </Badge>
                    </div>
                    <Separator className="bg-white/10" />
                    <div className="space-y-2">
                      {(game?.players ?? []).map((player, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-3 rounded-xl border border-white/15 bg-white/5 px-3 py-2.5"
                        >
                          <div
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ring-2 ring-white/20"
                            style={{ backgroundColor: player.color }}
                          >
                            {player.name.charAt(0)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-white/90">
                              {player.name}
                              {player.isBot && (
                                <Badge
                                  variant="secondary"
                                  className="ml-2 gap-1 text-[10px]"
                                  title="Bot"
                                >
                                  <Cpu className="size-2.5" />
                                  BOT
                                </Badge>
                              )}
                              {player.userId === game?.hostUserId && (
                                <Badge
                                  variant="secondary"
                                  className="ml-2 text-[10px]"
                                >
                                  Host
                                </Badge>
                              )}
                            </p>
                          </div>
                          <div className="flex items-center">
                            {player.userId ? (
                              player.isConnected ? (
                                <span className="flex items-center gap-1 text-[11px] text-secondary">
                                  <span className="h-2 w-2 rounded-full bg-secondary" />
                                  Ready
                                </span>
                              ) : (
                                <span className="flex items-center gap-1 text-[11px] text-white/55">
                                  <span className="h-2 w-2 rounded-full bg-white/40" />
                                  Away
                                </span>
                              )
                            ) : (
                              <span className="text-[11px] italic text-white/40">
                                Waiting...
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Start Game — chunky 3D button */}
                  <Button
                    size="lg"
                    className="h-14 w-full font-display text-lg font-bold shadow-[0_6px_0_0_oklch(0.5_0.12_55)] hover:shadow-[0_4px_0_0_oklch(0.5_0.12_55)] active:translate-y-0.5"
                    onClick={handleStart}
                    disabled={isLoading || joinedCount < 2 || !gameId}
                  >
                    {isLoading ? (
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    ) : joinedCount < 2 ? (
                      "Waiting for players..."
                    ) : (
                      <>
                        <Play className="mr-2 h-5 w-5" />
                        Start Game
                      </>
                    )}
                  </Button>

                  {joinedCount < 2 && (
                    <p className="text-center text-xs text-white/55">
                      Need at least 2 players to start
                    </p>
                  )}

                  {/* Subtle bot auto-fill hint — shown whenever the room is
                      still waiting for players. The cron in src/convex/bots.ts
                      fills empty slots with AI bots 30s after room creation. */}
                  <div className="flex items-center justify-center gap-1.5 text-[11px] text-white/45">
                    <Cpu className="size-3" />
                    <span>
                      Bots will auto-join after 30s if no players join
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </main>
        </div>
      </div>
    </>
  );
}
