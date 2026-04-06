"use client";

/**
 * RebalancingDrawer — Full rebalancing report in a side drawer
 * ==============================================================
 * Shows the complete pipeline output:
 *  - AI summary
 *  - Drift signals with DriftIndicator
 *  - Trade list
 *  - Factor alerts
 *  - Stress test results
 *  - Harvest opportunities
 *  - Cost of inaction
 */

import { useState } from "react";
import {
    Activity,
    AlertTriangle,
    ArrowDown,
    ArrowUp,
    BarChart3,
    ChevronDown,
    ChevronUp,
    Flame,
    Leaf,
    Lightbulb,
    LineChart,
    Shield,
    Sparkles,
    X,
    Zap,
} from "lucide-react";
import DriftIndicator from "./DriftIndicator";

interface Signal {
    symbol: string;
    action: string;
    drift: number;
    confidence: number;
    reason: string;
    priority: number;
    current_weight?: number;
    target_weight?: number;
}

interface Trade {
    symbol: string;
    action: "BUY" | "SELL";
    quantity: number;
    estimated_value: number;
    current_price: number;
    reason: string;
    priority: number;
}

interface FactorAlert {
    factor: string;
    current_exposure: number;
    limit: number;
    breach_pct: number;
    top_contributors: string[];
    recommendation: string;
}

interface HarvestOpp {
    symbol: string;
    unrealized_loss: number;
    tax_saving_estimate: number;
    replacement_symbol: string;
    wash_sale_safe: boolean;
}

interface StressTest {
    worst_case_scenario: string;
    worst_case_loss_pct: number;
    worst_case_loss_inr: number;
    stress_triggered_reduces: string[];
}

interface RebalancingReport {
    ai_summary: string;
    total_drift_score: number;
    trades: Trade[];
    trades_buy_count: number;
    trades_sell_count: number;
    estimated_tax_liability: number;
    estimated_tax_savings: number;
    cost_of_inaction: number;
    factor_alerts: FactorAlert[];
    harvest_opportunities: HarvestOpp[];
    stress_test?: StressTest;
    signals?: Signal[];
}

interface RebalancingDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    report: RebalancingReport | null;
    onExecuteTrades: () => void;
}

function Section({
    title,
    icon: Icon,
    children,
    defaultOpen = true,
    badge,
}: {
    title: string;
    icon: any;
    children: React.ReactNode;
    defaultOpen?: boolean;
    badge?: React.ReactNode;
}) {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div className="border-b border-slate-800/50 last:border-0">
            <button
                onClick={() => setOpen(!open)}
                className="w-full flex items-center justify-between py-4 group"
            >
                <div className="flex items-center gap-2.5">
                    <Icon className="h-4 w-4 text-cyan-400" />
                    <span className="text-xs font-bold tracking-widest text-white uppercase">
                        {title}
                    </span>
                    {badge}
                </div>
                {open ? (
                    <ChevronUp className="h-4 w-4 text-slate-600" />
                ) : (
                    <ChevronDown className="h-4 w-4 text-slate-600" />
                )}
            </button>
            {open && <div className="pb-4">{children}</div>}
        </div>
    );
}

export default function RebalancingDrawer({
    isOpen,
    onClose,
    report,
    onExecuteTrades,
}: RebalancingDrawerProps) {
    if (!isOpen || !report) return null;

    return (
        <div className="fixed inset-0 z-50 flex">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-[#0a0e1a]/85 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Drawer Panel */}
            <div className="absolute right-0 top-0 bottom-0 w-full max-w-lg bg-[#0d1320] border-l border-cyan-500/10 shadow-2xl shadow-cyan-500/10 overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 z-10 flex items-center justify-between p-5 border-b border-slate-800/50 bg-[#0d1320]/95 backdrop-blur-sm">
                    <div>
                        <h2 className="text-base font-bold tracking-wider text-white uppercase">
                            Rebalancing Report
                        </h2>
                        <p className="text-xs text-slate-500 tracking-wider mt-0.5">
                            {report.trades.length} trades recommended
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-slate-800 transition-colors"
                    >
                        <X className="h-5 w-5 text-slate-400" />
                    </button>
                </div>

                <div className="p-5 space-y-0">
                    {/* ── AI Summary ──────────────────────────── */}
                    <Section title="AI Analysis" icon={Sparkles}>
                        <div className="p-4 rounded-xl bg-cyan-500/5 border border-cyan-500/15">
                            <p className="text-sm text-slate-300 leading-relaxed">
                                {report.ai_summary}
                            </p>
                        </div>
                    </Section>

                    {/* ── Cost of Inaction ────────────────────── */}
                    {report.cost_of_inaction > 0 && (
                        <Section title="Cost of Inaction" icon={Flame}>
                            <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/15">
                                <p className="text-xs text-slate-400 mb-1 tracking-wider">
                                    Estimated annual cost of not rebalancing
                                </p>
                                <p className="text-2xl font-bold text-red-400 tabular-nums">
                                    ₹
                                    {report.cost_of_inaction.toLocaleString(
                                        "en-IN",
                                        { maximumFractionDigits: 0 }
                                    )}
                                </p>
                            </div>
                        </Section>
                    )}

                    {/* ── Drift Signals ───────────────────────── */}
                    {report.signals && report.signals.length > 0 && (
                        <Section
                            title="Drift Signals"
                            icon={Activity}
                            badge={
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 tabular-nums">
                                    {report.signals.length}
                                </span>
                            }
                        >
                            <div className="space-y-1">
                                {report.signals.map((sig, i) => (
                                    <DriftIndicator
                                        key={i}
                                        symbol={sig.symbol}
                                        currentWeight={sig.current_weight || 0}
                                        targetWeight={sig.target_weight || 0}
                                        driftPct={sig.drift}
                                        action={sig.action}
                                    />
                                ))}
                            </div>
                        </Section>
                    )}

                    {/* ── Proposed Trades ─────────────────────── */}
                    <Section
                        title="Proposed Trades"
                        icon={BarChart3}
                        badge={
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 tabular-nums">
                                {report.trades.length}
                            </span>
                        }
                    >
                        <div className="space-y-2">
                            {report.trades.map((t, i) => (
                                <div
                                    key={i}
                                    className="p-3 rounded-xl bg-[#0a0e1a] border border-slate-700/30"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            {t.action === "BUY" ? (
                                                <ArrowUp className="h-3.5 w-3.5 text-cyan-400" />
                                            ) : (
                                                <ArrowDown className="h-3.5 w-3.5 text-amber-400" />
                                            )}
                                            <span className="text-xs font-bold text-white tracking-wider">
                                                {t.symbol}
                                            </span>
                                            <span
                                                className={`text-[10px] font-semibold tracking-wider ${
                                                    t.action === "BUY"
                                                        ? "text-cyan-400"
                                                        : "text-amber-400"
                                                }`}
                                            >
                                                {t.action}
                                            </span>
                                        </div>
                                        <span className="text-xs font-bold text-white tabular-nums">
                                            ₹
                                            {t.estimated_value.toLocaleString(
                                                "en-IN",
                                                { maximumFractionDigits: 0 }
                                            )}
                                        </span>
                                    </div>
                                    <p className="text-[10px] text-slate-500 mt-1 truncate">
                                        {t.quantity} shares @ ₹
                                        {t.current_price.toFixed(2)}
                                    </p>
                                </div>
                            ))}
                        </div>

                        {/* Tax summary */}
                        <div className="mt-3 p-3 rounded-xl bg-[#0a0e1a] border border-slate-700/30 flex items-center justify-between">
                            <span className="text-xs text-slate-500 tracking-wider">
                                Est. Tax Liability
                            </span>
                            <span className="text-xs font-bold text-amber-400 tabular-nums">
                                ₹
                                {report.estimated_tax_liability.toLocaleString(
                                    "en-IN",
                                    { maximumFractionDigits: 0 }
                                )}
                            </span>
                        </div>
                    </Section>

                    {/* ── Factor Alerts ───────────────────────── */}
                    {report.factor_alerts.length > 0 && (
                        <Section
                            title="Factor Alerts"
                            icon={AlertTriangle}
                            defaultOpen={false}
                        >
                            <div className="space-y-2">
                                {report.factor_alerts.map((fa, i) => (
                                    <div
                                        key={i}
                                        className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/15"
                                    >
                                        <div className="flex justify-between mb-1">
                                            <span className="text-xs font-bold text-amber-400 tracking-wider uppercase">
                                                {fa.factor}
                                            </span>
                                            <span className="text-[10px] text-amber-400 tabular-nums">
                                                {(fa.current_exposure * 100).toFixed(1)}% /
                                                {(fa.limit * 100).toFixed(0)}%
                                            </span>
                                        </div>
                                        <p className="text-[10px] text-slate-400">
                                            {fa.recommendation}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </Section>
                    )}

                    {/* ── Stress Test ─────────────────────────── */}
                    {report.stress_test && (
                        <Section
                            title="Stress Test"
                            icon={Shield}
                            defaultOpen={false}
                        >
                            <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/15">
                                <p className="text-xs text-slate-400 tracking-wider mb-2">
                                    Worst case:{" "}
                                    <span className="text-white font-semibold">
                                        {report.stress_test.worst_case_scenario.replace(
                                            /_/g,
                                            " "
                                        )}
                                    </span>
                                </p>
                                <p className="text-xl font-bold text-red-400 tabular-nums">
                                    {(
                                        report.stress_test.worst_case_loss_pct *
                                        100
                                    ).toFixed(1)}
                                    % drawdown
                                </p>
                                <p className="text-xs text-slate-500 tabular-nums">
                                    ₹
                                    {report.stress_test.worst_case_loss_inr.toLocaleString(
                                        "en-IN",
                                        { maximumFractionDigits: 0 }
                                    )}{" "}
                                    potential loss
                                </p>
                            </div>
                        </Section>
                    )}

                    {/* ── Harvest Opportunities ──────────────── */}
                    {report.harvest_opportunities.length > 0 && (
                        <Section
                            title="Tax Loss Harvest"
                            icon={Leaf}
                            defaultOpen={false}
                            badge={
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 tabular-nums">
                                    ₹
                                    {report.estimated_tax_savings.toLocaleString(
                                        "en-IN",
                                        { maximumFractionDigits: 0 }
                                    )}{" "}
                                    saving
                                </span>
                            }
                        >
                            <div className="space-y-2">
                                {report.harvest_opportunities.map((h, i) => (
                                    <div
                                        key={i}
                                        className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/15"
                                    >
                                        <div className="flex justify-between mb-1">
                                            <span className="text-xs font-bold text-white">
                                                {h.symbol}
                                            </span>
                                            <span className="text-xs text-emerald-400 font-bold tabular-nums">
                                                Save ₹
                                                {h.tax_saving_estimate.toLocaleString(
                                                    "en-IN",
                                                    {
                                                        maximumFractionDigits: 0,
                                                    }
                                                )}
                                            </span>
                                        </div>
                                        <p className="text-[10px] text-slate-400">
                                            Replace with {h.replacement_symbol}
                                            {h.wash_sale_safe
                                                ? " ✓ Wash-sale safe"
                                                : " ⚠ Recent purchase within 30d"}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </Section>
                    )}
                </div>

                {/* ── Sticky Footer CTA ──────────────────────── */}
                {report.trades.length > 0 && (
                    <div className="sticky bottom-0 p-5 bg-[#0d1320]/95 backdrop-blur-sm border-t border-slate-800/50">
                        <button
                            onClick={onExecuteTrades}
                            className="w-full py-3.5 text-xs font-bold tracking-[0.25em] uppercase rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 text-[#0a0e1a] shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/35 hover:brightness-110 active:scale-[0.98] transition-all"
                        >
                            Execute {report.trades.length} Trades via Groww
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
