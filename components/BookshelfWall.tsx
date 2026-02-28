"use client";

import { motion } from "framer-motion";
import type { Genre } from "@/features/library/useGenres";
import type { Book } from "@/features/library/useBooks";

// Layout
const SHELF_MIN_HEIGHT = 220; // breathing room per shelf (px)
const PLANK_HEIGHT = 15;

// Light tuning
const LED_OPACITY = 0.55;
const LED_GLOW_OPACITY = 0.18;
const UNDERPLANK_OPACITY = 0.7;
const BACKPANEL_OPACITY = 0.55;

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function spineColor(seed: string) {
  const colors = [
    "bg-[#F6CACA]",
    "bg-[#F6E2B3]",
    "bg-[#CFE9D9]",
    "bg-[#CFE3F6]",
    "bg-[#E2D6F6]",
    "bg-[#F3D3E8]",
    "bg-[#DCE7E1]",
    "bg-[#E7E0D8]",
  ];
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return colors[h % colors.length];
}

function hash01(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return (h % 1000) / 1000;
}

type Theme = "light" | "dark";

function getThemeTokens(theme: Theme) {
  if (theme === "dark") {
    return {
      // Architecture (no pure blacks; all warm-brown shadows)
      nicheBg: "linear-gradient(180deg, #221E1A 0%, #1A1714 55%, #0F0D0B 100%)",
      nicheShadow: `
        inset 0 10px 34px rgba(15,13,11,0.80),
        inset 0 2px 10px rgba(15,13,11,0.65),
        inset 10px 0 34px rgba(15,13,11,0.55),
        inset -10px 0 34px rgba(15,13,11,0.55),
        inset 0 -10px 30px rgba(15,13,11,0.55),
        0 30px 90px rgba(15,13,11,0.75),
        0 10px 26px rgba(15,13,11,0.50)
      `,
      vignette: `
        radial-gradient(ellipse at 0% 50%, rgba(15,13,11,0.70) 0%, transparent 55%),
        radial-gradient(ellipse at 100% 50%, rgba(15,13,11,0.70) 0%, transparent 55%),
        radial-gradient(ellipse at 50% 100%, rgba(15,13,11,0.62) 0%, transparent 55%)
      `,

      // Lighting (warm filament + amber haze)
      ledWarm: "rgba(255,207,107,",   // Amber Haze
      ledCore: "rgba(255,243,204,",   // Warm Filament
      backWash: "rgba(212,130,10,",   // Cognac Wash (ceiling spill)

      // Shelf planks (walnut/teak)
      plankBg: "linear-gradient(to bottom, #4A3728 0%, #3A2A1E 55%, #2A1E15 100%)",
      plankText: "rgba(140,122,101,0.88)", // Genre label
      emptyText: "rgba(140,122,101,0.50)",

      // Optional: a subtle surround tint if you later add an outer frame
      surround: "#2C2620",
    };
  }

  // Light theme tokens
  return {
    nicheBg: "linear-gradient(180deg, #F4EFE6 0%, #EEE7DB 100%)",
    nicheShadow: `
      inset 0 8px 32px rgba(0,0,0,0.13),
      inset 0 2px 6px rgba(0,0,0,0.08),
      inset 8px 0 24px rgba(0,0,0,0.07),
      inset -8px 0 24px rgba(0,0,0,0.07),
      inset 0 -6px 20px rgba(0,0,0,0.06),
      0 24px 64px rgba(0,0,0,0.22),
      0 4px 12px rgba(0,0,0,0.12)
    `,
    vignette: `
      radial-gradient(ellipse at 0% 50%, rgba(0,0,0,0.07) 0%, transparent 55%),
      radial-gradient(ellipse at 100% 50%, rgba(0,0,0,0.07) 0%, transparent 55%),
      radial-gradient(ellipse at 50% 100%, rgba(0,0,0,0.06) 0%, transparent 55%)
    `,
    ledWarm: "rgba(255,248,230,",
    ledCore: "rgba(255,252,245,",
    backWash: "rgba(255,248,225,",
    plankBg: "linear-gradient(to bottom, #D4B896 0%, #C4A882 50%, #B89870 100%)",
    plankText: "rgba(100,85,70,0.65)",
    emptyText: "rgba(120,110,95,0.45)",
  };
}

export function BookshelfWall({
  genres,
  books,
  selectedBookId,
  onSelectBook,
  theme = "light",
}: {
  genres: Genre[];
  books: Book[];
  selectedBookId?: string | null;
  onSelectBook?: (book: Book) => void;
  theme?: Theme;
}) {
  const t = getThemeTokens(theme);

  return (
    <div className="mx-auto w-full max-w-5xl px-4">
      {/* Main niche container */}
      <div
        className="relative w-full overflow-hidden"
        style={{
          background: t.nicheBg,
          borderRadius: "12px 12px 0 0",
          border: theme === "dark" ? "1px solid rgba(255,207,107,0.14)" : "1px solid rgba(110,80,50,0.18)",
          boxShadow: `${t.nicheShadow}, inset 0 0 0 6px ${theme === "dark" ? "rgba(42,30,21,0.75)" : "rgba(180,145,108,0.55)"}`,
          padding: "40px 28px 0px 28px",
        }}
      >
        {/* Cabinet top lip for a more realistic frame */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0"
          style={{
            height: "16px",
            background: theme === "dark"
              ? "linear-gradient(to bottom, rgba(74,55,40,0.85) 0%, rgba(42,30,21,0.2) 100%)"
              : "linear-gradient(to bottom, rgba(212,184,150,0.9) 0%, rgba(184,152,112,0.25) 100%)",
          }}
        />

        {/* Top ambient bloom */}
        <div
          className="pointer-events-none absolute left-1/2 -top-10 -translate-x-1/2"
          style={{
            width: "70%",
            height: "160px",
            borderRadius: "50%",
            background: `radial-gradient(ellipse at 50% 0%, ${t.backWash}${BACKPANEL_OPACITY}) 0%, transparent 75%)`,
            filter: "blur(28px)",
          }}
        />

        {/* Edge vignette for depth */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: t.vignette }}
        />

        <div className="relative flex flex-col gap-0">
          {genres.map((g) => {
            const shelfBooks = books
              .filter((b) => b.genre_id === g.id)
              .sort((a, b) => a.shelf_index - b.shelf_index);

            return (
              <div key={g.id} className="relative flex flex-col">
                {/* Shelf cavity */}
                <div className="relative overflow-visible" style={{ minHeight: `${SHELF_MIN_HEIGHT}px` }}>
                  {/* Left LED */}
                  <div className="pointer-events-none absolute inset-y-0 left-0" style={{ width: "32px", zIndex: 2 }}>
                    <div
                      className="absolute inset-y-0"
                      style={{
                        left: 0,
                        width: "28px",
                        background: `linear-gradient(to right, ${t.ledWarm}${LED_GLOW_OPACITY}) 0%, transparent 100%)`,
                        filter: "blur(6px)",
                      }}
                    />
                    <div
                      className="absolute inset-y-4"
                      style={{
                        left: "4px",
                        width: "4px",
                        borderRadius: "4px",
                        background: `linear-gradient(to bottom, ${t.ledCore}${LED_OPACITY}) 0%, ${t.ledWarm}${LED_OPACITY * 0.7}) 60%, transparent 100%)`,
                        filter: "blur(2px)",
                      }}
                    />
                  </div>

                  {/* Right LED */}
                  <div className="pointer-events-none absolute inset-y-0 right-0" style={{ width: "32px", zIndex: 2 }}>
                    <div
                      className="absolute inset-y-0"
                      style={{
                        right: 0,
                        width: "28px",
                        background: `linear-gradient(to left, ${t.ledWarm}${LED_GLOW_OPACITY}) 0%, transparent 100%)`,
                        filter: "blur(6px)",
                      }}
                    />
                    <div
                      className="absolute inset-y-4"
                      style={{
                        right: "4px",
                        width: "4px",
                        borderRadius: "4px",
                        background: `linear-gradient(to bottom, ${t.ledCore}${LED_OPACITY}) 0%, ${t.ledWarm}${LED_OPACITY * 0.7}) 60%, transparent 100%)`,
                        filter: "blur(2px)",
                      }}
                    />
                  </div>

                  {/* Back-panel wash */}
                  <div
                    className="pointer-events-none absolute inset-x-0 top-0"
                    style={{
                      height: "60%",
                      background: `linear-gradient(to bottom, ${t.backWash}${BACKPANEL_OPACITY}) 0%, transparent 100%)`,
                    }}
                  />

                  {/* Books anchored to the plank */}
                  <div
                    className="absolute inset-x-0 bottom-0.5 flex flex-col justify-end overflow-visible"
                    style={{ paddingLeft: "36px", paddingRight: "36px" }}
                  >
                    <div className="flex flex-wrap items-end gap-1.5 overflow-visible pb-0">
                      {shelfBooks.length === 0 ? (
                        <div
                          className="w-full py-6 text-center text-xs tracking-wide"
                          style={{ color: t.emptyText }}
                        >
                          — empty —
                        </div>
                      ) : (
                        shelfBooks.map((b) => {
                          const isSelected = selectedBookId === b.id;
                          const r = hash01(b.id);
                          const tallBias = r * r;

                          const spineHeight = clamp(Math.round(100 + tallBias * 100), 100, 200);
                          const spineWidth = 44 + Math.floor(hash01(b.id) * 3) * 3; // 44, 47, 50

                          const coverHeight = spineHeight + 40;
                          const coverWidth = 150;

                          return (
                            <motion.button
                              key={b.id}
                              type="button"
                              onClick={() => onSelectBook?.(b)}
                              className="group relative flex-shrink-0"
                              layout
                              layoutId={`book-${b.id}`}
                              initial={false}
                              animate={{
                                width: isSelected ? coverWidth : spineWidth,
                                height: isSelected ? coverHeight : spineHeight,
                                y: isSelected ? -10 : 0,
                                zIndex: isSelected ? 50 : 1,
                              }}
                              whileHover={!isSelected ? { y: -6 } : undefined}
                              transition={{
                                layout: { type: "spring", stiffness: 260, damping: 26 },
                                default: { type: "spring", stiffness: 260, damping: 26 },
                              }}
                              style={{ transformStyle: "preserve-3d" }}
                            >
                              {/* Status dot/pill above book */}
                              {(b.status === "reading" || isSelected) && (
                                <motion.div
                                  layoutId={`status-indicator-${b.id}`}
                                  className="absolute left-1/2 z-30 -translate-x-1/2"
                                  animate={{ top: isSelected ? -26 : -18 }}
                                  transition={{ type: "spring", stiffness: 300, damping: 28 }}
                                >
                                  {isSelected ? (
                                    <motion.div
                                      className="border bg-white/80 px-2.5 py-1 text-[10px] font-medium shadow-sm backdrop-blur"
                                      style={{
                                        borderColor: theme === "dark" ? "rgba(255,207,107,0.22)" : "rgba(0,0,0,0.12)",
                                        color: theme === "dark" ? "rgba(232,221,208,0.90)" : "rgba(80,70,60,0.75)",
                                        borderRadius: "10px 10px 2px 2px",
                                        background: theme === "dark" ? "rgba(34,30,26,0.65)" : "rgba(255,255,255,0.80)",
                                      }}
                                    >
                                      {b.status}
                                    </motion.div>
                                  ) : (
                                    <motion.div className="h-2.5 w-2.5 rounded-full bg-black/50" />
                                  )}
                                </motion.div>
                              )}

                              {/* 3D flip */}
                              <div className="relative h-full w-full" style={{ perspective: "900px" }}>
                                <motion.div
                                  className="relative h-full w-full"
                                  style={{ transformStyle: "preserve-3d" }}
                                  initial={false}
                                  animate={{ rotateY: isSelected ? 180 : 0 }}
                                  transition={{ type: "spring", stiffness: 260, damping: 26 }}
                                >
                                  {/* Spine */}
                                  <div
                                    className={["absolute inset-0", spineColor(b.id)].join(" ")}
                                    style={{
                                      backfaceVisibility: "hidden",
                                      borderRadius: "5px",
                                      boxShadow:
                                        "inset -2px 0 6px rgba(0,0,0,0.10), 2px 2px 8px rgba(0,0,0,0.12)",
                                    }}
                                  >
                                    <div
                                      className="absolute inset-y-0 left-0 w-[5px]"
                                      style={{
                                        borderRadius: "5px 0 0 5px",
                                        background: "rgba(255,255,255,0.30)",
                                      }}
                                    />
                                    <div className="absolute inset-0 flex items-center justify-center overflow-hidden px-1">
                                      <div
                                        className="max-h-full overflow-hidden"
                                        style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
                                      >
                                        <p className="text-[11px] font-semibold leading-tight text-neutral-800">
                                          {b.title}
                                        </p>
                                        <p className="mt-1.5 text-[9px] text-neutral-700/60">
                                          {b.author}
                                        </p>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Cover */}
                                  <div
                                    className={["absolute inset-0", spineColor(b.id)].join(" ")}
                                    style={{
                                      backfaceVisibility: "hidden",
                                      borderRadius: "8px",
                                      transform: "rotateY(180deg)",
                                      textAlign: "left",
                                      boxShadow:
                                        "inset -3px 0 8px rgba(0,0,0,0.12), 4px 4px 16px rgba(0,0,0,0.15)",
                                    }}
                                  >
                                    <div className="flex h-full flex-col justify-between p-4">
                                      <div>
                                        <p className="text-sm font-semibold leading-snug text-neutral-800 line-clamp-3">
                                          {b.title}
                                        </p>
                                        <div className="mt-2 h-px w-8 bg-neutral-800/20" />
                                      </div>
                                      <p className="text-xs text-neutral-700/70">{b.author}</p>
                                    </div>
                                  </div>
                                </motion.div>
                              </div>
                            </motion.button>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>

                {/* Plank + label (render for EVERY shelf, including last) */}
                <div className="relative w-full" style={{ zIndex: 3 }}>
                  {/* Under-plank glow */}
                  <div
                    className="pointer-events-none absolute left-[5%] right-[5%] -top-3"
                    style={{
                      height: "18px",
                      borderRadius: "50%",
                      background: `radial-gradient(ellipse at 50% 100%, ${
                        theme === "dark"
                          ? `rgba(255,224,138,${UNDERPLANK_OPACITY * 0.75})`
                          : `rgba(255,248,210,${UNDERPLANK_OPACITY})`
                      } 0%, transparent 75%)`,
                      filter: theme === "dark" ? "blur(6px)" : "blur(5px)",
                      opacity: theme === "dark" ? 0.55 : 1,
                    }}
                  />

                  {/* Plank */}
                  <div
                    className="relative"
                    style={{
                      height: `${PLANK_HEIGHT}px`,
                      background: t.plankBg,
                      boxShadow:
                        "0 3px 10px rgba(0,0,0,0.18), 0 1px 3px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.20)",
                      borderRadius: "3px",
                    }}
                  >
                    {/* Genre label on the plank */}
                    <div
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-medium uppercase tracking-widest"
                      style={{ color: t.plankText }}
                    >
                      {g.name}
                    </div>
                  </div>

                  {/* Plank underside shadow */}
                  <div
                    className="pointer-events-none absolute left-[3%] right-[3%]"
                    style={{
                      top: `${PLANK_HEIGHT}px`,
                      height: "22px",
                      background: "linear-gradient(to bottom, rgba(0,0,0,0.12) 0%, transparent 100%)",
                      filter: "blur(3px)",
                      opacity: theme === "dark" ? 0.7 : 1,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom spacer */}
        <div style={{ height: "32px" }} />
      </div>
    </div>
  );
}
