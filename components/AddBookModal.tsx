"use client";

import { useEffect, useRef, useState } from "react";
import type { Genre } from "@/features/library/useGenres";
import type { Book } from "@/features/library/useBooks";

export function AddBookModal({
  open,
  onClose,
  genres,
  onAdd,
}: {
  open: boolean;
  onClose: () => void;
  genres: Genre[];
  onAdd: (input: { title: string; author: string; genre_id: string; status: Book["status"] }) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [genreId, setGenreId] = useState("");
  const [status, setStatus] = useState<Book["status"]>("want");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const titleRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) {
      // Reset form every time modal opens so stale values are not reused.
      setError("");
      setTitle("");
      setAuthor("");
      setStatus("want");
      setGenreId(genres[0]?.id ?? "");
      // Focus after mount so keyboard users can start typing immediately.
      setTimeout(() => titleRef.current?.focus(), 0);
    }
  }, [open, genres]);

  if (!open) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    // Keep quick client-side validation before making network calls.
    if (!title.trim() || !author.trim() || !genreId) {
      setError("Please fill in title, author, and genre.");
      return;
    }

    setLoading(true);
    try {
      await onAdd({ title: title.trim(), author: author.trim(), genre_id: genreId, status });
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to add book.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Add a book</h2>
          <button onClick={onClose} className="text-neutral-300 hover:text-neutral-100">✕</button>
        </div>

        <form onSubmit={submit} className="mt-4 space-y-3">
          <div>
            <label className="block text-sm text-neutral-200 mb-1">Title</label>
            <input
              ref={titleRef}
              className="w-full rounded-lg border border-neutral-700 bg-neutral-950/40 px-3 py-2 outline-none focus:border-neutral-400"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm text-neutral-200 mb-1">Author</label>
            <input
              className="w-full rounded-lg border border-neutral-700 bg-neutral-950/40 px-3 py-2 outline-none focus:border-neutral-400"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-neutral-200 mb-1">Genre</label>
              <select
                className="w-full rounded-lg border border-neutral-700 bg-neutral-950/40 px-3 py-2 outline-none focus:border-neutral-400"
                value={genreId}
                onChange={(e) => setGenreId(e.target.value)}
              >
                {genres.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm text-neutral-200 mb-1">Status</label>
              <select
                className="w-full rounded-lg border border-neutral-700 bg-neutral-950/40 px-3 py-2 outline-none focus:border-neutral-400"
                value={status}
                onChange={(e) => setStatus(e.target.value as Book["status"])}
              >
                <option value="want">Want to read</option>
                <option value="reading">Currently reading</option>
                <option value="read">Finished</option>
              </select>
            </div>
          </div>

          {error && (
            <p className="text-sm rounded-lg border border-neutral-800 bg-neutral-950/30 p-3">
              {error}
            </p>
          )}

          <button
            disabled={loading}
            className="w-full rounded-lg bg-neutral-100 text-neutral-900 px-3 py-2 font-medium disabled:opacity-60"
            type="submit"
          >
            {loading ? "Adding..." : "Add book"}
          </button>
        </form>
      </div>
    </div>
  );
}
