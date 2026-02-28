"use client";

import type { RoomTheme } from "@/components/RoomLayout";

interface HeaderProps {
  displayName: string;
  theme: RoomTheme;
  onThemeToggle: () => void;
  onAddBook: () => void;
  onSignOut: () => void;
}

export function Header({
  displayName,
  theme,
  onThemeToggle,
  onAddBook,
  onSignOut,
}: HeaderProps) {
  const isWarm = theme === "warm";

  return (
    <header
      className="fixed left-0 right-0 top-0 z-[220] flex h-[56px] items-center justify-between px-6 backdrop-blur"
      style={{
        background: isWarm ? "rgba(0,0,0,.10)" : "rgba(0,0,0,.30)",
        borderBottom: `1px solid rgba(255,255,255,${isWarm ? "0.06" : "0.04"})`,
      }}
    >
      <h1
        className="text-[1.05rem] italic tracking-[0.04em]"
        style={{
          fontFamily: 'Georgia, "Times New Roman", serif',
          color: isWarm ? "rgba(60,30,5,.72)" : "rgba(232,221,208,.70)",
        }}
      >
        {displayName}&apos;s Reading Room
      </h1>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onThemeToggle}
          className="rounded-full border px-3 py-1.5 text-base transition active:translate-y-[1px]"
          style={{
            background: `rgba(255,255,255,${isWarm ? ".16" : ".08"})`,
            borderColor: `rgba(255,255,255,${isWarm ? ".22" : ".12"})`,
            color: isWarm ? "rgba(60,30,5,.72)" : "rgba(232,221,208,.78)",
          }}
          aria-label={`Switch to ${isWarm ? "dark" : "warm"} mode`}
          title={isWarm ? "Switch to dark mode" : "Switch to warm mode"}
        >
          <span aria-hidden>{isWarm ? "☀" : "☾"}</span>
        </button>

        <button
          type="button"
          onClick={onAddBook}
          className="rounded-xl px-3 py-2 text-sm font-medium transition hover:opacity-90"
          style={{
            background: isWarm ? "#E7B15A" : "#B78336",
            color: "#1A1108",
          }}
        >
          Add book
        </button>

        <button
          type="button"
          onClick={onSignOut}
          className="rounded-xl border px-3 py-2 text-sm transition"
          style={{
            borderColor: `rgba(255,255,255,${isWarm ? ".22" : ".12"})`,
            color: isWarm ? "rgba(60,30,5,.78)" : "rgba(232,221,208,.78)",
            background: `rgba(255,255,255,${isWarm ? ".16" : ".08"})`,
          }}
        >
          Sign out
        </button>
      </div>
    </header>
  );
}
