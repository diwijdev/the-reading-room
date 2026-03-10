"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";

export type Book = {
  id: string;
  title: string;
  author: string;
  genre_id: string | null;
  status: "read" | "reading" | "want";
  rating: number | null;
  shelf_index: number;
};

export function useBooks() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBooks = useCallback(async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("books")
      .select("*")
      .order("shelf_index", { ascending: true });

    if (!error && data) {
      // Single source of truth for list order after every write operation.
      setBooks(data);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    // Initial load on mount. This effect intentionally triggers the async fetch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchBooks();
  }, [fetchBooks]);

  const addBook = useCallback(
    async (input: { title: string; author: string; genre_id: string; status: Book["status"] }) => {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user.id;
      if (!userId) throw new Error("Not signed in");

      // New books are appended to the end of the selected shelf.
      const shelfBooks = books.filter((b) => b.genre_id === input.genre_id);
      const nextIndex = shelfBooks.length;

      const { error } = await supabase.from("books").insert({
        user_id: userId,
        title: input.title,
        author: input.author,
        genre_id: input.genre_id,
        status: input.status,
        shelf_index: nextIndex,
      });

      if (error) throw error;

      await fetchBooks();
    },
    [books, fetchBooks]
  );

  const updateBook = useCallback(
    async (input: { id: string; title: string; author: string; genre_id: string; status: Book["status"] }) => {
      const existing = books.find((b) => b.id === input.id);
      if (!existing) throw new Error("Book not found.");

      let shelfIndex = existing.shelf_index;
      if (existing.genre_id !== input.genre_id) {
        // If shelf changes, move the book to the end of the new shelf.
        const targetShelfBooks = books.filter((b) => b.genre_id === input.genre_id && b.id !== input.id);
        shelfIndex = targetShelfBooks.length;
      }

      const { error } = await supabase
        .from("books")
        .update({
          title: input.title,
          author: input.author,
          genre_id: input.genre_id,
          status: input.status,
          shelf_index: shelfIndex,
        })
        .eq("id", input.id);

      if (error) throw error;
      // Always re-fetch so local order matches DB order after updates.
      await fetchBooks();
    },
    [books, fetchBooks]
  );

  const removeBook = useCallback(
    async (id: string) => {
      const { error } = await supabase.from("books").delete().eq("id", id);
      if (error) throw error;
      await fetchBooks();
    },
    [fetchBooks]
  );

  return { books, loading, refetch: fetchBooks, addBook, updateBook, removeBook };
}
