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
      setBooks(data);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchBooks();
  }, [fetchBooks]);

  const addBook = useCallback(
    async (input: { title: string; author: string; genre_id: string; status: Book["status"] }) => {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user.id;
      if (!userId) throw new Error("Not signed in");

      // Put new book at end of that shelf
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

  return { books, loading, refetch: fetchBooks, addBook };
}