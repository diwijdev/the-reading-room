"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useBooks } from "@/features/library/useBooks";
import { useGenres } from "@/features/library/useGenres";
import { AddBookModal } from "@/components/AddBookModal";
import { BookshelfWall } from "@/components/BookshelfWall";
import type { Book } from "@/features/library/useBooks";
import RoomLayout, { type RoomTheme } from "@/components/RoomLayout";
import { Header } from "@/components/Header";

export default function AppHome() {
  const router = useRouter();
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [theme, setTheme] = useState<RoomTheme>("warm");
  const { genres, loading: genresLoading, refetch: refetchGenres } = useGenres();
  const { books, addBook } = useBooks();
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState<string>("");
  

useEffect(() => {
  let ignore = false;

  async function init() {
    // ✅ More reliable than getSession right after login
    const { data, error } = await supabase.auth.getUser();

    if (ignore) return;

    if (error || !data.user) {
      router.replace("/login");
      return;
    }

    const name =
      (data.user.user_metadata as any)?.display_name ||
      data.user.email ||
      "Reader";

    setDisplayName(name);
    setLoading(false);
  }

  init();

  const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
    if (!session) router.replace("/login");
  });

  return () => {
    ignore = true;
    sub.subscription.unsubscribe();
  };
}, [router]);

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-neutral-950 text-neutral-200">
        Loading…
      </main>
    );
  }

    async function seedGenres() {
    const defaults = [
        { name: "Fantasy", sort_order: 1 },
        { name: "Non-Fiction", sort_order: 2 },
        { name: "Sci-Fi", sort_order: 3 },
        { name: "Romance", sort_order: 4 },
    ];

    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;

    console.log("User ID:", userId);

    if (!userId) return;

    const payload = defaults.map((g) => ({ ...g, user_id: userId }));

    const { data, error } = await supabase.from("genres").insert(payload);

    console.log("Insert result:", { data, error });

    if (!error) await refetchGenres();
    }

  return (
    <RoomLayout
      theme={theme}
      showTopBar={false}
      header={
        <Header
          displayName={displayName}
          theme={theme}
          onThemeToggle={() => setTheme((prev) => (prev === "warm" ? "dark" : "warm"))}
          onAddBook={() => setAddOpen(true)}
          onSignOut={signOut}
        />
      }
    >
      <div className="mx-auto max-w-5xl">
        <section className="mt-6">
            {genresLoading ? (
                <p className="text-neutral-400">Loading shelves...</p>
            ) : genres.length === 0 ? (
                <div>
                <p className="text-neutral-400 mb-3">No shelves yet.</p>
                <button
                    onClick={seedGenres}
                    className="rounded-lg border border-neutral-700 px-3 py-2 text-sm hover:border-neutral-400"
                >
                    Create my shelves (seed genres)
                </button>
                </div>
            ) : (
                <>
                <BookshelfWall
                  genres={genres}
                  books={books}
                  selectedBookId={selectedBook?.id ?? null}
                  onSelectBook={(b) =>
                    setSelectedBook((prev) => (prev?.id === b.id ? null : b))
                  }
                  theme={theme === "dark" ? "dark" : "light"}
                />
                </>
            )}
        </section>
        <AddBookModal
            open={addOpen}
            onClose={() => setAddOpen(false)}
            genres={genres}
            onAdd={addBook}
        />
      </div>
    </RoomLayout>
  );
}
