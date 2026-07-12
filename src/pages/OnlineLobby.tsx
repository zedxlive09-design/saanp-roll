import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useGameRoom } from "@/hooks/use-game-room";
import { useAuth } from "@/hooks/use-auth";
import { BOARD_CONFIGS } from "@/lib/game-engine";
import type { BoardMode } from "@/lib/game-engine";
import { toast } from "sonner";
import {
  ArrowLeft,
  Copy,
  Check,
  Users,
  Play,
  LogIn,
  Loader2,
  Link as LinkIcon,
  Skull,
  RefreshCw,
  Wifi,
} from "lucide-react";
import { LandscapePrompt } from "@/components/game/LandscapePrompt";

/**
 * Online lobby — full-bleed felt-green table, big translucent room-code panel,
 * translucent create/join cards, available games list as translucent cards.
 * Preserves ALL logic: useGameRoom, handleCreate/handleJoin/handleStart,
 * lobbyMode state, LandscapePrompt, mode toggle.
 */
type LobbyPhase = "menu" | "creating" | "joining" | "waiting" | "starting";

export default function OnlineLobby() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const activeGames = useQuery(api.games.getUserActiveGames);
  const activeGamesLoading = activeGames === undefined;

  const [phase, setPhase] = useState<LobbyPhase>("menu");
  const [roomCode, setRoomCode] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [createCode, setCreateCode] = useState("");
  const [playerCount, setPlayerCount] = useState(2);
  const [boardMode, setBoardMode] = useState<BoardMode>("classic");
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [gameId, setGameId] = useState<string | null>(null);
  const [joinName, setJoinName] = useState("");
  const [lobbyMode, setLobbyMode] = useState<"friends" | "quickmatch">(
    "friends",
  );

  const { game, createGame, joinGame, startGame } = useGameRoom(
    phase === "waiting" || phase === "starting" ? createCode || joinCode : null,
  );

  // Navigate to game when it starts
  useEffect(() => {
    if (game?.status === "playing" && (createCode || joinCode)) {
      navigate(`/game/online/${createCode || joinCode}`, { replace: true });
    }
  }, [game?.status, createCode, joinCode, navigate]);

  const handleCreate = async () => {
    setIsLoading(true);
    try {
      const result = await createGame({ boardId: boardMode, playerCount });
      const code = result.roomCode;
      setCreateCode(code);
      setGameId(result.gameId);
      setPhase("waiting");
      toast.success("Room created! Share the code with friends.");
    } catch (err) {
      toast.error("Failed to create room");
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

  const copyRoomCode = () => {
    navigator.clipboard.writeText(createCode || joinCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isHost =
    game?.hostUserId ===
    (isAuthenticated
      ? (game?.players[0]?.userId ?? "")
      : (game?.players[0]?.userId ?? ""));

  const joinedCount = game?.players.filter((p) => p.userId).length ?? 0;

  return (
    <>
      <LandscapePrompt />
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
            className="absolute left-4 top-4 z-30 flex size-11 items-center justify-center rounded-2xl border border-white/15 bg-black/30 text-white/80 backdrop-blur-md transition-colors hover:bg-black/50 hover:text-white safe-top"
          >
            <ArrowLeft className="size-5" />
          </button>

          {/* Page title */}
          <div className="mx-auto max-w-2xl px-4 pt-6 pb-2 safe-top">
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

          <main className="mx-auto max-w-2xl space-y-4 px-4 pb-10 pt-4 safe-bottom">
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

                        <Button
                          className="h-12 w-full font-semibold shadow-[0_6px_0_0_oklch(0.5_0.12_55)] hover:shadow-[0_4px_0_0_oklch(0.5_0.12_55)] active:translate-y-0.5"
                          onClick={handleCreate}
                          disabled={isLoading}
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
                    <div className="space-y-4 rounded-2xl border border-white/15 bg-black/30 p-5 text-center backdrop-blur-md">
                      <h2 className="flex items-center justify-center gap-2 font-display text-base font-bold text-white/95">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary/20 ring-1 ring-secondary/30">
                          <Wifi className="h-4 w-4 text-secondary" />
                        </span>
                        Quick Match
                      </h2>
                      <p className="text-sm text-white/55">
                        Matchmaking with strangers coming soon. For now, create
                        a private room and share the code.
                      </p>
                      <Button className="w-full" disabled>
                        <Loader2 className="mr-2 h-4 w-4" />
                        Find Match
                      </Button>
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
                      <span className="font-mono text-4xl font-bold tracking-[0.25em] text-primary">
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
                </motion.div>
              )}
            </AnimatePresence>
          </main>
        </div>
      </div>
    </>
  );
}
