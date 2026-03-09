"use client";

import { useEffect, useRef, useState } from "react";
import type { Genre } from "@/features/library/useGenres";
import type { Book } from "@/features/library/useBooks";

export function EditBookModal({
  open,
  onClose,
  genres,
  book,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  genres: Genre[];
  book: Book | null;
  onSave: (input: { id: string; title: string; author: string; genre_id: string; status: Book["status"] }) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [genreId, setGenreId] = useState("");
  const [status, setStatus] = useState<Book["status"]>("want");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const titleRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open && book) {
      // Pre-fill form from the selected book each time the modal opens.
      setError("");
      setTitle(book.title);
      setAuthor(book.author);
      setStatus(book.status);
      setGenreId(book.genre_id ?? genres[0]?.id ?? "");
      // Focus after mount for faster keyboard editing.
      setTimeout(() => titleRef.current?.focus(), 0);
    }
  }, [open, book, genres]);

  if (!open || !book) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!book) return;

    if (!title.trim() || !author.trim() || !genreId) {
      setError("Please fill in title, author, and genre.");
      return;
    }

    setLoading(true);
    try {
      // Save normalized values so accidental spaces are not stored.
      await onSave({
        id: book.id,
        title: title.trim(),
        author: author.trim(),
        genre_id: genreId,
        status,
      });
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update book.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Edit book</h2>
          <button onClick={onClose} className="text-neutral-300 hover:text-neutral-100">✕</button>
        </div>

        <form onSubmit={submit} className="mt-4 space-y-3">
          <div>
            <label className="mb-1 block text-sm text-neutral-200">Title</label>
            <input
              ref={titleRef}
              className="w-full rounded-lg border border-neutral-700 bg-neutral-950/40 px-3 py-2 outline-none focus:border-neutral-400"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-neutral-200">Author</label>
            <input
              className="w-full rounded-lg border border-neutral-700 bg-neutral-950/40 px-3 py-2 outline-none focus:border-neutral-400"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm text-neutral-200">Genre</label>
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
              <label className="mb-1 block text-sm text-neutral-200">Status</label>
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
            <p className="rounded-lg border border-neutral-800 bg-neutral-950/30 p-3 text-sm">
              {error}
            </p>
          )}

          <button
            disabled={loading}
            className="w-full rounded-lg bg-neutral-100 px-3 py-2 font-medium text-neutral-900 disabled:opacity-60"
            type="submit"
          >
            {loading ? "Saving..." : "Save changes"}
          </button>
        </form>
      </div>
    </div>
  );
}
