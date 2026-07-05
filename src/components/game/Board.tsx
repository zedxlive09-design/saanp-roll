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
      tiles.push({
        number,
        x: col * TILE_SIZE,
        y: row * TILE_SIZE,
        row,
        col,
      });
    }
  }
  return tiles;
}

const TILES = buildTiles();

// Snake path generator with a nice curved look
function snakePath(
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
): string {
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

// Get center coordinates of a tile by number
function getTileCenter(num: number): { x: number; y: number } {
  const tile = TILES.find((t) => t.number === num);
  if (!tile) return { x: 0, y: 0 };
  return {
    x: tile.x + TILE_SIZE / 2,
    y: tile.y + TILE_SIZE / 2,
  };
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

  // Build a map of player positions for quick lookup
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
        className="w-full h-auto"
        style={{ maxWidth: 500, margin: "0 auto" }}
      >
        <defs>
          {/* Board background pattern */}
          <pattern
            id="boardTexture"
            patternUnits="userSpaceOnUse"
            width="100"
            height="100"
          >
            <rect
              width="100"
              height="100"
              fill={
                boardId === "venom"
                  ? "oklch(0.205 0.02 260)"
                  : "oklch(0.92 0.01 80)"
              }
            />
          </pattern>
        </defs>

        {/* Board background */}
        <rect
          width={svgWidth}
          height={svgHeight}
          fill="url(#boardTexture)"
          rx={8}
        />

        {/* Tiles */}
        {TILES.map((tile) => {
          const tileColor = getTileColor(tile.number, boardId);
          const isHighlighted = highlightedTile === tile.number;
          const hasSnake = config.snakes[tile.number] !== undefined;
          const hasLadder = config.ladders[tile.number] !== undefined;

          return (
            <g key={tile.number}>
              <rect
                x={tile.x + 1}
                y={tile.y + 1}
                width={TILE_SIZE - 2}
                height={TILE_SIZE - 2}
                fill={tileColor.bg}
                rx={3}
                stroke={
                  isHighlighted
                    ? "oklch(0.6 0.18 40)"
                    : hasSnake
                      ? "oklch(0.55 0.2 30)"
                      : hasLadder
                        ? "oklch(0.5 0.15 150)"
                        : "transparent"
                }
                strokeWidth={isHighlighted || hasSnake || hasLadder ? 2 : 0}
              />
              <text
                x={tile.x + 8}
                y={tile.y + 20}
                className={cn(
                  "text-[11px] font-semibold",
                  tileColor.text,
                )}
                style={{
                  fontFamily:
                    "'Trebuchet MS', 'Segoe UI', system-ui, sans-serif",
                }}
              >
                {tile.number}
              </text>

              {/* Snake indicator */}
              {hasSnake && (
                <text
                  x={tile.x + TILE_SIZE - 8}
                  y={tile.y + TILE_SIZE - 6}
                  textAnchor="end"
                  fontSize={16}
                >
                  🐍
                </text>
              )}

              {/* Ladder indicator */}
              {hasLadder && (
                <text
                  x={tile.x + TILE_SIZE - 8}
                  y={tile.y + TILE_SIZE - 6}
                  textAnchor="end"
                  fontSize={16}
                >
                  🪜
                </text>
              )}

              {/* Player tokens on this tile */}
              {playerPositions.has(tile.number) &&
                playerPositions.get(tile.number)!.map((player, idx) => {
                  const offsetX = (idx % 3) * 18 - 18;
                  const offsetY = Math.floor(idx / 3) * 18 - 10;
                  return (
                    <g key={player.id}>
                      <circle
                        cx={tile.x + TILE_SIZE / 2 + offsetX}
                        cy={tile.y + TILE_SIZE / 2 + offsetY + 6}
                        r={9}
                        fill={player.color}
                        stroke="white"
                        strokeWidth={2}
                        className="drop-shadow-sm"
                      />
                      <text
                        x={tile.x + TILE_SIZE / 2 + offsetX}
                        y={tile.y + TILE_SIZE / 2 + offsetY + 11}
                        textAnchor="middle"
                        fill="white"
                        fontSize={10}
                        fontWeight="bold"
                      >
                        {player.name.charAt(0).toUpperCase()}
                      </text>
                    </g>
                  );
                })}
            </g>
          );
        })}

        {/* Snakes — draw them as curved paths */}
        {connections.snakes.map((snake) => {
          const from = getTileCenter(snake.head);
          const to = getTileCenter(snake.tail);
          return (
            <g key={`snake-${snake.head}`}>
              <path
                d={snakePath(from.x, from.y, to.x, to.y)}
                fill="none"
                stroke="oklch(0.55 0.22 30)"
                strokeWidth={4}
                strokeLinecap="round"
                className="opacity-60"
              />
              {/* Snake head indicator */}
              <circle
                cx={from.x}
                cy={from.y}
                r={6}
                fill="oklch(0.5 0.25 25)"
                stroke="white"
                strokeWidth={1.5}
                className="opacity-80"
              />
            </g>
          );
        })}

        {/* Ladders — draw as parallel lines with rungs */}
        {connections.ladders.map((ladder) => {
          const from = getTileCenter(ladder.bottom);
          const to = getTileCenter(ladder.top);
          const angle = Math.atan2(to.y - from.y, to.x - from.x);
          const perpAngle = angle + Math.PI / 2;
          const offset = 6;

          const x1 = from.x + Math.cos(perpAngle) * offset;
          const y1 = from.y + Math.sin(perpAngle) * offset;
          const x2 = from.x - Math.cos(perpAngle) * offset;
          const y2 = from.y - Math.sin(perpAngle) * offset;
          const x1t = to.x + Math.cos(perpAngle) * offset;
          const y1t = to.y + Math.sin(perpAngle) * offset;
          const x2t = to.x - Math.cos(perpAngle) * offset;
          const y2t = to.y - Math.sin(perpAngle) * offset;

          return (
            <g key={`ladder-${ladder.bottom}`}>
              <line
                x1={x1}
                y1={y1}
                x2={x1t}
                y2={y1t}
                stroke="oklch(0.5 0.15 150)"
                strokeWidth={3}
                strokeLinecap="round"
                className="opacity-60"
              />
              <line
                x1={x2}
                y1={y2}
                x2={x2t}
                y2={y2t}
                stroke="oklch(0.5 0.15 150)"
                strokeWidth={3}
                strokeLinecap="round"
                className="opacity-60"
              />
              {/* Rungs */}
              {[0.2, 0.4, 0.6, 0.8].map((t) => {
                const rx1 = x1 + (x1t - x1) * t;
                const ry1 = y1 + (y1t - y1) * t;
                const rx2 = x2 + (x2t - x2) * t;
                const ry2 = y2 + (y2t - y2) * t;
                return (
                  <line
                    key={t}
                    x1={rx1}
                    y1={ry1}
                    x2={rx2}
                    y2={ry2}
                    stroke="oklch(0.5 0.15 150)"
                    strokeWidth={2}
                    className="opacity-50"
                  />
                );
              })}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
