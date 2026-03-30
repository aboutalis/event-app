/**
 * HOOK: useInfiniteScroll
 * Generic infinite scroll with pagination
 */

import { useState, useEffect, useCallback } from 'react';
import { useInView } from 'react-intersection-observer';

interface UseInfiniteScrollOptions<T> {
  fetchFn: (offset: number, limit: number) => Promise<T[]>;
  pageSize?: number;
  enabled?: boolean;
}

export function useInfiniteScroll<T>({
  fetchFn,
  pageSize = 20,
  enabled = true,
}: UseInfiniteScrollOptions<T>) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { ref, inView } = useInView({
    threshold: 0,
    triggerOnce: false,
  });

  const loadMore = useCallback(async () => {
    if (loading || !hasMore || !enabled) return;

    setLoading(true);
    setError(null);

    try {
      const newItems = await fetchFn(items.length, pageSize);

      if (newItems.length === 0) {
        setHasMore(false);
      } else {
        setItems(prev => {
          // Filter out any duplicates from newItems
          const filteredNew = newItems.filter(newItem => {
            const newId = (newItem as any).id;
            if (!newId) return true; // Keep items without IDs
            const isDuplicate = prev.some(existingItem => {
              const existingId = (existingItem as any).id;
              return existingId && existingId === newId;
            });
            if (isDuplicate) {
              console.log('loadMore: Duplicate detected, skipping:', newId);
            }
            return !isDuplicate;
          });
          return [...prev, ...filteredNew];
        });
        if (newItems.length < pageSize) {
          setHasMore(false);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [fetchFn, items.length, pageSize, loading, hasMore, enabled]);

  // Load more when sentinel comes into view
  useEffect(() => {
    if (inView && enabled) {
      loadMore();
    }
  }, [inView, loadMore, enabled]);

  // Load initial data
  useEffect(() => {
    if (enabled && items.length === 0 && !loading) {
      loadMore();
    }
  }, [enabled]); // eslint-disable-line react-hooks/exhaustive-deps

  const refresh = useCallback(() => {
    setItems([]);
    setHasMore(true);
    setError(null);
  }, []);

  const addItem = useCallback((item: T & { id?: string }) => {
    setItems(prev => {
      // Check if item already exists (by id)
      if (item.id) {
        const exists = prev.some(existingItem => {
          const existingId = (existingItem as any).id;
          return existingId && existingId === item.id;
        });
        if (exists) {
          console.log('Duplicate detected, not adding:', item.id);
          return prev; // Don't add duplicate
        }
      }
      console.log('Adding new item:', item.id);
      return [item, ...prev];
    });
  }, []);

  return {
    items,
    loading,
    hasMore,
    error,
    ref, // Attach to sentinel element
    refresh,
    addItem,
  };
}
