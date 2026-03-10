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

  return { genres, loading, refetch: fetchGenres };
}