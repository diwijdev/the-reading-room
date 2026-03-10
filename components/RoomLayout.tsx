"use client";

import React, {
  useMemo, useState, useCallback, useEffect, useRef,
  type CSSProperties, type ReactNode,
} from "react";
import { motion, useReducedMotion } from "framer-motion";

/* --- Public types --- */

export type RoomTheme = "warm" | "dark";

export interface RoomLayoutProps {
  showTopBar?: boolean;
  theme?: RoomTheme;
  onThemeChange?: (theme: RoomTheme) => void;
  header?: ReactNode;
  children?: ReactNode;
  showThemeToggle?: boolean;
  title?: string;
  className?: string;
}

/* --- Theme tokens --- */

const WARM = {
  wallTop: "#F7F2E8", wallMid: "#EFE7DA", wallLow: "#E7DDCF",
  floor: "#7A4E28", floorD: "#5A3618",
  base: "#A06A3A", baseL: "#D28B4E",
  wood: "#A25D23", woodL: "#D18A3A", woodD: "#6B3A12",
  wglow: "rgba(255,200,80,.26)", spot: "rgba(255,210,120,.28)",
  vignette: "radial-gradient(ellipse at 50% 38%, transparent 18%, rgba(60,30,5,.34) 100%)",
  cat: "#8A6040", leaf: "#4A8840", pot: "#B05A30",
  rug1: "#C04040", rug2: "#D89030",
  gridAccent: "rgba(255,190,100,.06)",
} as const;

const MIDNIGHT = {
  wallTop: "#221E1A", wallMid: "#1A1714", wallLow: "#0F0D0B",
  floor: "#0D0A08", floorD: "#070504",
  base: "#2A1E15", baseL: "#3A2A1E",
  wood: "#3A2A1E", woodL: "#4A3728", woodD: "#2A1E15",
  wglow: "rgba(255,207,107,.18)", spot: "rgba(255,224,138,.16)",
  vignette: "radial-gradient(ellipse at 50% 38%, transparent 10%, rgba(15,13,11,.82) 100%)",
  cat: "#2C2620", leaf: "#3D5040", pot: "#3A2010",
  rug1: "#2A1B12", rug2: "#3A2416",
  gridAccent: "rgba(255,207,107,.055)",
} as const;

type Tokens = {
  wallTop: string;
  wallMid: string;
  wallLow: string;
  floor: string;
  floorD: string;
  base: string;
  baseL: string;
  wood: string;
  woodL: string;
  woodD: string;
  wglow: string;
  spot: string;
  vignette: string;
  cat: string;
  leaf: string;
  pot: string;
  rug1: string;
  rug2: string;
  gridAccent: string;
};

/* --- Shared types --- */

type PaintingKey = "landscape" | "botanical";
type PaintingPlacement = Record<PaintingKey, { x: number; y: number }>;
type ViewportSize = { width: number; height: number };

const PAINTING_SIZES: Record<PaintingKey, { width: number; height: number }> = {
  landscape: { width: 112, height: 140 },
  botanical: { width: 72, height: 90 },
};

const DEFAULT_VIEWPORT: ViewportSize = { width: 1280, height: 800 };
const FLOOR_MIN_PCT = 8;
const FLOOR_VH = 5;
const FLOOR_MAX_PCT = 14;

function clampNum(n: number, min: number, max: number) {
  return Math.max(min, Math.min(n, max));
}

function floorPxFromHeight(h: number) {
  // Keep floor placement responsive but bounded so decor does not drift too high/low.
  return clampNum((h * FLOOR_VH) / 100, (h * FLOOR_MIN_PCT) / 100, (h * FLOOR_MAX_PCT) / 100);
}

/* --- Dust particles (SSR-safe fixed sequence) --- */

type DustParticle = { left: string; top: string; dur: number; del: number; tx: number; ty: number };

const DUST: DustParticle[] = [
  [0.62,0.44],[0.21,0.61],[0.85,0.30],[0.14,0.72],[0.49,0.52],[0.73,0.28],
  [0.38,0.65],[0.91,0.47],[0.27,0.38],[0.55,0.70],[0.68,0.55],[0.11,0.33],
  [0.42,0.48],[0.79,0.62],[0.33,0.26],[0.96,0.41],[0.18,0.58],[0.61,0.35],
  [0.84,0.68],[0.47,0.22],[0.25,0.75],[0.70,0.44],[0.53,0.60],[0.08,0.50],
].map(([a, b], i) => ({
  left: `${10 + a * 80}%`,
  top: `${18 + b * 58}%`,
  dur: 9 + (((i * 7 + 3) % 14) / 14) * 12,
  del: (((i * 11 + 5) % 12) / 12) * 10,
  tx: (((i * 13 + 1) % 100) / 100) * 90 - 45,
  ty: -(50 + (((i * 9 + 2) % 70) / 70) * 120),
}));

/* --- Custom hook: draggable paintings --- */

function useDraggablePaintings(header: ReactNode, viewport: ViewportSize, floorInsetPx: number) {
  const [paintings, setPaintings] = useState<PaintingPlacement>({
    landscape: { x: 76, y: 72 },
    botanical: { x: 212, y: 72 },
  });
  const dragStartRef = useRef<PaintingPlacement>(paintings);

  const getBounds = useCallback(
    (key: PaintingKey) => {
      const size = PAINTING_SIZES[key];
      const safeTop = header ? 64 : 20;
      const safeSide = 20;
      // Paintings should stay above floor line and inside horizontal safe margins.
      const maxX = Math.max(safeSide, viewport.width - size.width - safeSide);
      const maxY = Math.max(safeTop, viewport.height - floorInsetPx - size.height - 28);
      return { minX: safeSide, maxX, minY: safeTop, maxY };
    },
    [floorInsetPx, header, viewport],
  );

  const clampAll = useCallback(
    (prev: PaintingPlacement): PaintingPlacement => {
      const clampOne = (key: PaintingKey) => {
        const { minX, maxX, minY, maxY } = getBounds(key);
        return { x: clampNum(prev[key].x, minX, maxX), y: clampNum(prev[key].y, minY, maxY) };
      };
      return { landscape: clampOne("landscape"), botanical: clampOne("botanical") };
    },
    [getBounds],
  );

  const onDragStart = useCallback(() => {
    // Snapshot starting positions so drag math is based on initial click point.
    dragStartRef.current = paintings;
    setPaintings((prev) => clampAll(prev));
  }, [clampAll, paintings]);

  const onDragMove = useCallback((key: PaintingKey, dx: number, dy: number) => {
    setPaintings((prev) => {
      const start = dragStartRef.current[key] ?? prev[key];
      const { minX, maxX, minY, maxY } = getBounds(key);
      return { ...prev, [key]: { x: clampNum(start.x + dx, minX, maxX), y: clampNum(start.y + dy, minY, maxY) } };
    });
  }, [getBounds]);

  useEffect(() => {
    // Re-clamp when viewport/floor changes (resize/theme/header changes).
    const id = window.requestAnimationFrame(() => {
      setPaintings((prev) => clampAll(prev));
    });
    return () => window.cancelAnimationFrame(id);
  }, [clampAll]);

  return { paintings, onDragStart, onDragMove };
}

/* --- Decor SVGs --- */

function WallArtLandscape() {
  return (
    <svg viewBox="0 0 92 112" className="block h-full w-full">
      <defs>
        <linearGradient id="rl-sk" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f0d060" />
          <stop offset="55%" stopColor="#e08040" />
          <stop offset="100%" stopColor="#a04020" />
        </linearGradient>
        <linearGradient id="rl-wa" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#304860" />
          <stop offset="100%" stopColor="#1a2840" />
        </linearGradient>
      </defs>
      <rect width="92" height="112" fill="url(#rl-sk)" />
      <circle cx="62" cy="26" r="13" fill="#fff8a0" opacity=".92" />
      <circle cx="62" cy="26" r="10" fill="#ffe840" />
      <rect x="0" y="72" width="92" height="40" fill="url(#rl-wa)" opacity=".7" />
      <ellipse cx="20" cy="75" rx="32" ry="18" fill="#486040" opacity=".85" />
      <ellipse cx="70" cy="78" rx="30" ry="16" fill="#385030" opacity=".8" />
      <rect x="4" y="4" width="84" height="104" fill="none" stroke="rgba(255,255,255,.1)" strokeWidth="1" />
    </svg>
  );
}

function WallArtBotanical() {
  return (
    <svg viewBox="0 0 56 74" className="block h-full w-full">
      <defs>
        <radialGradient id="rl-bg2" cx="50%" cy="50%" r="70%">
          <stop offset="0%" stopColor="#e8e0d0" />
          <stop offset="100%" stopColor="#c8b898" />
        </radialGradient>
      </defs>
      <rect width="56" height="74" fill="url(#rl-bg2)" />
      <line x1="28" y1="68" x2="28" y2="20" stroke="#6a5030" strokeWidth="1.5" strokeLinecap="round" />
      <ellipse cx="28" cy="18" rx="9" ry="13" fill="#5a7840" opacity=".85" />
      <rect x="3" y="3" width="50" height="68" fill="none" stroke="rgba(0,0,0,.07)" strokeWidth="1" />
    </svg>
  );
}

function PlantLarge({ leaf, pot, base }: { leaf: string; pot: string; base: string }) {
  return (
    <svg viewBox="0 0 80 115" className="block" style={{ width: 80, height: 115, filter: "drop-shadow(3px 4px 8px rgba(0,0,0,.34))" }}>
      <polygon points="18,80 62,80 68,112 12,112" fill={pot} />
      <rect x="12" y="76" width="56" height="7" rx="2" fill={base} />
      <path d="M40 76 Q28 58 14 40" stroke={leaf} strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="M40 76 Q52 58 64 46" stroke={leaf} strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="M40 76 Q40 54 40 28" stroke={leaf} strokeWidth="2" fill="none" strokeLinecap="round" />
      <ellipse cx="13" cy="37" rx="14" ry="8" fill={leaf} transform="rotate(-38 13 37)" opacity=".92" />
      <ellipse cx="65" cy="43" rx="13" ry="8" fill={leaf} transform="rotate(33 65 43)" opacity=".88" />
      <ellipse cx="40" cy="24" rx="12" ry="16" fill={leaf} opacity=".92" />
    </svg>
  );
}

function PlantSmall({ leaf, pot, base }: { leaf: string; pot: string; base: string }) {
  return (
    <svg viewBox="0 0 45 58" className="block" style={{ width: 45, height: 58, filter: "drop-shadow(2px 3px 5px rgba(0,0,0,.26))" }}>
      <polygon points="10,42 35,42 39,56 6,56" fill={pot} />
      <rect x="6" y="39" width="33" height="5" rx="2" fill={base} />
      <path d="M22 40 Q16 30 8 20" stroke={leaf} strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M22 40 Q28 30 36 24" stroke={leaf} strokeWidth="2" fill="none" strokeLinecap="round" />
      <ellipse cx="7" cy="17" rx="8" ry="5" fill={leaf} transform="rotate(-38 7 17)" opacity=".9" />
      <ellipse cx="37" cy="21" rx="8" ry="5" fill={leaf} transform="rotate(32 37 21)" opacity=".85" />
    </svg>
  );
}

function CatSvg({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 75 65" className="block" style={{ width: 75, height: 65, filter: "drop-shadow(2px 4px 10px rgba(0,0,0,.42))" }}>
      <ellipse cx="44" cy="46" rx="24" ry="14" fill={color} />
      <circle cx="26" cy="30" r="16" fill={color} />
      <polygon points="14,18 10,7 21,15" fill={color} />
      <polygon points="38,18 42,7 31,15" fill={color} />
      <path d="M19,30 Q22,28 25,30" stroke="rgba(0,0,0,.45)" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      <path d="M28,30 Q31,28 34,30" stroke="rgba(0,0,0,.45)" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      <path d="M66 52 Q76 42 72 33 Q68 24 62 30" stroke={color} strokeWidth="6" fill="none" strokeLinecap="round" />
    </svg>
  );
}

/* --- Scene sub-components --- */

/*
  SceneWindow — one anchor div at top-[62px] right-[8.6%].
  The light cast, mullion shadows, and rays all use top:"100%"
  so they always fan downward from the window's own bottom edge.
  Move the anchor, everything moves with it.
*/
function SceneWindow({ isWarm, t, prefersReduced }: { isWarm: boolean; t: Tokens; prefersReduced: boolean | null }) {
  const skyBg = isWarm
    ? "linear-gradient(170deg, #ffd060 0%, #ffb040 35%, #ff8030 65%, #c04c20 100%)"
    : "linear-gradient(170deg, #1A1714 0%, #0F0D0B 55%, #070504 100%)";

  const orbStyle: CSSProperties = isWarm
    ? { background: "radial-gradient(circle, #fffce0 0%, #ffd840 45%, #ff8010 100%)", boxShadow: "0 0 22px rgba(255,216,64,.55), 0 0 55px rgba(255,170,0,.22)", width: 38, height: 38, top: 18, right: 18 }
    : { background: "radial-gradient(circle, #FFF3CC 0%, #D6C7A8 60%, rgba(212,168,75,0.0) 100%)", boxShadow: "0 0 16px rgba(255,224,138,.22), 0 0 44px rgba(255,207,107,.10)", width: 32, height: 32, top: 22, right: 22 };

  return (
    <div className="absolute top-[62px] right-[8.6%] z-[6]" style={{ width: 150, height: 190 }}>

      {/* Light cast — fans downward from the bottom of this anchor */}
      {!isWarm && (
        <div
          className="pointer-events-none absolute"
          style={{
            top: "100%", left: "50%", transform: "translateX(-50%)",
            width: 305, height: "500%", zIndex: -2,
            background: `radial-gradient(ellipse at 50% 0%, ${t.wglow} 0%, transparent 68%)`,
            clipPath: "polygon(25% 0%, 75% 0%, 100% 100%, 0% 100%)",
            opacity: isWarm ? 0.75 : 0.45,
            filter: "blur(18px)",
          }}
        />
      )}

      {/* Mullion shadows — dark only, cross-bars aligned to frame mullions */}
      {!isWarm && (
        <div
          className="pointer-events-none absolute"
          style={{
            top: "100%", left: "50%", transform: "translateX(-50%)",
            width: 365, height: "300%", zIndex: -1,
            clipPath: "polygon(25% 0%, 75% 0%, 100% 100%, 0% 100%)",
            opacity: 0.12,
          }}
        >
          <div className="absolute inset-y-0 left-1/2 w-[14px] -translate-x-1/2"
            style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.15) 100%)" }}
          />
          <div className="absolute inset-x-0 top-[28%] h-[10px]"
            style={{ background: "linear-gradient(90deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.7) 50%, rgba(0,0,0,0.15) 100%)" }}
          />
        </div>
      )}

      {/* Window frame — sits on top of the cast/shadows */}
      <div
        className="relative h-full w-full overflow-hidden rounded-[3px] shadow-[5px_7px_22px_rgba(0,0,0,.38),inset_0_0_8px_rgba(0,0,0,.15)]"
        style={{ border: `11px solid ${t.wood}` }}
      >
        <div className="h-full w-full" style={{ background: skyBg }} />
        <div className="absolute inset-y-0 left-1/2 z-[3] w-[8px] -translate-x-1/2" style={{ background: t.wood }} />
        <div className="absolute inset-x-0 top-[48%] z-[3] h-[8px] -translate-y-1/2" style={{ background: t.wood }} />
        <div className="absolute z-[4] rounded-full" style={orbStyle} />

        {!isWarm && (
          <div className="absolute inset-0 z-[1]">
            {[
              { w: 2, h: 2, top: "15%", left: "20%", delay: 0 },
              { w: 2, h: 2, top: "28%", left: "62%", delay: 0.6 },
              { w: 1, h: 1, top: "55%", left: "30%", delay: 1.1 },
              { w: 2, h: 2, top: "20%", left: "76%", delay: 0.3 },
              { w: 1, h: 1, top: "68%", left: "70%", delay: 0.9 },
              { w: 2, h: 2, top: "42%", left: "48%", delay: 1.7 },
              { w: 1, h: 1, top: "72%", left: "18%", delay: 0.4 },
            ].map((s, i) => (
              <motion.i
                key={i}
                className="absolute rounded-full"
                style={{ width: s.w, height: s.h, top: s.top, left: s.left, background: "#eee6d6" }}
                animate={prefersReduced ? undefined : { opacity: [0.35, 0.9, 0.5] }}
                transition={prefersReduced ? undefined : { duration: 2.8, repeat: Infinity, repeatType: "mirror", ease: "easeInOut", delay: s.delay }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/*
  SceneShelf — one anchor div docked to the floor at left-[5.5%].
  Plank, brackets, candle (wax + glow + flame), and vase are all
  positioned relative to this parent. Move the anchor, everything moves.
*/
function SceneShelf({
  isWarm, t, prefersReduced, floorInsetFromBottom,
}: {
  isWarm: boolean; t: Tokens; prefersReduced: boolean | null; floorInsetFromBottom: string;
}) {
  return (
    <div
      className="absolute right-[15.5%] z-[5]"
      style={{ bottom: `calc(${floorInsetFromBottom} + 280px)` }}
    >
      {/* Plank */}
      <div
        className="relative rounded-[3px] shadow-[0_4px_12px_rgba(0,0,0,.38),inset_0_1px_0_rgba(255,255,255,.06)]"
        style={{
          width: 110, height: 14,
          background: `linear-gradient(180deg, ${t.woodL} 0%, ${t.wood} 55%, ${t.woodD} 100%)`,
          backgroundImage: `repeating-linear-gradient(90deg, transparent, transparent 18px, ${t.gridAccent} 18px, ${t.gridAccent} 19px)`,
          backgroundBlendMode: "overlay",
        }}
      />

      {/* Left bracket */}
      <div className="absolute rounded-b-[2px] shadow-[2px_3px_6px_rgba(0,0,0,.3)]"
        style={{ left: -1, top: 0, width: 8, height: 36, background: t.woodD }}
      />

      {/* Right bracket */}
      <div className="absolute rounded-b-[2px] shadow-[2px_3px_6px_rgba(0,0,0,.3)]"
        style={{ left: 103, top: 0, width: 8, height: 36, background: t.woodD }}
      />

      {/* Candle: wax column */}
      <div
        className="absolute rounded-[2px] shadow-[1px_2px_5px_rgba(0,0,0,.3)]"
        style={{ left: 18, bottom: 14, width: 10, height: 38, background: "linear-gradient(180deg, #f0e8d0 0%, #d8c8a8 100%)" }}
      />

      {/* Candle: glow halo */}
      <motion.div
        className="absolute rounded-full pointer-events-none"
        style={{
          left: 4, bottom: 47,
          width: 38, height: 38,
          background: "radial-gradient(circle, rgba(255,180,60,.40) 0%, transparent 70%)",
          opacity: isWarm ? 0.95 : 0.8,
        }}
        animate={prefersReduced ? undefined : { opacity: [0.7, 1], scale: [1, 1.15] }}
        transition={prefersReduced ? undefined : { duration: 1.8, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" }}
      />

      {/* Candle: flame */}
      <motion.div
        className="absolute pointer-events-none"
        style={{
          left: 19, bottom: 59,
          width: 8, height: 14,
          background: "radial-gradient(ellipse at 50% 100%, #ff9000 0%, #ffcc00 40%, rgba(255,220,100,.6) 70%, transparent 100%)",
          borderRadius: "50% 50% 35% 35%",
          filter: "blur(.25px)",
          opacity: isWarm ? 0.95 : 0.85,
          transformOrigin: "bottom center",
        }}
        animate={prefersReduced ? undefined : { rotate: [0, -3, 2, -1], scaleX: [1, 0.85, 1.1, 0.9], scaleY: [1, 1.1, 0.92, 1.05] }}
        transition={prefersReduced ? undefined : { duration: 1.8, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" }}
      />

      {/* Vase */}
      <div
        className="absolute rounded-[6px] shadow-[2px_3px_8px_rgba(0,0,0,.35),inset_1px_0_2px_rgba(255,255,255,.08)]"
        style={{
          left: 60, bottom: 14,
          width: 22, height: 36,
          background: isWarm
            ? "linear-gradient(180deg, rgba(150,160,190,.75) 0%, rgba(110,120,170,.75) 60%, rgba(70,80,140,.75) 100%)"
            : "linear-gradient(180deg, rgba(120,95,75,.5) 0%, rgba(80,65,55,.5) 100%)",
        }}
      />
    </div>
  );
}

function SceneLamp({
  isWarm, t, prefersReduced, floorInsetFromBottom,
}: {
  isWarm: boolean; t: Tokens; prefersReduced: boolean | null; floorInsetFromBottom: string;
}) {
  const shadeColor = isWarm ? "#716a63ff" : t.woodL;
  const glowBg = isWarm
    ? "radial-gradient(ellipse, rgba(255,200,80,.22) 0%, transparent 72%)"
    : "radial-gradient(ellipse, rgba(173,180,47,0.45) 0%, transparent 72%)";

  return (
    <div
      className="absolute left-[10%] z-[7]"
      style={{ bottom: floorInsetFromBottom, transform: "scale(2)", transformOrigin: "bottom center" }}
    >
      <div className="relative mx-auto h-[56px] w-[72px]">
        <div
          className="absolute left-1/2 top-0 z-[2] h-0 w-0 -translate-x-1/2 border-l-[36px] border-r-[36px] border-l-transparent border-r-transparent"
          style={{ borderBottom: `56px solid ${shadeColor}`, filter: "drop-shadow(0 3px 8px rgba(0,0,0,.35))" }}
        />
        <motion.div
          className="absolute left-1/2 bottom-[-72px] z-[0] h-[150px] w-[210px] -translate-x-1/2"
          style={{ background: glowBg }}
          animate={prefersReduced ? undefined : { opacity: [0.82, 1], scale: [1, 1.05] }}
          transition={prefersReduced ? undefined : { duration: 3, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" }}
        />
      </div>
      <div
        className="relative z-[2] mx-auto h-[148px] w-[8px] shadow-[1px_0_4px_rgba(0,0,0,.3)]"
        style={{ background: `linear-gradient(90deg, ${t.woodL} 0%, ${t.wood} 50%, ${t.woodD} 100%)` }}
      />
      <div
        className="relative z-[2] mx-auto h-[12px] w-[36px] shadow-[0_2px_6px_rgba(0,0,0,.4)]"
        style={{ background: `linear-gradient(180deg, ${t.woodL} 0%, ${t.woodD} 100%)`, borderRadius: "50% 50% 3px 3px / 60% 60% 3px 3px" }}
      />
    </div>
  );
}

/* --- Main export --- */

export default function RoomLayout({
  showTopBar = true,
  theme: themeProp,
  onThemeChange,
  header,
  children,
  showThemeToggle = true,
  title = "The Reading Room",
  className = "",
}: RoomLayoutProps) {
  const prefersReduced = useReducedMotion();

  const [internalTheme, setInternalTheme] = useState<RoomTheme>("warm");
  const theme = themeProp ?? internalTheme;
  const isWarm = theme === "warm";
  const t = isWarm ? WARM : MIDNIGHT;

  const handleToggle = useCallback(() => {
    const next: RoomTheme = theme === "warm" ? "dark" : "warm";
    if (onThemeChange) onThemeChange(next);
    else setInternalTheme(next);
  }, [theme, onThemeChange]);

  const [viewport, setViewport] = useState<ViewportSize>(() =>
    typeof window === "undefined" ? DEFAULT_VIEWPORT : { width: window.innerWidth, height: window.innerHeight }
  );

  useEffect(() => {
    const sync = () => setViewport({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener("resize", sync);
    return () => window.removeEventListener("resize", sync);
  }, []);

  const floorInsetPx = useMemo(() => floorPxFromHeight(viewport.height), [viewport.height]);
  const floorInsetFromBottom = `clamp(${FLOOR_MIN_PCT}%, ${FLOOR_VH}vh, ${FLOOR_MAX_PCT}%)`;
  const floorStart = `calc(100% - ${floorInsetFromBottom})`;
  const wallLowStop = `calc(${floorStart} - 1%)`;
  const floorDockOffset = `calc(${floorInsetFromBottom} - 70px)`;
  const contentTopPadding = header ? "calc(56px + 0.75rem)" : "0.75rem";

  const { paintings, onDragStart, onDragMove } = useDraggablePaintings(header, viewport, floorInsetPx);

  const sceneBg = useMemo(
    () => `linear-gradient(180deg, ${t.wallTop} 0%, ${t.wallMid} 54%, ${t.wallLow} ${wallLowStop}, ${t.floor} ${floorStart}, ${t.floorD} 100%)`,
    [t, wallLowStop, floorStart],
  );

  const wallGridBg = `
    repeating-linear-gradient(0deg, transparent, transparent 36px, rgba(0,0,0,.018) 36px, rgba(0,0,0,.018) 37px),
    repeating-linear-gradient(90deg, transparent, transparent 36px, rgba(0,0,0,.018) 36px, rgba(0,0,0,.018) 37px)
  `;

  return (
    <div className={`relative min-h-screen ${className}`}>
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <div className="absolute inset-0" style={{ background: sceneBg }} />
        <div className="absolute inset-x-0 top-0" style={{ height: "66%", backgroundImage: wallGridBg }} />
        <div className="absolute inset-0" style={{ background: t.vignette }} />

        {/* Baseboard */}
        <div
          className="absolute left-0 right-0 z-[5] shadow-[0_4px_12px_rgba(0,0,0,.45)]"
          style={{
            bottom: floorInsetFromBottom, height: 14,
            background: `linear-gradient(180deg, ${t.baseL} 0%, ${t.base} 55%, ${t.woodD} 100%)`,
          }}
        />

        {/* Window + light cast + shadows — all coupled inside SceneWindow */}
        <SceneWindow isWarm={isWarm} t={t} prefersReduced={prefersReduced} />

        {/* Shelf + brackets + candle + vase — all coupled inside SceneShelf */}
        <SceneShelf isWarm={isWarm} t={t} prefersReduced={prefersReduced} floorInsetFromBottom={floorInsetFromBottom} />

        {/* Plants */}
        <div className="absolute left-[1.5%] z-[7]" style={{ bottom: floorInsetFromBottom }}>
          <PlantLarge leaf={t.leaf} pot={t.pot} base={t.base} />
        </div>
        <div className="absolute right-[18%] z-[7]" style={{ bottom: floorInsetFromBottom }}>
          <PlantSmall leaf={t.leaf} pot={t.pot} base={t.base} />
        </div>

        <SceneLamp isWarm={isWarm} t={t} prefersReduced={prefersReduced} floorInsetFromBottom={floorInsetFromBottom} />

        {/* Cat shadow */}
        <div
          className="absolute right-[2%] z-[6] h-[10px] w-[75px] blur-[2px]"
          style={{ bottom: floorInsetFromBottom, background: "radial-gradient(ellipse, rgba(0,0,0,.35) 0%, transparent 70%)" }}
        />
        {/* Cat */}
        <motion.div
          className="absolute right-[22%] z-[18]"
          style={{ bottom: floorInsetFromBottom }}
          whileHover={prefersReduced ? undefined : { rotate: [0, -5, 5, 0] }}
          transition={{ duration: 0.7, ease: "easeInOut" }}
          title="🐾"
        >
          <CatSvg color={t.cat} />
        </motion.div>

        {/* Rug */}
        <div className="absolute bottom-[4%] left-1/2 z-[4] -translate-x-1/2" style={{ width: "min(560px, 80vw)" }}>
          <div
            className="h-[55px] w-full rounded-full blur-[4px]"
            style={{ background: `radial-gradient(ellipse, ${t.rug2} 0%, ${t.rug1} 42%, transparent 70%)`, opacity: 0.42 }}
          />
          <div className="absolute left-1/2 top-[8px] h-[28px] w-[280px] -translate-x-1/2 rounded-full border border-white/5" />
        </div>

        {/* Dust particles */}
        {DUST.map((p, i) => (
          <motion.div
            key={i}
            className="absolute z-[2] rounded-full"
            style={{ left: p.left, top: p.top, width: 2, height: 2, background: t.spot, mixBlendMode: "screen" }}
            initial={{ opacity: 0, x: 0, y: 0 }}
            animate={prefersReduced ? { opacity: 0.15 } : { opacity: [0, 0.45, 0.18, 0], x: [0, p.tx], y: [0, p.ty] }}
            transition={prefersReduced ? undefined : { duration: p.dur, delay: p.del, repeat: Infinity, ease: "easeInOut" }}
          />
        ))}
      </div>

      {/* Draggable paintings */}
      <div className="pointer-events-none fixed inset-0 z-[180]">
        {(["landscape", "botanical"] as PaintingKey[]).map((key) => (
          <motion.div
            key={key}
            drag
            dragMomentum={false}
            dragElastic={0}
            onDragStart={onDragStart}
            onDrag={(_, info) => onDragMove(key, info.offset.x, info.offset.y)}
            onDragEnd={(_, info) => onDragMove(key, info.offset.x, info.offset.y)}
            className="pointer-events-auto absolute cursor-grab active:cursor-grabbing"
            style={{
              left: paintings[key].x,
              top: paintings[key].y,
              width: PAINTING_SIZES[key].width,
              height: PAINTING_SIZES[key].height,
            }}
            whileTap={{ scale: 1.02 }}
          >
            <div
              className="h-full w-full overflow-hidden rounded-[2px]"
              style={{
                border: `${key === "landscape" ? 10 : 8}px solid ${t.wood}`,
                boxShadow: key === "landscape"
                  ? "4px 5px 18px rgba(0,0,0,.4),inset 0 0 6px rgba(0,0,0,.12)"
                  : "3px 4px 14px rgba(0,0,0,.35),inset 0 0 5px rgba(0,0,0,.1)",
              }}
            >
              {key === "landscape" ? <WallArtLandscape /> : <WallArtBotanical />}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Top nav */}
      {showTopBar && (
        <nav
          className="sticky top-0 z-[200] flex h-[56px] items-center justify-between px-6 backdrop-blur"
          style={{
            background: isWarm ? "rgba(0,0,0,.10)" : "rgba(0,0,0,.30)",
            borderBottom: `1px solid rgba(255,255,255,${isWarm ? "0.06" : "0.04"})`,
          }}
        >
          <span
            className="text-[1.05rem] italic tracking-[0.04em]"
            style={{ fontFamily: 'Georgia, "Times New Roman", serif', color: isWarm ? "rgba(60,30,5,.72)" : "rgba(232,221,208,.70)" }}
          >
            {title}
          </span>
          {showThemeToggle && (
            <button
              onClick={handleToggle}
              className="flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[0.7rem] uppercase tracking-[0.12em] transition active:translate-y-[1px]"
              style={{
                fontFamily: "Georgia, serif",
                background: `rgba(255,255,255,${isWarm ? ".16" : ".08"})`,
                borderColor: `rgba(255,255,255,${isWarm ? ".22" : ".12"})`,
                color: isWarm ? "rgba(60,30,5,.72)" : "rgba(232,221,208,.78)",
              }}
              aria-label={`Switch to ${isWarm ? "dark" : "warm"} mode`}
            >
              <span aria-hidden>{isWarm ? "☀️" : "🕯️"}</span>
              <span>{isWarm ? "Warm" : "Midnight"}</span>
            </button>
          )}
        </nav>
      )}

      {header}

      {/* Content */}
      <div
        className="relative z-[10] h-screen overflow-hidden px-4 pb-4"
        style={{ paddingTop: contentTopPadding }}
      >
        <div
          className="mx-auto flex h-full w-full max-w-6xl items-end justify-center"
          style={{ paddingBottom: floorDockOffset }}
        >
          <div className="w-full max-w-[920px] origin-bottom scale-[0.67] sm:scale-[0.69] md:scale-[0.73] lg:scale-[0.78] xl:scale-[0.82]">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
