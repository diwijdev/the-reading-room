"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export type Genre = {
  id: string;
  name: string;
  sort_order: number;
};

export function useGenres() {
  const [genres, setGenres] = useState<Genre[]>([]);
  const [loading, setLoading] = useState(true);

  const getUserId = useCallback(async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;
    if (!userId) throw new Error("Not signed in");
    return userId;
  }, []);

  const fetchGenres = useCallback(async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("genres")
      .select("*")
      .order("sort_order", { ascending: true });

    if (!error && data) setGenres(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    // Initial load on mount. This effect intentionally triggers the async fetch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchGenres();
  }, [fetchGenres]);

  const addGenre = useCallback(
    async (name: string) => {
      const trimmedName = name.trim();
      if (!trimmedName) throw new Error("Genre name is required.");

      const userId = await getUserId();
      const nextSortOrder = genres.length === 0 ? 1 : Math.max(...genres.map((genre) => genre.sort_order)) + 1;

      const { error } = await supabase.from("genres").insert({
        user_id: userId,
        name: trimmedName,
        sort_order: nextSortOrder,
      });

      if (error) throw error;
      await fetchGenres();
    },
    [fetchGenres, genres, getUserId]
  );

  const updateGenre = useCallback(
    async (id: string, name: string) => {
      const trimmedName = name.trim();
      if (!trimmedName) throw new Error("Genre name is required.");

      const { error } = await supabase.from("genres").update({ name: trimmedName }).eq("id", id);
      if (error) throw error;

      await fetchGenres();
    },
    [fetchGenres]
  );

  const ensureUnsortedGenre = useCallback(async () => {
    const userId = await getUserId();

    const existing = genres.find((genre) => genre.name.toLowerCase() === "unsorted");
    if (existing) return existing.id;

    const nextSortOrder = genres.length === 0 ? 1 : Math.max(...genres.map((genre) => genre.sort_order)) + 1;
    const { data, error } = await supabase
      .from("genres")
      .insert({
        user_id: userId,
        name: "Unsorted",
        sort_order: nextSortOrder,
      })
      .select("id")
      .single();

    if (error || !data) throw error ?? new Error("Failed to create Unsorted genre.");
    return data.id;
  }, [genres, getUserId]);

  const removeGenre = useCallback(
    async (id: string) => {
      const { data: booksInGenre, error: booksError } = await supabase
        .from("books")
        .select("id")
        .eq("genre_id", id);

      if (booksError) throw booksError;

      if ((booksInGenre?.length ?? 0) > 0) {
        const unsortedGenreId = await ensureUnsortedGenre();
        const { error: moveError } = await supabase
          .from("books")
          .update({ genre_id: unsortedGenreId })
          .eq("genre_id", id);

        if (moveError) throw moveError;
      }

      const { error } = await supabase.from("genres").delete().eq("id", id);
      if (error) throw error;

      await fetchGenres();
    },
    [ensureUnsortedGenre, fetchGenres]
  );

  const reorderGenres = useCallback(
    async (orderedIds: string[]) => {
      const uniqueIds = orderedIds.filter((id, index) => orderedIds.indexOf(id) === index);
      if (uniqueIds.length !== genres.length) throw new Error("Invalid genre order.");

      const currentOrder = genres.map((genre) => genre.id);
      if (currentOrder.every((id, index) => id === uniqueIds[index])) return;

      const updates = uniqueIds.map((id, index) =>
        supabase.from("genres").update({ sort_order: index + 1 }).eq("id", id)
      );

      const results = await Promise.all(updates);
      const failed = results.find((result) => result.error);
      if (failed?.error) throw failed.error;

      await fetchGenres();
    },
    [fetchGenres, genres]
  );

  return { genres, loading, refetch: fetchGenres, addGenre, updateGenre, removeGenre, reorderGenres };
}
