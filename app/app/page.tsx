"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useBooks } from "@/features/library/useBooks";
import { useGenres } from "@/features/library/useGenres";
import { GENRES_PER_BOOKSHELF } from "@/features/library/constants";
import { AddBookModal } from "@/components/AddBookModal";
import { EditBookModal } from "@/components/EditBookModal";
import { BookshelfWall } from "@/components/BookshelfWall";
import type { Book } from "@/features/library/useBooks";
import RoomLayout, { type RoomTheme } from "@/components/RoomLayout";
import { Header } from "@/components/Header";

export default function AppHome() {
  const router = useRouter();
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [genreModalOpen, setGenreModalOpen] = useState(false);
  const [actionToast, setActionToast] = useState<string | null>(null);
  const [removingBookId, setRemovingBookId] = useState<string | null>(null);
  const [genrePage, setGenrePage] = useState(0);
  const [theme, setTheme] = useState<RoomTheme>("warm");
  const { genres, loading: genresLoading, addGenre, updateGenre, removeGenre, reorderGenres } =
    useGenres();
  const { books, addBook, updateBook, removeBook } = useBooks();
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState<string>("");
  // Keep selection stable even after list refreshes by re-resolving from latest books.
  const selectedBookCurrent = selectedBook
    ? books.find((b) => b.id === selectedBook.id) ?? selectedBook
    : null;
  const toastTimerRef = useRef<number | null>(null);
  const totalGenrePages = Math.max(1, Math.ceil(genres.length / GENRES_PER_BOOKSHELF));
  const paginatedGenres = useMemo(
    () =>
      genres.slice(
        genrePage * GENRES_PER_BOOKSHELF,
        genrePage * GENRES_PER_BOOKSHELF + GENRES_PER_BOOKSHELF
      ),
    [genrePage, genres]
  );
  const visibleGenres = useMemo(
    () =>
      genres.length === 0
        ? []
        : [
            ...paginatedGenres,
            ...Array.from(
              { length: Math.max(0, GENRES_PER_BOOKSHELF - paginatedGenres.length) },
              (_, index) => ({
                id: `placeholder-${genrePage}-${index}`,
                name: "",
                sort_order: 1000 + index,
              })
            ),
          ],
    [genrePage, genres.length, paginatedGenres]
  );

  useEffect(() => {
    let ignore = false;

    async function init() {
      // More reliable than getSession right after login.
      const { data, error } = await supabase.auth.getUser();

      if (ignore) return;

      if (error || !data.user) {
        router.replace("/login");
        return;
      }

      const metadata = data.user.user_metadata as { display_name?: string } | undefined;
      const name = metadata?.display_name || data.user.email || "Reader";

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

  function showActionToast(message: string) {
    setActionToast(message);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    // Auto-hide toast so action feedback does not stay on screen.
    toastTimerRef.current = window.setTimeout(() => setActionToast(null), 3000);
  }

  async function handleRemoveBook(book: Book) {
    // Keep destructive action explicit.
    const shouldDelete = window.confirm(`Remove "${book.title}" by ${book.author}?`);
    if (!shouldDelete) return;

    setRemovingBookId(book.id);
    try {
      await removeBook(book.id);
      // If removed book was selected, clear selection and close edit modal.
      setSelectedBook((prev) => (prev?.id === book.id ? null : prev));
      setEditOpen(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to remove book.";
      showActionToast(message);
    } finally {
      setRemovingBookId(null);
    }
  }

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    };
  }, []);

  useEffect(() => {
    setGenrePage((prev) => Math.min(prev, totalGenrePages - 1));
  }, [totalGenrePages]);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-neutral-950 text-neutral-200">
        Loading…
      </main>
    );
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
          onManageGenres={() => setGenreModalOpen((prev) => !prev)}
          genreMenuOpen={genreModalOpen}
          genres={genres}
          onAddGenre={addGenre}
          onUpdateGenre={updateGenre}
          onDeleteGenre={async (genre) => {
            await removeGenre(genre.id);
          }}
          onReorderGenres={reorderGenres}
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
                    onClick={() => setGenreModalOpen(true)}
                    className="rounded-lg border border-neutral-700 px-3 py-2 text-sm hover:border-neutral-400"
                >
                    Manage genres
                </button>
                </div>
            ) : (
                <>
                <div className="relative">
                  {totalGenrePages > 1 && (
                    <button
                      type="button"
                      onClick={() => setGenrePage((prev) => Math.max(0, prev - 1))}
                      disabled={genrePage === 0}
                      className="absolute left-[-32px] top-1/2 z-20 h-11 w-11 -translate-y-1/2 rounded-full border border-neutral-700 bg-neutral-950/70 text-xl text-neutral-200 backdrop-blur disabled:opacity-35"
                      aria-label="Previous shelf page"
                    >
                      ‹
                    </button>
                  )}
                  <BookshelfWall
                    genres={visibleGenres}
                    books={books}
                    selectedBookId={selectedBook?.id ?? null}
                    onSelectBook={(b) =>
                      setSelectedBook((prev) => (prev?.id === b.id ? null : b))
                    }
                    onEditBook={(book) => {
                      setSelectedBook(book);
                      setEditOpen(true);
                    }}
                    onRemoveBook={handleRemoveBook}
                    isRemovingBookId={removingBookId}
                    theme={theme === "dark" ? "dark" : "light"}
                  />
                  {totalGenrePages > 1 && (
                    <button
                      type="button"
                      onClick={() => setGenrePage((prev) => Math.min(totalGenrePages - 1, prev + 1))}
                      disabled={genrePage === totalGenrePages - 1}
                      className="absolute right-[-32px] top-1/2 z-20 h-11 w-11 -translate-y-1/2 rounded-full border border-neutral-700 bg-neutral-950/70 text-xl text-neutral-200 backdrop-blur disabled:opacity-35"
                      aria-label="Next shelf page"
                    >
                      ›
                    </button>
                  )}
                </div>
                </>
            )}
        </section>
        <AddBookModal
            open={addOpen}
            onClose={() => setAddOpen(false)}
            genres={genres}
            onAdd={addBook}
        />
        <EditBookModal
            open={editOpen}
            onClose={() => setEditOpen(false)}
            genres={genres}
            book={selectedBookCurrent}
            onSave={async (input) => {
              await updateBook(input);
            }}
        />
        {actionToast && (
          <div className="pointer-events-none fixed right-4 top-20 z-[240] max-w-xs rounded-lg border border-red-800/60 bg-red-950/85 p-3 text-sm text-red-100 shadow-lg">
            {actionToast}
          </div>
        )}
      </div>
    </RoomLayout>
  );
}
