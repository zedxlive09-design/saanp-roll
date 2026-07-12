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

function snakeBodyPath(fromX: number, fromY: number, toX: number, toY: number): string {
  const dx = toX - fromX;
  const dy = toY - fromY;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const px = -dy / len;
  const py = dx / len;
  const wave = Math.min(34, len * 0.18);
  const c1x = fromX + dx * 0.3 + px * wave;
  const c1y = fromY + dy * 0.3 + py * wave;
  const c2x = fromX + dx * 0.7 - px * wave;
  const c2y = fromY + dy * 0.7 - py * wave;
  const sx = fromX + dx * 0.06;
  const sy = fromY + dy * 0.06;
  const ex = toX - dx * 0.04;
  const ey = toY - dy * 0.04;
  return `M ${sx} ${sy} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${ex} ${ey}`;
}

const GEM_GRADIENTS: Record<string, { id: string; light: string; mid: string; dark: string }> = {
  "#dc2626": { id: "gemRed", light: "oklch(0.72 0.22 25)", mid: "oklch(0.55 0.24 22)", dark: "oklch(0.38 0.2 20)" },
  "#2563eb": { id: "gemBlue", light: "oklch(0.68 0.2 250)", mid: "oklch(0.5 0.22 250)", dark: "oklch(0.34 0.18 250)" },
  "#16a34a": { id: "gemGreen", light: "oklch(0.72 0.2 150)", mid: "oklch(0.52 0.19 150)", dark: "oklch(0.36 0.16 150)" },
  "#d97706": { id: "gemAmber", light: "oklch(0.82 0.16 75)", mid: "oklch(0.62 0.17 65)", dark: "oklch(0.46 0.15 55)" },
};

function getGem(color: string) {
  return GEM_GRADIENTS[color] ?? GEM_GRADIENTS["#d97706"];
}

export function Board({ boardId, players, highlightedTile, className }: BoardProps) {
  const config = BOARD_CONFIGS[boardId];

  const connections = useMemo(() => {
    const snakes: Array<{ head: number; tail: number }> = [];
    const ladders: Array<{ bottom: number; top: number }> = [];
    Object.entries(config.snakes).forEach(([head, tail]) => snakes.push({ head: Number(head), tail }));
    Object.entries(config.ladders).forEach(([bottom, top]) => ladders.push({ bottom: Number(bottom), top }));
    return { snakes, ladders };
  }, [config]);

  const svgWidth = TILE_SIZE * BOARD_SIZE;
  const svgHeight = TILE_SIZE * BOARD_SIZE;

  const playerPositions = useMemo(() => {
    const map = new Map<number, PlayerState[]>();
    players.forEach((p) => {
      if (p.position > 0) {
        const existing = map.get(p.position) || [];
        existing.push(p);
        map.set(p.position, existing);
      }
    });
    return map;
  }, [players]);

  return (
    <div className={cn("relative", className)}>
      <svg
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="h-auto w-full"
        style={{ display: "block", filter: "drop-shadow(0 18px 24px oklch(0 0 0 / 0.45))" }}
        shapeRendering="geometricPrecision"
      >
        <defs>
          {/* Board surface — warm parchment with felt feel */}
          <radialGradient id="boardBg" cx="50%" cy="40%" r="80%">
            <stop offset="0%" stopColor={boardId === "venom" ? "oklch(0.3 0.04 200)" : "oklch(0.95 0.02 80)"} />
            <stop offset="100%" stopColor={boardId === "venom" ? "oklch(0.18 0.03 200)" : "oklch(0.86 0.02 75)"} />
          </radialGradient>

          {/* Tile bevels */}
          <linearGradient id="tileLight" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="oklch(1 0 0 / 0.4)" />
            <stop offset="50%" stopColor="oklch(1 0 0 / 0)" />
          </linearGradient>
          <linearGradient id="tileDark" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="oklch(0 0 0 / 0.22)" />
            <stop offset="50%" stopColor="oklch(0 0 0 / 0)" />
          </linearGradient>

          {/* Gold leaf for tile 100 */}
          <linearGradient id="goldLeaf" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="oklch(0.88 0.13 95)" />
            <stop offset="50%" stopColor="oklch(0.8 0.16 75)" />
            <stop offset="100%" stopColor="oklch(0.7 0.15 60)" />
          </linearGradient>

          {/* Gem gradients — light/mid/dark for 3D facets */}
          {Object.values(GEM_GRADIENTS).map((g) => (
            <radialGradient key={g.id} id={g.id} cx="32%" cy="28%" r="75%">
              <stop offset="0%" stopColor={g.light} />
              <stop offset="55%" stopColor={g.mid} />
              <stop offset="100%" stopColor={g.dark} />
            </radialGradient>
          ))}

          {/* Ladder wood — cylindrical gradient (dark-light-dark across width) */}
          <linearGradient id="ladderRail" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="oklch(0.32 0.06 45)" />
            <stop offset="40%" stopColor="oklch(0.55 0.1 55)" />
            <stop offset="60%" stopColor="oklch(0.5 0.09 50)" />
            <stop offset="100%" stopColor="oklch(0.28 0.05 40)" />
          </linearGradient>
          <linearGradient id="ladderRung" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="oklch(0.3 0.06 45)" />
            <stop offset="50%" stopColor="oklch(0.58 0.1 55)" />
            <stop offset="100%" stopColor="oklch(0.26 0.05 40)" />
          </linearGradient>
        </defs>

        {/* Board base */}
        <rect width={svgWidth} height={svgHeight} fill="url(#boardBg)" rx={12} />

        {/* Tiles */}
        {TILES.map((tile) => {
          const tileColor = getTileColor(tile.number, boardId);
          const isHighlighted = highlightedTile === tile.number;
          const isWinTile = tile.number === 100;
          return (
            <g key={tile.number}>
              {/* Contact shadow under tile (subtle depth) */}
              <rect x={tile.x + 3} y={tile.y + 4} width={TILE_SIZE - 4} height={TILE_SIZE - 4} fill="oklch(0 0 0 / 0.08)" rx={5} />
              {/* Base */}
              <rect
                x={tile.x + 2}
                y={tile.y + 2}
                width={TILE_SIZE - 4}
                height={TILE_SIZE - 4}
                fill={isWinTile ? "url(#goldLeaf)" : tileColor.bg}
                rx={5}
                stroke={isHighlighted ? "oklch(0.82 0.16 80)" : isWinTile ? "oklch(0.72 0.15 65)" : "oklch(0 0 0 / 0.1)"}
                strokeWidth={isHighlighted ? 3.5 : isWinTile ? 2 : 1}
              />
              {/* Top bevel highlight */}
              <rect x={tile.x + 2} y={tile.y + 2} width={TILE_SIZE - 4} height={(TILE_SIZE - 4) / 2} fill="url(#tileLight)" rx={5} />
              {/* Bottom bevel shadow */}
              <rect x={tile.x + 2} y={tile.y + (TILE_SIZE - 4) / 2} width={TILE_SIZE - 4} height={(TILE_SIZE - 4) / 2} fill="url(#tileDark)" rx={5} />

              {/* Number */}
              <text
                x={tile.x + 10}
                y={tile.y + 23}
                className="text-[13px] font-bold"
                fill={isWinTile ? "oklch(0.3 0.05 50)" : tileColor.text}
                style={{ fontFamily: "'Fraunces', Georgia, serif" }}
              >
                {tile.number}
              </text>

              {/* Win-tile crown / snake / ladder emoji labels removed:
                  the gold-leaf tile-100 styling, 3D snake paths, and 3D
                  ladder rungs already convey the meaning visually. */}
            </g>
          );
        })}

        {/* === LADDERS — 3D wooden, drawn under snakes === */}
        {connections.ladders.map((ladder) => {
          const from = getTileCenter(ladder.bottom);
          const to = getTileCenter(ladder.top);
          const angle = Math.atan2(to.y - from.y, to.x - from.x);
          const perpAngle = angle + Math.PI / 2;
          const railOffset = 8;
          const railWidth = 7;
          const x1 = from.x + Math.cos(perpAngle) * railOffset;
          const y1 = from.y + Math.sin(perpAngle) * railOffset;
          const x2 = from.x - Math.cos(perpAngle) * railOffset;
          const y2 = from.y - Math.sin(perpAngle) * railOffset;
          const x1t = to.x + Math.cos(perpAngle) * railOffset;
          const y1t = to.y + Math.sin(perpAngle) * railOffset;
          const x2t = to.x - Math.cos(perpAngle) * railOffset;
          const y2t = to.y - Math.sin(perpAngle) * railOffset;
          return (
            <g key={`ladder-${ladder.bottom}`}>
              {/* Shadow beneath ladder */}
              <g transform="translate(2, 4)" opacity={0.3}>
                <line x1={x1} y1={y1} x2={x1t} y2={y1t} stroke="oklch(0 0 0)" strokeWidth={railWidth + 2} strokeLinecap="round" />
                <line x1={x2} y1={y2} x2={x2t} y2={y2t} stroke="oklch(0 0 0)" strokeWidth={railWidth + 2} strokeLinecap="round" />
              </g>
              {/* Rails — cylindrical wood gradient */}
              <line x1={x1} y1={y1} x2={x1t} y2={y1t} stroke="url(#ladderRail)" strokeWidth={railWidth} strokeLinecap="round" />
              <line x1={x2} y1={y2} x2={x2t} y2={y2t} stroke="url(#ladderRail)" strokeWidth={railWidth} strokeLinecap="round" />
              {/* Rungs — small cylinders */}
              {[0.16, 0.36, 0.56, 0.76, 0.92].map((t) => {
                const rx1 = x1 + (x1t - x1) * t;
                const ry1 = y1 + (y1t - y1) * t;
                const rx2 = x2 + (x2t - x2) * t;
                const ry2 = y2 + (y2t - y2) * t;
                return (
                  <line key={t} x1={rx1} y1={ry1} x2={rx2} y2={ry2} stroke="url(#ladderRung)" strokeWidth={5} strokeLinecap="round" />
                );
              })}
            </g>
          );
        })}

        {/* === SNAKES — 3D coiled body with shading === */}
        {connections.snakes.map((snake) => {
          const from = getTileCenter(snake.head);
          const to = getTileCenter(snake.tail);
          const bodyD = snakeBodyPath(from.x, from.y, to.x, to.y);
          const dx = to.x - from.x;
          const dy = to.y - from.y;
          const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
          return (
            <g key={`snake-${snake.head}`}>
              {/* Body shadow (offset down-right) */}
              <path d={bodyD} fill="none" stroke="oklch(0 0 0 / 0.35)" strokeWidth={16} strokeLinecap="round" transform="translate(2, 4)" />
              {/* Body — dark base (underside) */}
              <path d={bodyD} fill="none" stroke="oklch(0.4 0.2 22)" strokeWidth={15} strokeLinecap="round" />
              {/* Body — mid color (main) */}
              <path d={bodyD} fill="none" stroke="oklch(0.58 0.21 30)" strokeWidth={13} strokeLinecap="round" />
              {/* Body — light highlight (top edge, offset up-left) */}
              <path d={bodyD} fill="none" stroke="oklch(0.7 0.19 38)" strokeWidth={5} strokeLinecap="round" transform="translate(-1.5, -2)" opacity={0.8} />
              {/* Scale pattern — dashed dots along body */}
              <path d={bodyD} fill="none" stroke="oklch(0.32 0.18 20 / 0.6)" strokeWidth={10} strokeLinecap="round" strokeDasharray="2 7" />
              {/* Tail tip */}
              <circle cx={to.x} cy={to.y} r={3.5} fill="oklch(0.38 0.2 22)" />

              {/* 3D Head — rotated to face travel direction */}
              <g transform={`translate(${from.x}, ${from.y}) rotate(${angleDeg})`}>
                {/* Head shadow */}
                <ellipse cx={1.5} cy={2.5} rx={15} ry={12} fill="oklch(0 0 0 / 0.4)" />
                {/* Head base — dark */}
                <ellipse cx={0} cy={0} rx={14.5} ry={11.5} fill="oklch(0.42 0.22 24)" />
                {/* Head top — lighter gradient via overlay */}
                <ellipse cx={-1} cy={-1.5} rx={12} ry={9} fill="oklch(0.62 0.2 34)" />
                {/* Head highlight */}
                <ellipse cx={-3} cy={-4} rx={5} ry={3} fill="oklch(0.75 0.18 40 / 0.7)" />
                {/* Eyes — bulging with whites + pupils */}
                <circle cx={3} cy={-4.5} r={2.8} fill="oklch(0.97 0.01 85)" />
                <circle cx={3} cy={4.5} r={2.8} fill="oklch(0.97 0.01 85)" />
                <circle cx={3.5} cy={-4.5} r={1.4} fill="oklch(0.12 0.02 50)" />
                <circle cx={3.5} cy={4.5} r={1.4} fill="oklch(0.12 0.02 50)" />
                {/* Eye shine */}
                <circle cx={4} cy={-5} r={0.5} fill="oklch(1 0 0)" />
                <circle cx={4} cy={4} r={0.5} fill="oklch(1 0 0)" />
                {/* Forked tongue */}
                <path d="M -11 0 L -18 -3 M -11 0 L -18 3 M -11 0 L -14 0" stroke="oklch(0.72 0.22 15)" strokeWidth={1.6} strokeLinecap="round" fill="none" />
              </g>
            </g>
          );
        })}

        {/* === PLAYER PIECES — 3D gemstones === */}
        {players.map((player, idx) => {
          if (player.position <= 0) return null;
          const tile = TILES.find((t) => t.number === player.position);
          if (!tile) return null;
          const offsetIdx = playerPositions.get(player.position)?.indexOf(player) ?? 0;
          const offsetX = (offsetIdx % 3) * 26 - 26;
          const offsetY = Math.floor(offsetIdx / 3) * 26 - 18;
          const cx = tile.x + TILE_SIZE / 2 + offsetX;
          const cy = tile.y + TILE_SIZE / 2 + offsetY + 4;
          const gem = getGem(player.color);
          return (
            <motion.g
              key={player.id}
              initial={{ scale: 0.5, opacity: 0, y: -8 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 280, damping: 18 }}
            >
              {/* Contact shadow on tile */}
              <ellipse cx={cx} cy={cy + 13} rx={17} ry={6} fill="oklch(0 0 0 / 0.45)" />
              {/* Gem — dark base ring */}
              <circle cx={cx} cy={cy} r={17} fill={gem.dark} />
              {/* Gem — main facet */}
              <circle cx={cx} cy={cy} r={16} fill={`url(#${gem.id})`} />
              {/* Gem — bright top facet */}
              <ellipse cx={cx - 4} cy={cy - 5} rx={9} ry={6} fill={gem.light} opacity={0.55} />
              {/* Specular highlight (bright spot) */}
              <ellipse cx={cx - 5} cy={cy - 7} rx={5} ry={3} fill="oklch(1 0 0 / 0.9)" />
              {/* Gem — bottom rim shadow for 3D pop */}
              <path d={`M ${cx - 15} ${cy + 4} A 16 16 0 0 0 ${cx + 15} ${cy + 4}`} fill="none" stroke="oklch(0 0 0 / 0.3)" strokeWidth={2.5} />
              {/* Initial */}
              <text
                x={cx}
                y={cy + 5}
                textAnchor="middle"
                fill="white"
                fontSize={15}
                fontWeight="bold"
                style={{ fontFamily: "'Inter', sans-serif", textShadow: "0 1px 2px oklch(0 0 0 / 0.5)" }}
              >
                {player.name.charAt(0).toUpperCase()}
              </text>
            </motion.g>
          );
        })}
      </svg>
    </div>
  );
}
