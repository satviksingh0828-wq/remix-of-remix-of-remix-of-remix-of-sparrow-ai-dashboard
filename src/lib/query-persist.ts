import { QueryClient } from "@tanstack/react-query";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { get, set, del } from "idb-keyval";

/**
 * IndexedDB-backed cache for react-query. Persisted across reloads so lists that
 * already loaded once appear instantly on the next visit; a background refetch
 * keeps them fresh.
 */
export function createIdbPersister() {
  return createAsyncStoragePersister({
    storage: {
      getItem: async (key: string) => (await get(key)) ?? null,
      setItem: async (key: string, value: string) => {
        await set(key, value);
      },
      removeItem: async (key: string) => {
        await del(key);
      },
    },
    key: "app-query-cache",
    throttleTime: 1000,
  });
}

export const DEFAULT_QUERY_OPTIONS = {
  queries: {
    // keep list data considered fresh for 30s (avoid double-fetch on quick renav)
    staleTime: 30_000,
    // hold cache in memory 30m; IDB persister mirrors it across reloads
    gcTime: 30 * 60_000,
    refetchOnWindowFocus: false,
    retry: 1,
  },
};

export function makeQueryClient() {
  return new QueryClient({ defaultOptions: DEFAULT_QUERY_OPTIONS });
}
