"use client";

/**
 * MiniChart — Sparkline for Holdings Table Rows
 * ================================================
 * Tiny 30-day price line using lightweight-charts.
 * No axes, no tooltips — just the trend line.
 * Green if price is up from start, red if down.
 * Cached in Zustand to avoid refetching on re-renders.
 */

import { useEffect, useRef, useState } from "react";
import { createChart, ColorType, type IChartApi } from "lightweight-charts";
import { api } from "@/lib/api";
import { usePortfolioStore } from "@/lib/store";

interface MiniChartProps {
    symbol: string;
    currentPrice: number;
    width?: number;
    height?: number;
    onClick?: () => void;
}

export function MiniChart({
    symbol,
    currentPrice,
    width = 120,
    height = 40,
    onClick,
}: MiniChartProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const [loaded, setLoaded] = useState(false);
    const { getOHLCVCache, setOHLCVCache } = usePortfolioStore();

    useEffect(() => {
        if (!containerRef.current) return;

        const chart = createChart(containerRef.current, {
            width,
            height,
            layout: {
                background: { type: ColorType.Solid, color: "transparent" },
                textColor: "transparent",
            },
            grid: {
                vertLines: { visible: false },
                horzLines: { visible: false },
            },
            rightPriceScale: { visible: false },
            timeScale: { visible: false },
            crosshair: {
                vertLine: { visible: false },
                horzLine: { visible: false },
            },
            handleScroll: false,
            handleScale: false,
        });

        chartRef.current = chart;

        const lineSeries = chart.addLineSeries({
            lineWidth: 2,
            crosshairMarkerVisible: false,
            priceLineVisible: false,
            lastValueVisible: false,
        });

        // Load data (from cache or API)
        (async () => {
            let bars = getOHLCVCache(symbol);
            if (!bars) {
                try {
                    const resp = await api.getChartOHLCV(symbol, "1M", "1d");
                    bars = resp.ohlcv;
                    if (bars.length > 0) {
                        setOHLCVCache(symbol, bars);
                    }
                } catch {
                    return;
                }
            }

            if (!bars || bars.length === 0) return;

            const closes = bars.map((b) => ({
                time: b.time as any,
                value: b.close,
            }));

            // Determine color: green if current > first, red if below
            const firstClose = closes[0].value;
            const lastClose = currentPrice > 0 ? currentPrice : closes[closes.length - 1].value;
            const isUp = lastClose >= firstClose;

            lineSeries.applyOptions({
                color: isUp ? "#26a69a" : "#ef5350",
            });

            lineSeries.setData(closes);
            chart.timeScale().fitContent();
            setLoaded(true);
        })();

        return () => {
            chart.remove();
            chartRef.current = null;
        };
    }, [symbol, currentPrice, width, height, getOHLCVCache, setOHLCVCache]);

    return (
        <div
            ref={containerRef}
            onClick={onClick}
            className={`cursor-pointer transition-opacity ${loaded ? "opacity-100" : "opacity-30"}`}
            style={{ width, height }}
            title={`${symbol} — 30-day trend`}
        />
    );
}
