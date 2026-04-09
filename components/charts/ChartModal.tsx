"use client";

/**
 * ChartModal — Stock Detail Modal with Tabs
 * ============================================
 * Full-screen on mobile, large centered modal on desktop.
 * Three tabs: Chart | Fundamentals | Rebalancing Signals
 */

import { useEffect, useState, useCallback } from "react";
import { StockChart } from "./StockChart";
import { api } from "@/lib/api";
import { formatCompactCurrency } from "@/lib/utils";
import {
    X,
    BarChart3,
    Info,
    Activity,
    TrendingUp,
    TrendingDown,
    Loader2,
} from "lucide-react";

interface ChartModalProps {
    symbol: string;
    companyName?: string;
    currentPrice: number;
    isOpen: boolean;
    onClose: () => void;
}

type Tab = "chart" | "fundamentals" | "signals";

interface StockSummary {
    symbol: string;
    company_name: string;
    current_price: number;
    prev_close: number;
    day_high: number;
    day_low: number;
    week_52_high: number;
    week_52_low: number;
    market_cap: number;
    pe_ratio: number;
    sector: string;
    volume: number;
}

interface TechnicalSignals {
    rsi: { signal: 'buy' | 'sell' | 'neutral'; text: string; value: number };
    ema: { signal: 'buy' | 'sell' | 'neutral'; text: string };
    trend: { strength: string; value: number };
    levels: { support: number; resistance: number };
}

export function ChartModal({
    symbol,
    companyName,
    currentPrice,
    isOpen,
    onClose,
}: ChartModalProps) {
    const [activeTab, setActiveTab] = useState<Tab>("chart");
    const [summary, setSummary] = useState<StockSummary | null>(null);
    const [loadingSummary, setLoadingSummary] = useState(false);
    const [indicators, setIndicators] = useState<any>(null);
    const [signals, setSignals] = useState<TechnicalSignals | null>(null);

    // ── Fetch Summary & Indicators ──────────────────────────────────────────
    useEffect(() => {
        if (!isOpen || !symbol) return;
        let cancelled = false;

        const fetchData = async () => {
            setLoadingSummary(true);
            try {
                const [summaryData, indicatorData] = await Promise.all([
                    api.getChartSummary(symbol).catch(() => null),
                    api.getChartIndicators(symbol, '1M').catch(() => null)
                ]);

                if (cancelled) return;

                if (summaryData) setSummary(summaryData);
                if (indicatorData) {
                    setIndicators(indicatorData);
                    
                    // Simple Signal Logic
                    const lastRsi = indicatorData.rsi_14[indicatorData.rsi_14.length - 1]?.value || 50;
                    const lastEma50 = indicatorData.ema_50[indicatorData.ema_50.length - 1]?.value || 0;
                    const lastEma100 = indicatorData.ema_100[indicatorData.ema_100.length - 1]?.value || 0;
                    const lastAdx = indicatorData.adx_14[indicatorData.adx_14.length - 1]?.value || 0;

                    const rsiSig: TechnicalSignals['rsi'] = 
                        lastRsi > 70 ? { signal: 'sell', text: 'Overbought', value: lastRsi } :
                        lastRsi < 30 ? { signal: 'buy', text: 'Oversold', value: lastRsi } :
                        { signal: 'neutral', text: 'Neutral', value: lastRsi };

                    const emaSig: TechnicalSignals['ema'] = 
                        lastEma50 > lastEma100 ? { signal: 'buy', text: 'Bullish Crossover' } :
                        lastEma50 < lastEma100 ? { signal: 'sell', text: 'Bearish Crossover' } :
                        { signal: 'neutral', text: 'Consolidating' };

                    const trendSig: TechnicalSignals['trend'] = {
                        strength: lastAdx > 25 ? 'Strong Trend' : 'Weak/No Trend',
                        value: lastAdx
                    };

                    setSignals({
                        rsi: rsiSig,
                        ema: emaSig,
                        trend: trendSig,
                        levels: {
                            support: indicatorData.support,
                            resistance: indicatorData.resistance
                        }
                    });
                }
            } catch (err) {
                console.error("Failed to fetch modal data:", err);
            } finally {
                if (!cancelled) setLoadingSummary(false);
            }
        };

        fetchData();
        return () => { cancelled = true; };
    }, [isOpen, symbol]);

    // ESC key handler
    useEffect(() => {
        if (!isOpen) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [isOpen, onClose]);

    // Prevent body scroll when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }
        return () => {
            document.body.style.overflow = "";
        };
    }, [isOpen]);

    if (!isOpen) return null;

    const displayName = companyName || summary?.company_name || symbol;
    const priceChange =
        summary && currentPrice
            ? currentPrice - summary.prev_close
            : 0;
    const priceChangePercent =
        summary && summary.prev_close > 0
            ? (priceChange / summary.prev_close) * 100
            : 0;
    const isPositive = priceChange >= 0;

    const tabs: Array<{ id: Tab; label: string; icon: typeof BarChart3 }> = [
        { id: "chart", label: "Chart", icon: BarChart3 },
        { id: "fundamentals", label: "Fundamentals", icon: Info },
        { id: "signals", label: "Signals", icon: Activity },
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative z-10 w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-5xl sm:mx-4 bg-white dark:bg-slate-900 sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col">
                {/* ── Header ──────────────────────────────────────────── */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200/50 dark:border-slate-700/50">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                            <span className="text-white text-xs font-bold">
                                {symbol.slice(0, 2)}
                            </span>
                        </div>
                        <div className="min-w-0">
                            <h2 className="text-base font-bold text-slate-900 dark:text-white truncate">
                                {displayName}
                            </h2>
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                                    NSE: {symbol}
                                </span>
                                {currentPrice > 0 && (
                                    <span
                                        className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                            isPositive
                                                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                                : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                        }`}
                                    >
                                        {isPositive ? (
                                            <TrendingUp className="h-2.5 w-2.5" />
                                        ) : (
                                            <TrendingDown className="h-2.5 w-2.5" />
                                        )}
                                        {isPositive ? "+" : ""}
                                        {priceChangePercent.toFixed(2)}%
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="flex-shrink-0 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                        <X className="h-5 w-5 text-slate-500" />
                    </button>
                </div>

                {/* ── Tabs ─────────────────────────────────────────────── */}
                <div className="flex gap-1 px-5 py-2 border-b border-slate-100 dark:border-slate-800">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
                                activeTab === tab.id
                                    ? "bg-blue-600 text-white shadow-sm"
                                    : "text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-slate-300"
                            }`}
                        >
                            <tab.icon className="h-3.5 w-3.5" />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* ── Content ──────────────────────────────────────────── */}
                <div className="flex-1 overflow-y-auto p-5">
                    {/* Tab 1: Chart */}
                    {activeTab === "chart" && (
                        <StockChart
                            symbol={symbol}
                            currentPrice={currentPrice}
                            height={450}
                            showEMA={true}
                            showVolume={true}
                        />
                    )}

                    {/* Tab 2: Fundamentals */}
                    {activeTab === "fundamentals" && (
                        <div>
                            {loadingSummary ? (
                                <div className="flex items-center justify-center py-20">
                                    <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                                </div>
                            ) : summary ? (
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                    {[
                                        {
                                            label: "Market Cap",
                                            value: formatCompactCurrency(summary.market_cap),
                                        },
                                        {
                                            label: "P/E Ratio",
                                            value: summary.pe_ratio > 0 ? summary.pe_ratio.toFixed(2) : "N/A",
                                        },
                                        {
                                            label: "52W High",
                                            value: `₹${summary.week_52_high.toLocaleString("en-IN")}`,
                                        },
                                        {
                                            label: "52W Low",
                                            value: `₹${summary.week_52_low.toLocaleString("en-IN")}`,
                                        },
                                        {
                                            label: "Day High",
                                            value: `₹${summary.day_high.toLocaleString("en-IN")}`,
                                        },
                                        {
                                            label: "Day Low",
                                            value: `₹${summary.day_low.toLocaleString("en-IN")}`,
                                        },
                                        {
                                            label: "Volume",
                                            value: summary.volume.toLocaleString("en-IN"),
                                        },
                                        {
                                            label: "Sector",
                                            value: summary.sector,
                                        },
                                    ].map((metric) => (
                                        <div
                                            key={metric.label}
                                            className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50"
                                        >
                                            <p className="text-[10px] font-semibold tracking-widest text-slate-400 uppercase mb-1">
                                                {metric.label}
                                            </p>
                                            <p className="text-sm font-bold text-slate-900 dark:text-white">
                                                {metric.value}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-center text-slate-500 py-10">
                                    Could not load fundamentals data.
                                </p>
                            )}

                            {/* 52-Week Range Visual */}
                            {summary && summary.week_52_low > 0 && (
                                <div className="mt-6 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50">
                                    <p className="text-[10px] font-semibold tracking-widest text-slate-400 uppercase mb-3">
                                        52-Week Range
                                    </p>
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs font-bold text-red-600">
                                            ₹{summary.week_52_low.toLocaleString("en-IN")}
                                        </span>
                                        <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden relative">
                                            <div
                                                className="absolute inset-y-0 left-0 bg-gradient-to-r from-red-500 via-amber-500 to-green-500 rounded-full"
                                                style={{
                                                    width: `${Math.min(
                                                        100,
                                                        ((currentPrice - summary.week_52_low) /
                                                            (summary.week_52_high - summary.week_52_low)) *
                                                            100
                                                    )}%`,
                                                }}
                                            />
                                            {/* Current position marker */}
                                            <div
                                                className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white border-2 border-blue-600 rounded-full shadow-sm"
                                                style={{
                                                    left: `${Math.min(
                                                        100,
                                                        ((currentPrice - summary.week_52_low) /
                                                            (summary.week_52_high - summary.week_52_low)) *
                                                            100
                                                    )}%`,
                                                    transform: "translate(-50%, -50%)",
                                                }}
                                            />
                                        </div>
                                        <span className="text-xs font-bold text-green-600">
                                            ₹{summary.week_52_high.toLocaleString("en-IN")}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === "signals" && (
                        <div className="space-y-6">
                            {loadingSummary ? (
                                <div className="flex items-center justify-center py-20">
                                    <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                                </div>
                            ) : signals ? (
                                <>
                                    {/* Primary Sentiment Signal */}
                                    <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800/50 dark:to-slate-900/50 border border-slate-100 dark:border-slate-700/50">
                                        <div className="flex items-center justify-between mb-6">
                                            <div>
                                                <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400">Trend Analysis</h4>
                                                <p className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                                                    {signals.ema.text}
                                                </p>
                                            </div>
                                            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                                                signals.ema.signal === 'buy' ? 'bg-green-100 text-green-600' : 
                                                signals.ema.signal === 'sell' ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-600'
                                            }`}>
                                                <Activity className="h-6 w-6" />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            {/* RSI Signal */}
                                            <div className="p-4 rounded-xl bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700">
                                                <div className="flex justify-between items-center mb-2">
                                                    <span className="text-xs font-semibold text-slate-500">RSI (14)</span>
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                                        signals.rsi.signal === 'buy' ? 'bg-green-100 text-green-700' :
                                                        signals.rsi.signal === 'sell' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'
                                                    }`}>
                                                        {signals.rsi.text}
                                                    </span>
                                                </div>
                                                <p className="text-xl font-bold dark:text-white">{signals.rsi.value.toFixed(1)}</p>
                                                <div className="mt-2 h-1.5 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                                    <div className={`h-full rounded-full transition-all duration-1000 ${
                                                        signals.rsi.value > 70 ? 'bg-red-500' : 
                                                        signals.rsi.value < 30 ? 'bg-green-500' : 'bg-blue-500'
                                                    }`} style={{ width: `${signals.rsi.value}%` }} />
                                                </div>
                                            </div>

                                            {/* ADX Signal */}
                                            <div className="p-4 rounded-xl bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700">
                                                <div className="flex justify-between items-center mb-2">
                                                    <span className="text-xs font-semibold text-slate-500">ADX (Trend)</span>
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase">{signals.trend.strength}</span>
                                                </div>
                                                <p className="text-xl font-bold dark:text-white">{signals.trend.value.toFixed(1)}</p>
                                                <p className="text-[10px] text-slate-400 mt-1">&gt; 25 indicates strong directional movement</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Support & Resistance */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase mb-1">Pivot Support</span>
                                            <p className="text-sm font-bold text-slate-900 dark:text-white">₹{signals.levels.support.toLocaleString('en-IN')}</p>
                                        </div>
                                        <div className="p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase mb-1">Pivot Resistance</span>
                                            <p className="text-sm font-bold text-slate-900 dark:text-white">₹{signals.levels.resistance.toLocaleString('en-IN')}</p>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="p-10 text-center opacity-50">
                                    <Activity className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                                    <p className="text-sm">No signals available for {symbol}</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
