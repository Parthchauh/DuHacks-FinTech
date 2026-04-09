"use client";

/**
 * StockChart — Full-featured Candlestick Chart (lightweight-charts v4)
 * =====================================================================
 * Features:
 * - Candlestick series with live price updates from Groww feed
 * - EMA 50 + EMA 100 overlays
 * - Volume histogram pane
 * - Period selector (1D → 5Y)
 * - Crosshair OHLCV tooltip
 * - Responsive + dark mode + proper cleanup
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { formatCurrency, formatCompactCurrency } from "@/lib/utils";
import { Loader2, AlertCircle, RefreshCw, TrendingUp, TrendingDown } from "lucide-react";
import type { OHLCVBar } from "@/lib/store";

// lightweight-charts v4 types
import {
    createChart,
    CrosshairMode,
    type IChartApi,
    type ISeriesApi,
    type CandlestickData,
    type HistogramData,
    type LineData,
    type UTCTimestamp,
    ColorType,
} from "lightweight-charts";

// ── Types ───────────────────────────────────────────────────────────────

interface StockChartProps {
    symbol: string;
    currentPrice: number;
    height?: number;
    showVolume?: boolean;
    showEMA?: boolean;
    onClose?: () => void;
}

interface CrosshairData {
    time: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

const PERIODS = ["1D", "1W", "1M", "3M", "6M", "1Y", "5Y"] as const;
type Period = (typeof PERIODS)[number];

const PERIOD_INTERVAL: Record<Period, string> = {
    "1D": "5m",
    "1W": "1h",
    "1M": "1d",
    "3M": "1d",
    "6M": "1d",
    "1Y": "1d",
    "5Y": "1wk",
};

// ── EMA Computation ─────────────────────────────────────────────────────

function computeEMA(
    data: OHLCVBar[],
    period: number
): Array<{ time: UTCTimestamp; value: number }> {
    if (data.length === 0) return [];
    const k = 2 / (period + 1);
    let ema = data[0].close;
    const result: Array<{ time: UTCTimestamp; value: number }> = [
        { time: data[0].time as UTCTimestamp, value: parseFloat(ema.toFixed(2)) },
    ];
    for (let i = 1; i < data.length; i++) {
        ema = data[i].close * k + ema * (1 - k);
        result.push({
            time: data[i].time as UTCTimestamp,
            value: parseFloat(ema.toFixed(2)),
        });
    }
    return result;
}

// ══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ══════════════════════════════════════════════════════════════════════════

export function StockChart({
    symbol,
    currentPrice,
    height = 400,
    showVolume = true,
    showEMA = false,
}: StockChartProps) {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
    const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
    const ema50SeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
    const ema100SeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
    const rsiSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
    const adxSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
    const barsRef = useRef<OHLCVBar[]>([]);

    const [activePeriod, setActivePeriod] = useState<Period>("1M");
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [crosshair, setCrosshair] = useState<CrosshairData | null>(null);
    const [summary, setSummary] = useState<{
        prev_close: number;
        company_name: string;
    } | null>(null);

    // Indicator Toggles
    const [visibleIndicators, setVisibleIndicators] = useState({
        ema: true,
        rsi: false,
        adx: false,
        volume: showVolume,
    });

    // ── Fetch Summary ──────────────────────────────────────────────────
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const data = await api.getChartSummary(symbol);
                if (!cancelled) {
                    setSummary({
                        prev_close: data.prev_close,
                        company_name: data.company_name,
                    });
                }
            } catch {
                // Summary is optional — chart still works without it
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [symbol]);

    // ── Initialize Chart ───────────────────────────────────────────────
    useEffect(() => {
        if (!chartContainerRef.current) return;

        const textColor = getComputedStyle(document.documentElement)
            .getPropertyValue("--color-text-secondary")
            .trim() || "#94a3b8";

        const chart = createChart(chartContainerRef.current, {
            width: chartContainerRef.current.clientWidth,
            height,
            layout: {
                background: { type: ColorType.Solid, color: "transparent" },
                textColor,
            },
            grid: {
                vertLines: { color: "rgba(128,128,128,0.08)" },
                horzLines: { color: "rgba(128,128,128,0.08)" },
            },
            crosshair: { mode: CrosshairMode.Normal },
            rightPriceScale: { borderVisible: false },
            timeScale: {
                borderVisible: false,
                timeVisible: true,
                secondsVisible: false,
            },
            handleScroll: { mouseWheel: true, pressedMouseMove: true },
            handleScale: { mouseWheel: true, pinch: true },
        });

        chartRef.current = chart;

        // Candlestick series
        const candleSeries = chart.addCandlestickSeries({
            upColor: "#26a69a",
            downColor: "#ef5350",
            borderVisible: false,
            wickUpColor: "#26a69a",
            wickDownColor: "#ef5350",
        });
        candleSeriesRef.current = candleSeries;

        // Volume histogram
        if (showVolume) {
            const volumeSeries = chart.addHistogramSeries({
                priceFormat: { type: "volume" },
                priceScaleId: "volume",
            });
            volumeSeries.priceScale().applyOptions({
                scaleMargins: { top: 0.8, bottom: 0 },
            });
            volumeSeriesRef.current = volumeSeries;
        }

        // EMA lines
        const ema50 = chart.addLineSeries({
            color: "#2196F3",
            lineWidth: 1,
            title: "EMA 50",
            crosshairMarkerVisible: false,
            visible: visibleIndicators.ema,
        });
        const ema100 = chart.addLineSeries({
            color: "#FF9800",
            lineWidth: 1,
            title: "EMA 100",
            crosshairMarkerVisible: false,
            visible: visibleIndicators.ema,
        });
        ema50SeriesRef.current = ema50;
        ema100SeriesRef.current = ema100;

        // RSI Pane (Secondary)
        const rsiSeries = chart.addLineSeries({
            color: "#9C27B0",
            lineWidth: 2,
            priceScaleId: "rsi",
            title: "RSI (14)",
            visible: visibleIndicators.rsi,
        });
        rsiSeries.priceScale().applyOptions({
            scaleMargins: { top: 0.7, bottom: 0.1 },
            borderVisible: false,
        });
        rsiSeriesRef.current = rsiSeries;

        // ADX Pane (Tertiary)
        const adxSeries = chart.addLineSeries({
            color: "#00BCD4",
            lineWidth: 2,
            priceScaleId: "adx",
            title: "ADX (14)",
            visible: visibleIndicators.adx,
        });
        adxSeries.priceScale().applyOptions({
            scaleMargins: { top: 0.85, bottom: 0.05 },
            borderVisible: false,
        });
        adxSeriesRef.current = adxSeries;

        // Crosshair move handler
        chart.subscribeCrosshairMove((param) => {
            if (!param.time || !param.seriesData) {
                setCrosshair(null);
                return;
            }
            const candleData = param.seriesData.get(candleSeries) as CandlestickData | undefined;
            if (candleData) {
                const d = new Date((candleData.time as number) * 1000);
                setCrosshair({
                    time: d.toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                    }),
                    open: candleData.open as number,
                    high: candleData.high as number,
                    low: candleData.low as number,
                    close: candleData.close as number,
                    volume: 0,
                });
            }
        });

        // Resize observer
        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const width = entry.contentRect.width;
                chart.applyOptions({ width });
            }
        });
        resizeObserver.observe(chartContainerRef.current);

        return () => {
            resizeObserver.disconnect();
            chart.remove();
            chartRef.current = null;
            candleSeriesRef.current = null;
            volumeSeriesRef.current = null;
            ema50SeriesRef.current = null;
            ema100SeriesRef.current = null;
            rsiSeriesRef.current = null;
            adxSeriesRef.current = null;
        };
    }, [height, showVolume, showEMA, visibleIndicators.ema, visibleIndicators.rsi, visibleIndicators.adx]);

    // ── Fetch OHLCV Data ───────────────────────────────────────────────
    const fetchData = useCallback(
        async (period: Period) => {
            setIsLoading(true);
            setError(null);
            try {
                const interval = PERIOD_INTERVAL[period];
                const resp = await api.getChartOHLCV(symbol, period, interval);
                const bars = resp.ohlcv;

                if (bars.length === 0) {
                    setError(`No historical data available for ${symbol}`);
                    setIsLoading(false);
                    return;
                }

                barsRef.current = bars;

                // Set candlestick data
                const candleData: CandlestickData[] = bars.map((b) => ({
                    time: b.time as UTCTimestamp,
                    open: b.open,
                    high: b.high,
                    low: b.low,
                    close: b.close,
                }));
                candleSeriesRef.current?.setData(candleData);

                // Set volume data
                if (showVolume && volumeSeriesRef.current) {
                    const volData: HistogramData[] = bars.map((b, i) => ({
                        time: b.time as UTCTimestamp,
                        value: b.volume,
                        color:
                            i > 0 && b.close >= bars[i - 1].close
                                ? "rgba(38, 166, 154, 0.5)"
                                : "rgba(239, 83, 80, 0.5)",
                    }));
                    volumeSeriesRef.current.setData(volData);
                }

                // Fetch Indicators in parallel
                const indicatorResp = await api.getChartIndicators(symbol, period);
                
                // Set EMA overlays
                if (visibleIndicators.ema && bars.length > 50) {
                    const ema50Data = indicatorResp.ema_50.map(p => ({
                        time: p.time as UTCTimestamp,
                        value: p.value
                    }));
                    const ema100Data = indicatorResp.ema_100.map(p => ({
                        time: p.time as UTCTimestamp,
                        value: p.value
                    }));
                    ema50SeriesRef.current?.setData(ema50Data);
                    ema100SeriesRef.current?.setData(ema100Data);
                }

                // Set RSI
                if (visibleIndicators.rsi) {
                    const rsiData = indicatorResp.rsi_14.map(p => ({
                        time: p.time as UTCTimestamp,
                        value: p.value
                    }));
                    rsiSeriesRef.current?.setData(rsiData);
                }

                // Set ADX
                if (visibleIndicators.adx) {
                    const adxData = indicatorResp.adx_14.map(p => ({
                        time: p.time as UTCTimestamp,
                        value: p.value
                    }));
                    adxSeriesRef.current?.setData(adxData);
                }

                chartRef.current?.timeScale().fitContent();
            } catch (err: unknown) {
                const message =
                    err instanceof Error ? err.message : "Could not load chart data";
                setError(message);
            } finally {
                setIsLoading(false);
            }
        },
        [symbol, showVolume, showEMA, visibleIndicators]
    );

    useEffect(() => {
        if (candleSeriesRef.current) {
            fetchData(activePeriod);
        }
    }, [activePeriod, fetchData]);

    // ── Live Price Update ──────────────────────────────────────────────
    useEffect(() => {
        if (!candleSeriesRef.current || !currentPrice || currentPrice === 0) return;
        const bars = barsRef.current;
        if (bars.length === 0) return;

        const lastBar = bars[bars.length - 1];
        const now = Math.floor(Date.now() / 1000);
        const sameDay =
            new Date(lastBar.time * 1000).toDateString() ===
            new Date(now * 1000).toDateString();

        if (sameDay) {
            const updated: CandlestickData = {
                time: lastBar.time as UTCTimestamp,
                open: lastBar.open,
                high: Math.max(lastBar.high, currentPrice),
                low: Math.min(lastBar.low, currentPrice),
                close: currentPrice,
            };
            candleSeriesRef.current.update(updated);

            // Also update bars ref
            bars[bars.length - 1] = {
                ...lastBar,
                high: updated.high as number,
                low: updated.low as number,
                close: currentPrice,
            };
        }
    }, [currentPrice]);

    // ── Price Change ───────────────────────────────────────────────────
    const prevClose = summary?.prev_close ?? 0;
    const priceChange = currentPrice && prevClose ? currentPrice - prevClose : 0;
    const priceChangePercent =
        prevClose > 0 ? (priceChange / prevClose) * 100 : 0;
    const isPositive = priceChange >= 0;

    // ══════════════════════════════════════════════════════════════════
    // RENDER
    // ══════════════════════════════════════════════════════════════════

    return (
        <div className="w-full">
            {/* ── Price Header ────────────────────────────────────────── */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 mb-4">
                <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                        {symbol}
                        {summary?.company_name && (
                            <span className="ml-2 text-sm font-normal text-slate-500 dark:text-slate-400">
                                {summary.company_name}
                            </span>
                        )}
                    </h3>
                    <div className="flex items-baseline gap-3 mt-1">
                        <span className="text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
                            {currentPrice > 0
                                ? `₹${currentPrice.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                : "—"}
                        </span>
                        {currentPrice > 0 && prevClose > 0 && (
                            <span
                                className={`flex items-center gap-1 text-sm font-semibold ${
                                    isPositive ? "text-green-600" : "text-red-600"
                                }`}
                            >
                                {isPositive ? (
                                    <TrendingUp className="h-3.5 w-3.5" />
                                ) : (
                                    <TrendingDown className="h-3.5 w-3.5" />
                                )}
                                {isPositive ? "+" : ""}
                                ₹{Math.abs(priceChange).toFixed(2)} (
                                {isPositive ? "+" : ""}
                                {priceChangePercent.toFixed(2)}%)
                            </span>
                        )}
                    </div>
                </div>

                {/* Crosshair Tooltip */}
                {crosshair && (
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                        <span>{crosshair.time}</span>
                        <span>
                            O:{" "}
                            <span className="text-slate-700 dark:text-slate-300">
                                ₹{crosshair.open.toLocaleString("en-IN")}
                            </span>
                        </span>
                        <span>
                            H:{" "}
                            <span className="text-green-600">
                                ₹{crosshair.high.toLocaleString("en-IN")}
                            </span>
                        </span>
                        <span>
                            L:{" "}
                            <span className="text-red-600">
                                ₹{crosshair.low.toLocaleString("en-IN")}
                            </span>
                        </span>
                        <span>
                            C:{" "}
                            <span className="text-slate-700 dark:text-slate-300">
                                ₹{crosshair.close.toLocaleString("en-IN")}
                            </span>
                        </span>
                    </div>
                )}
            </div>

            {/* ── Period Selector ─────────────────────────────────────── */}
            <div className="flex items-center gap-2 mb-3 overflow-x-auto pb-1 no-scrollbar">
                {PERIODS.map((p) => (
                    <button
                        key={p}
                        onClick={() => setActivePeriod(p)}
                        className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all flex-shrink-0 ${
                            activePeriod === p
                                ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                                : "text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-slate-300"
                        }`}
                    >
                        {p}
                    </button>
                ))}
                
                <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1 flex-shrink-0" />

                {/* Indicator Toggles */}
                {[
                    { id: 'ema', label: 'EMA', color: '#2196F3' },
                    { id: 'rsi', label: 'RSI', color: '#9C27B0' },
                    { id: 'adx', label: 'ADX', color: '#00BCD4' },
                ].map((ind) => (
                    <button
                        key={ind.id}
                        onClick={() => setVisibleIndicators(v => ({ ...v, [ind.id]: !v[ind.id as keyof typeof v] }))}
                        className={`px-2.5 py-1.5 text-[10px] font-bold rounded-lg transition-all flex-shrink-0 flex items-center gap-1.5 border ${
                            visibleIndicators[ind.id as keyof typeof visibleIndicators]
                                ? "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm"
                                : "border-transparent text-slate-400 opacity-60 grayscale"
                        }`}
                    >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: ind.color }} />
                        {ind.label}
                    </button>
                ))}
            </div>

            {/* ── Chart Container ─────────────────────────────────────── */}
            <div className="relative rounded-xl overflow-hidden border border-slate-200/50 dark:border-slate-700/50 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
                {/* Loading Overlay */}
                {isLoading && (
                    <div
                        className="absolute inset-0 z-10 flex items-center justify-center bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm"
                        style={{ height }}
                    >
                        <div className="flex flex-col items-center gap-3">
                            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                            <span className="text-sm text-slate-500">
                                Loading chart data...
                            </span>
                        </div>
                    </div>
                )}

                {/* Error Overlay */}
                {error && !isLoading && (
                    <div
                        className="absolute inset-0 z-10 flex items-center justify-center bg-white/90 dark:bg-slate-900/90"
                        style={{ height }}
                    >
                        <div className="flex flex-col items-center gap-3 text-center px-6">
                            <AlertCircle className="h-8 w-8 text-red-400" />
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                                {error}
                            </p>
                            <button
                                onClick={() => fetchData(activePeriod)}
                                className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                            >
                                <RefreshCw className="h-3.5 w-3.5" /> Retry
                            </button>
                        </div>
                    </div>
                )}

                <div ref={chartContainerRef} style={{ height }} />
            </div>
        </div>
    );
}
