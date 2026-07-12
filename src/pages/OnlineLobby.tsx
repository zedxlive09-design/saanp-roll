import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { LogoDropdown } from "@/components/LogoDropdown";
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
  const [lobbyMode, setLobbyMode] = useState<"friends" | "quickmatch">("friends");

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
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-gradient-to-b from-background to-secondary/20"
    >
      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/home")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <LogoDropdown />
            <h1 className="font-display text-lg font-bold tracking-tight">
              {phase === "waiting" ? "Game Lobby" : "Play Online"}
            </h1>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-6 space-y-6">
        <AnimatePresence mode="wait">
          {phase === "menu" && (
            <motion.div
              key="menu"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              className="space-y-4"
            >
              <p className="text-sm text-muted-foreground">
                Create a room and share the code, or join an existing game.
              </p>

              {/* Reconnect card — games in progress or waiting */}
              {!activeGamesLoading &&
                activeGames &&
                activeGames.length > 0 && (
                  <Card className="border-2 border-secondary/30 bg-gradient-to-r from-secondary/10 to-secondary/5 shadow-paper">
                    <CardContent className="p-4 space-y-3">
                      <p className="text-xs font-semibold text-secondary uppercase tracking-wider flex items-center gap-1.5">
                        <RefreshCw className="h-3.5 w-3.5" />
                        Active Games
                      </p>
                      <div className="space-y-2">
                        {activeGames.map((g) => {
                          const isPlaying = g.status === "playing";
                          const roomCode = g.roomCode;
                          const boardName =
                            g.boardId === "venom"
                              ? "Venom Mode"
                              : "Classic";
                          const playerCount = g.players.filter(
                            (p) => p.userId,
                          ).length;

                          return (
                            <div
                              key={g._id}
                              className="flex items-center justify-between rounded-lg border bg-card px-3 py-2.5"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <Wifi
                                  className={`h-4 w-4 shrink-0 ${
                                    isPlaying
                                      ? "text-secondary"
                                      : "text-primary"
                                  }`}
                                />
                                <div className="min-w-0">
                                  <p className="text-sm font-medium truncate">
                                    {boardName}
                                    <Badge
                                      variant="outline"
                                      className="ml-2 text-[10px] font-mono"
                                    >
                                      {roomCode}
                                    </Badge>
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {isPlaying
                                      ? "In progress"
                                      : "Waiting in lobby"}
                                    · {playerCount} player
                                    {playerCount !== 1 ? "s" : ""}
                                  </p>
                                </div>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                className="shrink-0 ml-2"
                                onClick={() =>
                                  navigate(
                                    isPlaying
                                      ? `/game/online/${roomCode}`
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
                    </CardContent>
                  </Card>
                )}

              {/* Mode toggle */}
              <div className="flex rounded-xl border border-border bg-card p-1 shadow-paper">
                <button
                  type="button"
                  onClick={() => setLobbyMode("friends")}
                  className={`flex-1 rounded-lg px-4 py-2 text-sm font-display font-semibold transition-all ${
                    lobbyMode === "friends"
                      ? "bg-primary text-primary-foreground shadow-paper"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Play with Friends
                </button>
                <button
                  type="button"
                  onClick={() => setLobbyMode("quickmatch")}
                  className={`flex-1 rounded-lg px-4 py-2 text-sm font-display font-semibold transition-all ${
                    lobbyMode === "quickmatch"
                      ? "bg-primary text-primary-foreground shadow-paper"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Quick Match
                </button>
              </div>

              {lobbyMode === "friends" && (
                <>
              {/* Create Room */}
              <Card className="border shadow-paper">
                <CardContent className="p-5 space-y-4">
                  <h2 className="font-display font-semibold text-sm flex items-center gap-2">
                    <Play className="h-4 w-4 text-primary" />
                    Create a Room
                  </h2>

                  {/* Board Mode */}
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground font-medium">
                      Board Mode
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {(["classic", "venom"] as BoardMode[]).map((mode) => {
                        const config = BOARD_CONFIGS[mode];
                        const isSelected = boardMode === mode;
                        return (
                          <button
                            key={mode}
                            type="button"
                            onClick={() => setBoardMode(mode)}
                            className={`flex flex-col items-center gap-1 rounded-xl border-2 p-3 transition-all hover:-translate-y-0.5 cursor-pointer ${
                              isSelected
                                ? mode === "venom"
                                  ? "border-destructive bg-destructive/10"
                                  : "border-primary bg-primary/10"
                                : "border-border hover:border-muted-foreground/30"
                            }`}
                          >
                            {mode === "venom" ? (
                              <Skull className="h-4 w-4 text-destructive" />
                            ) : (
                              <Play className="h-4 w-4 text-primary" />
                            )}
                            <span className="font-semibold text-xs">
                              {config.name}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Player Count */}
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground font-medium">
                      Players
                    </p>
                    <div className="flex items-center gap-2">
                      {[2, 3, 4].map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setPlayerCount(n)}
                          className={`flex-1 rounded-lg border-2 py-2 text-sm font-medium transition-all hover:-translate-y-0.5 cursor-pointer ${
                            playerCount === n
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border hover:border-muted-foreground/30"
                          }`}
                        >
                          {n} Players
                        </button>
                      ))}
                    </div>
                  </div>

                  <Button
                    className="w-full shadow-paper-lg"
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
                </CardContent>
              </Card>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    Or
                  </span>
                </div>
              </div>

              {/* Join Room */}
              <Card className="border shadow-paper">
                <CardContent className="p-5 space-y-4">
                  <h2 className="font-display font-semibold text-sm flex items-center gap-2">
                    <LogIn className="h-4 w-4 text-secondary" />
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
                      className="text-center text-lg font-mono tracking-[0.3em] uppercase"
                    />
                    <Input
                      placeholder="Your display name (optional)"
                      value={joinName}
                      onChange={(e) => setJoinName(e.target.value)}
                      maxLength={20}
                    />
                  </div>
                  <Button
                    className="w-full"
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
                </CardContent>
              </Card>
                </>
              )}

              {lobbyMode === "quickmatch" && (
                <Card className="border shadow-paper">
                  <CardContent className="p-5 space-y-4 text-center">
                    <h2 className="font-display font-semibold text-sm flex items-center justify-center gap-2">
                      <Wifi className="h-4 w-4 text-secondary" />
                      Quick Match
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Matchmaking with strangers coming soon. For now, create a
                      private room and share the code.
                    </p>
                    <Button className="w-full" disabled>
                      <Loader2 className="mr-2 h-4 w-4" />
                      Find Match
                    </Button>
                  </CardContent>
                </Card>
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
              {/* Room Code */}
              <Card className="border shadow-paper text-center">
                <CardContent className="p-6 space-y-3">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                    Room Code
                  </p>
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-3xl font-mono font-bold tracking-[0.25em] text-primary">
                      {createCode || joinCode}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={copyRoomCode}
                      className="h-9 w-9"
                    >
                      {copied ? (
                        <Check className="h-4 w-4 text-secondary" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Share this code with friends to join the game
                  </p>
                </CardContent>
              </Card>

              {/* Players List */}
              <Card className="border shadow-paper">
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium text-sm">Players</span>
                    </div>
                    <Badge variant="secondary">
                      {joinedCount}/{game?.players.length ?? 2}
                    </Badge>
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    {(game?.players ?? []).map((player, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-3 rounded-lg border px-3 py-2.5"
                      >
                        <div
                          className="h-7 w-7 rounded-full shrink-0 flex items-center justify-center text-white text-xs font-bold"
                          style={{ backgroundColor: player.color }}
                        >
                          {player.name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
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
                              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                <span className="h-2 w-2 rounded-full bg-muted-foreground" />
                                Away
                              </span>
                            )
                          ) : (
                            <span className="text-[11px] text-muted-foreground italic">
                              Waiting...
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Start Button */}
              <Button
                size="lg"
                className="w-full h-14 text-lg font-semibold shadow-paper-lg"
                onClick={handleStart}
                disabled={
                  isLoading || joinedCount < 2 || !gameId
                }
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
                <p className="text-center text-xs text-muted-foreground">
                  Need at least 2 players to start
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </motion.div>
    </>
  );
}
