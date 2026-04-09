/**
 * useLivePrices — Real-time price polling hook
 * =============================================
 * Polls the backend /api/charts/prices/live endpoint every 30 seconds
 * and syncs results into the Zustand store's `prices` map.
 *
 * Features:
 * - Auto-polls on mount with 30s interval (configurable)
 * - Pauses when tab is hidden (Page Visibility API) — saves API quota
 * - Deduplicates symbols (only fetches each ticker once per poll cycle)
 * - Populates store.prices for any component that needs <ticker> → price
 * - Graceful degradation: if fetch fails, existing prices stay unchanged
 *
 * Usage:
 *   // In any component that needs live prices for current holdings:
 *   useLivePrices();
 *
 *   // Or with custom symbols:
 *   useLivePrices({ symbols: ['RELIANCE', 'TCS'], intervalMs: 10000 });
 *
 *   // Then in component:
 *   const { prices } = usePortfolioStore();
 *   const relPrice = prices['RELIANCE']; // always fresh
 */

'use client';

import { useEffect, useRef, useCallback } from 'react';
import { api } from '@/lib/api';
import { usePortfolioStore } from '@/lib/store';

interface UseLivePricesOptions {
    /** Explicit list of symbols to poll. Defaults to all current holdings. */
    symbols?: string[];
    /** Polling interval in ms. Default: 30_000 (30 seconds). */
    intervalMs?: number;
    /** Whether to start paused. Default: false. */
    paused?: boolean;
}

export function useLivePrices(options: UseLivePricesOptions = {}): void {
    const { intervalMs = 30_000, paused = false, symbols: explicitSymbols } = options;

    const holdings = usePortfolioStore((s) => s.holdings);
    const setPrices = usePortfolioStore.getState;
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const isMountedRef = useRef(true);

    const fetchPrices = useCallback(async () => {
        // Determine symbols to fetch
        const symbols: string[] = explicitSymbols && explicitSymbols.length > 0
            ? explicitSymbols
            : holdings.map((h) => h.ticker);

        if (symbols.length === 0) return;

        // Deduplicate
        const uniqueSymbols = [...new Set(symbols.map((s) => s.toUpperCase()))];

        try {
            const response = await api.getChartLivePrices(uniqueSymbols);
            if (!isMountedRef.current) return;

            if (response && response.prices) {
                const store = usePortfolioStore.getState();
                const current = store.prices;
                // Merge new prices with existing — never wipe a price for a symbol
                // that wasn't in this batch (preserves prices from other streams)
                const merged: Record<string, number> = { ...current };
                for (const [sym, price] of Object.entries(response.prices)) {
                    if (typeof price === 'number' && price > 0) {
                        merged[sym] = price;
                    }
                }
                usePortfolioStore.setState({ prices: merged });
            }
        } catch {
            // Silently ignore price fetch failures — stale prices are fine
        }
    }, [holdings, explicitSymbols]);

    useEffect(() => {
        isMountedRef.current = true;

        if (paused) return;

        // Fetch immediately on mount
        fetchPrices();

        // Set up polling interval
        intervalRef.current = setInterval(fetchPrices, intervalMs);

        // Pause when tab is hidden — saves API quota (Page Visibility API)
        const handleVisibilityChange = () => {
            if (document.hidden) {
                if (intervalRef.current) {
                    clearInterval(intervalRef.current);
                    intervalRef.current = null;
                }
            } else {
                // Tab is visible again — fetch immediately then resume polling
                fetchPrices();
                intervalRef.current = setInterval(fetchPrices, intervalMs);
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            isMountedRef.current = false;
            if (intervalRef.current) clearInterval(intervalRef.current);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [fetchPrices, intervalMs, paused]);
}
