import { useMemo } from "react";
import type { BoardMode, PlayerState } from "@/lib/game-engine";
import { BOARD_CONFIGS, getTileColor } from "@/lib/game-engine";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface BoardProps {
  boardId: BoardMode;
  players: PlayerState[];
  highlightedTile?: number | null;
  className?: string;
}

const TILE_SIZE = 100;
const BOARD_SIZE = 10;

interface TileInfo {
  number: number;
  x: number;
  y: number;
  row: number;
  col: number;
}

function buildTiles(): TileInfo[] {
  const tiles: TileInfo[] = [];
  for (let row = 9; row >= 0; row--) {
    for (let col = 0; col < 10; col++) {
      const isEvenRow = row % 2 === 0;
      const displayCol = isEvenRow ? col : 9 - col;
      const number = row * 10 + displayCol + 1;
      tiles.push({ number, x: col * TILE_SIZE, y: row * TILE_SIZE, row, col });
    }
  }
  return tiles;
}

const TILES = buildTiles();

function getTileCenter(num: number): { x: number; y: number } {
  const tile = TILES.find((t) => t.number === num);
  if (!tile) return { x: 0, y: 0 };
  return { x: tile.x + TILE_SIZE / 2, y: tile.y + TILE_SIZE / 2 };
}

// Smooth multi-segment snake body path using catmull-rom-ish control points.
function snakeBodyPath(
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
): string {
  const dx = toX - fromX;
  const dy = toY - fromY;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  // Perpendicular unit
  const px = -dy / len;
  const py = dx / len;
  const wave = Math.min(34, len * 0.18);
  const mx = (fromX + toX) / 2;
  const my = (fromY + toY) / 2;
  const c1x = fromX + dx * 0.3 + px * wave;
  const c1y = fromY + dy * 0.3 + py * wave;
  const c2x = fromX + dx * 0.7 - px * wave;
  const c2y = fromY + dy * 0.7 - py * wave;
  // start near head but offset slightly toward tail so head circle sits on top
  const sx = fromX + dx * 0.06;
  const sy = fromY + dy * 0.06;
  const ex = toX - dx * 0.04;
  const ey = toY - dy * 0.04;
  return `M ${sx} ${sy} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${ex} ${ey}`;
}

export function Board({
  boardId,
  players,
  highlightedTile,
  className,
}: BoardProps) {
  const config = BOARD_CONFIGS[boardId];

  const connections = useMemo(() => {
    const snakes: Array<{ head: number; tail: number }> = [];
    const ladders: Array<{ bottom: number; top: number }> = [];
    Object.entries(config.snakes).forEach(([head, tail]) => {
      snakes.push({ head: Number(head), tail });
    });
    Object.entries(config.ladders).forEach(([bottom, top]) => {
      ladders.push({ bottom: Number(bottom), top });
    });
    return { snakes, ladders };
  }, [config]);

  const svgWidth = TILE_SIZE * BOARD_SIZE;
  const svgHeight = TILE_SIZE * BOARD_SIZE;

  const playerPositions = useMemo(() => {
    const map = new Map<number, PlayerState[]>();
    players.forEach((p) => {
      const pos = p.position;
      if (pos > 0) {
        const existing = map.get(pos) || [];
        existing.push(p);
        map.set(pos, existing);
      }
    });
    return map;
  }, [players]);

  return (
    <div className={cn("relative overflow-hidden rounded-2xl", className)}>
      <svg
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="h-auto w-full"
        style={{ maxWidth: 560, margin: "0 auto" }}
      >
        <defs>
          {/* Warm felt board background */}
          <radialGradient id="boardBg" cx="50%" cy="40%" r="75%">
            <stop offset="0%" stopColor={boardId === "venom" ? "oklch(0.28 0.03 200)" : "oklch(0.93 0.02 80)"} />
            <stop offset="100%" stopColor={boardId === "venom" ? "oklch(0.2 0.03 200)" : "oklch(0.88 0.02 75)"} />
          </radialGradient>

          {/* Snake body gradient — terracotta to deep red */}
          <linearGradient id="snakeBody" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="oklch(0.62 0.19 35)" />
            <stop offset="50%" stopColor="oklch(0.55 0.21 28)" />
            <stop offset="100%" stopColor="oklch(0.45 0.2 22)" />
          </linearGradient>
          <radialGradient id="snakeHead" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor="oklch(0.68 0.2 38)" />
            <stop offset="100%" stopColor="oklch(0.42 0.22 25)" />
          </radialGradient>

          {/* Ladder wood gradient */}
          <linearGradient id="ladderWood" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="oklch(0.55 0.09 55)" />
            <stop offset="50%" stopColor="oklch(0.48 0.1 50)" />
            <stop offset="100%" stopColor="oklch(0.4 0.09 45)" />
          </linearGradient>

          {/* Tile bevel */}
          <linearGradient id="tileBevelLight" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="oklch(1 0 0 / 0.35)" />
            <stop offset="100%" stopColor="oklch(1 0 0 / 0)" />
          </linearGradient>
          <linearGradient id="tileBevelDark" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="oklch(0 0 0 / 0.18)" />
            <stop offset="100%" stopColor="oklch(0 0 0 / 0)" />
          </linearGradient>

          {/* Gold leaf for tile 100 */}
          <linearGradient id="goldLeaf" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="oklch(0.85 0.14 90)" />
            <stop offset="50%" stopColor="oklch(0.78 0.16 75)" />
            <stop offset="100%" stopColor="oklch(0.7 0.15 65)" />
          </linearGradient>

          {/* Gem token gradients per color */}
          <radialGradient id="gemRed" cx="35%" cy="30%" r="70%">
            <stop offset="0%" stopColor="oklch(0.7 0.22 25)" />
            <stop offset="100%" stopColor="oklch(0.42 0.22 20)" />
          </radialGradient>
          <radialGradient id="gemBlue" cx="35%" cy="30%" r="70%">
            <stop offset="0%" stopColor="oklch(0.65 0.2 250)" />
            <stop offset="100%" stopColor="oklch(0.4 0.2 250)" />
          </radialGradient>
          <radialGradient id="gemGreen" cx="35%" cy="30%" r="70%">
            <stop offset="0%" stopColor="oklch(0.7 0.2 150)" />
            <stop offset="100%" stopColor="oklch(0.42 0.18 150)" />
          </radialGradient>
          <radialGradient id="gemAmber" cx="35%" cy="30%" r="70%">
            <stop offset="0%" stopColor="oklch(0.8 0.16 75)" />
            <stop offset="100%" stopColor="oklch(0.55 0.16 65)" />
          </radialGradient>
        </defs>

        {/* Board background */}
        <rect width={svgWidth} height={svgHeight} fill="url(#boardBg)" rx={10} />

        {/* Tiles */}
        {TILES.map((tile) => {
          const tileColor = getTileColor(tile.number, boardId);
          const isHighlighted = highlightedTile === tile.number;
          const hasSnake = config.snakes[tile.number] !== undefined;
          const hasLadder = config.ladders[tile.number] !== undefined;
          const isWinTile = tile.number === 100;

          return (
            <g key={tile.number}>
              {/* Base tile */}
              <rect
                x={tile.x + 2}
                y={tile.y + 2}
                width={TILE_SIZE - 4}
                height={TILE_SIZE - 4}
                fill={isWinTile ? "url(#goldLeaf)" : tileColor.bg}
                rx={4}
                stroke={
                  isHighlighted
                    ? "oklch(0.78 0.16 75)"
                    : isWinTile
                      ? "oklch(0.7 0.15 65)"
                      : "oklch(0 0 0 / 0.08)"
                }
                strokeWidth={isHighlighted ? 3 : isWinTile ? 2 : 1}
              />
              {/* Bevel — light top edge */}
              <rect
                x={tile.x + 2}
                y={tile.y + 2}
                width={TILE_SIZE - 4}
                height={(TILE_SIZE - 4) / 2}
                fill="url(#tileBevelLight)"
                rx={4}
              />
              {/* Bevel — dark bottom edge */}
              <rect
                x={tile.x + 2}
                y={tile.y + (TILE_SIZE - 4) / 2}
                width={TILE_SIZE - 4}
                height={(TILE_SIZE - 4) / 2}
                fill="url(#tileBevelDark)"
                rx={4}
              />

              {/* Tile number */}
              <text
                x={tile.x + 9}
                y={tile.y + 21}
                className={cn(
                  "text-[12px] font-bold",
                  isWinTile ? "text-amber-900" : tileColor.text,
                )}
                style={{ fontFamily: "'Fraunces', Georgia, serif" }}
              >
                {tile.number}
              </text>

              {/* Win tile crown */}
              {isWinTile && (
                <text
                  x={tile.x + TILE_SIZE / 2}
                  y={tile.y + TILE_SIZE - 14}
                  textAnchor="middle"
                  fontSize={26}
                >
                  👑
                </text>
              )}

              {/* Snake/ladder indicator badge */}
              {hasSnake && (
                <text
                  x={tile.x + TILE_SIZE - 9}
                  y={tile.y + TILE_SIZE - 8}
                  textAnchor="end"
                  fontSize={15}
                >
                  🐍
                </text>
              )}
              {hasLadder && (
                <text
                  x={tile.x + TILE_SIZE - 9}
                  y={tile.y + TILE_SIZE - 8}
                  textAnchor="end"
                  fontSize={15}
                >
                  🪜
                </text>
              )}

              {/* Player tokens (gemstones) */}
              {playerPositions.has(tile.number) &&
                playerPositions.get(tile.number)!.map((player, idx) => {
                  const offsetX = (idx % 3) * 20 - 20;
                  const offsetY = Math.floor(idx / 3) * 20 - 12;
                  const cx = tile.x + TILE_SIZE / 2 + offsetX;
                  const cy = tile.y + TILE_SIZE / 2 + offsetY + 6;
                  const gemId =
                    player.color === "#dc2626"
                      ? "gemRed"
                      : player.color === "#2563eb"
                        ? "gemBlue"
                        : player.color === "#16a34a"
                          ? "gemGreen"
                          : "gemAmber";
                  return (
                    <motion.g
                      key={player.id}
                      initial={{ scale: 0.6, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    >
                      {/* Gem body — faceted circle */}
                      <circle
                        cx={cx}
                        cy={cy}
                        r={11}
                        fill={`url(#${gemId})`}
                        stroke="oklch(0.99 0.01 85)"
                        strokeWidth={2}
                      />
                      {/* Shine highlight */}
                      <ellipse
                        cx={cx - 3}
                        cy={cy - 4}
                        rx={4}
                        ry={2.5}
                        fill="oklch(1 0 0 / 0.65)"
                      />
                      {/* Initial */}
                      <text
                        x={cx}
                        y={cy + 4}
                        textAnchor="middle"
                        fill="white"
                        fontSize={11}
                        fontWeight="bold"
                        style={{ fontFamily: "'Inter', sans-serif" }}
                      >
                        {player.name.charAt(0).toUpperCase()}
                      </text>
                    </motion.g>
                  );
                })}
            </g>
          );
        })}

        {/* Ladders — wooden rails + rungs, drawn UNDER snakes */}
        {connections.ladders.map((ladder) => {
          const from = getTileCenter(ladder.bottom);
          const to = getTileCenter(ladder.top);
          const angle = Math.atan2(to.y - from.y, to.x - from.x);
          const perpAngle = angle + Math.PI / 2;
          const offset = 7;
          const x1 = from.x + Math.cos(perpAngle) * offset;
          const y1 = from.y + Math.sin(perpAngle) * offset;
          const x2 = from.x - Math.cos(perpAngle) * offset;
          const y2 = from.y - Math.sin(perpAngle) * offset;
          const x1t = to.x + Math.cos(perpAngle) * offset;
          const y1t = to.y + Math.sin(perpAngle) * offset;
          const x2t = to.x - Math.cos(perpAngle) * offset;
          const y2t = to.y - Math.sin(perpAngle) * offset;
          return (
            <g key={`ladder-${ladder.bottom}`} className="opacity-80">
              <line x1={x1} y1={y1} x2={x1t} y2={y1t} stroke="url(#ladderWood)" strokeWidth={5} strokeLinecap="round" />
              <line x1={x2} y1={y2} x2={x2t} y2={y2t} stroke="url(#ladderWood)" strokeWidth={5} strokeLinecap="round" />
              {[0.18, 0.38, 0.58, 0.78].map((t) => {
                const rx1 = x1 + (x1t - x1) * t;
                const ry1 = y1 + (y1t - y1) * t;
                const rx2 = x2 + (x2t - x2) * t;
                const ry2 = y2 + (y2t - y2) * t;
                return (
                  <line key={t} x1={rx1} y1={ry1} x2={rx2} y2={ry2} stroke="oklch(0.45 0.1 50)" strokeWidth={3.5} strokeLinecap="round" />
                );
              })}
            </g>
          );
        })}

        {/* Snakes — gradient body, head, eyes, forked tongue */}
        {connections.snakes.map((snake) => {
          const from = getTileCenter(snake.head);
          const to = getTileCenter(snake.tail);
          const bodyD = snakeBodyPath(from.x, from.y, to.x, to.y);
          const dx = to.x - from.x;
          const dy = to.y - from.y;
          const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
          return (
            <g key={`snake-${snake.head}`}>
              {/* Body shadow */}
              <path d={bodyD} fill="none" stroke="oklch(0 0 0 / 0.18)" strokeWidth={11} strokeLinecap="round" transform="translate(1.5,2.5)" />
              {/* Body */}
              <path d={bodyD} fill="none" stroke="url(#snakeBody)" strokeWidth={9} strokeLinecap="round" />
              {/* Scale pattern — dashed overlay */}
              <path d={bodyD} fill="none" stroke="oklch(0.35 0.18 22 / 0.5)" strokeWidth={9} strokeLinecap="round" strokeDasharray="2 6" />
              {/* Tail tip */}
              <circle cx={to.x} cy={to.y} r={3} fill="oklch(0.4 0.2 22)" />
              {/* Head */}
              <g transform={`translate(${from.x}, ${from.y}) rotate(${angleDeg})`}>
                <ellipse cx={0} cy={0} rx={11} ry={9} fill="url(#snakeHead)" stroke="oklch(0.35 0.2 22)" strokeWidth={1} />
                {/* Eyes */}
                <circle cx={2} cy={-4} r={2.2} fill="oklch(0.97 0.01 85)" />
                <circle cx={2} cy={4} r={2.2} fill="oklch(0.97 0.01 85)" />
                <circle cx={2.5} cy={-4} r={1.1} fill="oklch(0.15 0.02 50)" />
                <circle cx={2.5} cy={4} r={1.1} fill="oklch(0.15 0.02 50)" />
                {/* Forked tongue */}
                <path d={`M -9 0 L -16 -2.5 M -9 0 L -16 2.5 M -9 0 L -13 0`} stroke="oklch(0.7 0.22 15)" strokeWidth={1.4} strokeLinecap="round" fill="none" />
              </g>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
