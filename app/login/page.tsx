"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Mode = "signin" | "signup";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string>("");

  const emailRef = useRef<HTMLInputElement | null>(null);

  const subtitle = useMemo(() => {
    return mode === "signin"
      ? "Step into your reading room."
      : "Create your library account.";
  }, [mode]);

  useEffect(() => {
    emailRef.current?.focus();
  }, []);

  useEffect(() => {
    // If already signed in, go straight to /app
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace("/app");
    });
  }, [router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    setLoading(true);

    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: displayName.trim() || null },
          },
        });
        if (error) throw error;

        setMessage(
          "Account created. If email confirmation is enabled, check your inbox. Otherwise you can sign in now."
        );
        setMode("signin");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;

        router.replace("/app");
      }
    } catch (err: any) {
      setMessage(err?.message ?? "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-neutral-950 text-neutral-100">
      {/* Cozy wall background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-b from-neutral-950 via-neutral-950 to-amber-950/20" />
        {/* subtle wall texture grid */}
        <div className="absolute inset-0 opacity-[0.10] [background-image:linear-gradient(to_right,rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:48px_48px]" />
        {/* vignette */}
        <div className="absolute inset-0 [box-shadow:inset_0_0_140px_rgba(0,0,0,0.85)]" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-6xl items-center justify-center px-6 py-12">
        <div className="grid w-full grid-cols-1 gap-10 lg:grid-cols-2 lg:items-center">
          {/* Left: Brand + “modern shelf” illustration block */}
          <section className="space-y-5">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-neutral-800 bg-neutral-900/40 px-3 py-1 text-xs text-neutral-200">
                Cozy Library
                <span className="h-1 w-1 rounded-full bg-amber-200/80" />
                personal reading tracker
              </p>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
                A modern bookshelf for your books,
                <span className="text-amber-200"> lit with calm</span>.
              </h1>
              <p className="mt-3 max-w-xl text-sm text-neutral-300">
                Track what you’re reading, organize by genre, and write reviews in your
                notebook—your own little reading room.
              </p>
            </div>

            {/* Mini “shelf” mock (pure CSS) */}
            <div className="relative max-w-xl rounded-3xl border border-neutral-800 bg-neutral-900/40 p-5">
              {/* ambient shelf light */}
              <div className="pointer-events-none absolute inset-x-5 top-5 h-10 rounded-2xl bg-gradient-to-b from-amber-200/20 to-transparent blur-sm" />
              <div className="space-y-4">
                {[0, 1, 2].map((row) => (
                  <div key={row} className="rounded-2xl border border-amber-900/25 bg-gradient-to-b from-amber-900/20 to-amber-950/20 px-4 pt-4">
                    <div className="flex items-end gap-2 pb-4">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <div
                          key={i}
                          className="rounded-xl border border-neutral-800/60 shadow-sm"
                          style={{
                            width: 38 + ((i + row) % 3) * 6,
                            height: 78 + ((i + row) % 4) * 10,
                            background:
                              [
                                "rgba(253,186,116,0.75)", // amber
                                "rgba(167,243,208,0.75)", // mint
                                "rgba(147,197,253,0.75)", // sky
                                "rgba(216,180,254,0.75)", // violet
                                "rgba(252,165,165,0.75)", // rose
                              ][(i + row) % 5],
                          }}
                        />
                      ))}
                    </div>
                    <div className="-mx-4 h-3 rounded-b-2xl border-t border-amber-200/10 bg-gradient-to-b from-amber-700/15 to-amber-950/35" />
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Right: Auth card */}
          <section className="flex justify-center lg:justify-end">
            <div className="w-full max-w-md rounded-3xl border border-neutral-800 bg-neutral-900/50 p-6 shadow-xl backdrop-blur">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold">
                    {mode === "signin" ? "Sign in" : "Create account"}
                  </h2>
                  <p className="mt-1 text-sm text-neutral-300">{subtitle}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    className={`rounded-lg px-3 py-1.5 text-sm border ${
                      mode === "signin"
                        ? "bg-neutral-100 text-neutral-900 border-neutral-100"
                        : "bg-transparent text-neutral-100 border-neutral-700 hover:border-neutral-500"
                    }`}
                    onClick={() => setMode("signin")}
                    type="button"
                  >
                    Sign in
                  </button>
                  <button
                    className={`rounded-lg px-3 py-1.5 text-sm border ${
                      mode === "signup"
                        ? "bg-neutral-100 text-neutral-900 border-neutral-100"
                        : "bg-transparent text-neutral-100 border-neutral-700 hover:border-neutral-500"
                    }`}
                    onClick={() => setMode("signup")}
                    type="button"
                  >
                    Sign up
                  </button>
                </div>
              </div>

              <form onSubmit={onSubmit} className="mt-6 space-y-4">
                {mode === "signup" && (
                  <div>
                    <label className="block text-sm text-neutral-200 mb-1">
                      Display name (optional)
                    </label>
                    <input
                      className="w-full rounded-xl border border-neutral-700 bg-neutral-950/40 px-3 py-2 outline-none focus:border-neutral-400"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Diwij / Emi"
                      autoComplete="nickname"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm text-neutral-200 mb-1">Email</label>
                  <input
                    ref={emailRef}
                    className="w-full rounded-xl border border-neutral-700 bg-neutral-950/40 px-3 py-2 outline-none focus:border-neutral-400"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                    inputMode="email"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm text-neutral-200 mb-1">Password</label>
                  <input
                    className="w-full rounded-xl border border-neutral-700 bg-neutral-950/40 px-3 py-2 outline-none focus:border-neutral-400"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    type="password"
                    autoComplete={mode === "signin" ? "current-password" : "new-password"}
                    required
                    minLength={6}
                  />
                  <p className="mt-1 text-xs text-neutral-400">
                    Use 6+ characters (we can improve rules later).
                  </p>
                </div>

                {message && (
                  <p className="text-sm text-neutral-200 border border-neutral-800 rounded-xl p-3 bg-neutral-950/30">
                    {message}
                  </p>
                )}

                <button
                  disabled={loading}
                  className="w-full rounded-xl bg-amber-200 text-neutral-900 px-3 py-2 font-medium disabled:opacity-60"
                  type="submit"
                >
                  {loading ? "Working..." : mode === "signin" ? "Enter library" : "Create account"}
                </button>

                <p className="text-xs text-neutral-400">
                  Tip: bookmark this page. When you sign in, you’ll land directly in your shelves.
                </p>
              </form>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}