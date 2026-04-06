"use client";

/**
 * OptiWealth Landing Page — Dark Vault Theme
 * ============================================
 * Premium dark-themed landing page matching the Kinetic Vault design:
 * - "Rebalance Smarter. Grow Faster." hero
 * - Navigation: Market | Portfolio | Insights + "Connect Wallet" CTA
 * - Evolution of Allocation section
 * - Visualization as Power — diamond chart section
 * - Testimonials carousel
 * - OptiWealth brand footer
 */

import Link from "next/link";
import {
    TrendingUp,
    ArrowRight,
    BarChart3,
    Shield,
    Zap,
    PieChart,
    Target,
    Download,
    Star,
    ChevronLeft,
    ChevronRight,
    Sparkles,
    RefreshCw,
    Eye,
    Brain,
    Activity,
} from "lucide-react";
import { useState } from "react";

export default function Home() {
    const [testimonialIdx, setTestimonialIdx] = useState(0);

    const testimonials = [
        {
            name: "Meera Naroo",
            role: "Portfolio Manager",
            text: `"OptiWealth's 9-stage engine has transformed how I manage my personal treasury. The rebalancing logic is as sharp as any institutional tool."`,
            stars: 5,
        },
        {
            name: "Marias Thrine",
            role: "Day Trader",
            text: `"The stress-test results are incredibly insightful. My portfolio feels less like a guesswork and more like a precision machine."`,
            stars: 5,
        },
        {
            name: "Julian Axil",
            role: "Fintech Founder",
            text: `"I used to spend hours manually rebalancing. Now I spend seconds previewing the execution. The UI is honestly a work of art."`,
            stars: 5,
        },
    ];

    return (
        <div className="min-h-screen bg-[#0a0e1a] text-white overflow-hidden relative">
            {/* ── Background Effects ──────────────────────────────── */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] bg-cyan-500/5 rounded-full blur-[140px]" />
                <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] bg-teal-500/5 rounded-full blur-[120px]" />
                <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(6,182,212,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(6,182,212,0.03)_1px,transparent_1px)] bg-[size:60px_60px]" />
            </div>

            {/* ══════════════════════════════════════════════════════
                 NAVIGATION
                 ══════════════════════════════════════════════════════ */}
            <nav className="fixed top-0 w-full z-50">
                <div className="backdrop-blur-xl bg-[#0a0e1a]/80 border-b border-slate-800/50">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
                        <Link href="/" className="flex items-center gap-3 group">
                            <div className="p-2 bg-gradient-to-br from-cyan-500 to-teal-500 rounded-lg shadow-lg shadow-cyan-500/20">
                                <TrendingUp className="h-5 w-5 text-[#0a0e1a]" />
                            </div>
                            <span className="text-lg font-bold tracking-widest text-white">
                                OptiWealth
                            </span>
                        </Link>

                        <div className="hidden md:flex items-center gap-8">
                            {["Market", "Portfolio", "Insights"].map((item) => (
                                <a
                                    key={item}
                                    href="#"
                                    className="text-sm text-slate-400 hover:text-cyan-400 transition-colors tracking-wider"
                                >
                                    {item}
                                </a>
                            ))}
                        </div>

                        <div className="flex items-center gap-3">
                            <Link
                                href="/login"
                                className="hidden sm:block text-sm text-slate-400 hover:text-cyan-400 transition-colors tracking-wider"
                            >
                                Sign In
                            </Link>
                            <Link
                                href="/register"
                                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 text-[#0a0e1a] text-sm font-bold tracking-wider shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40 hover:brightness-110 transition-all"
                            >
                                Connect Wallet
                            </Link>
                        </div>
                    </div>
                </div>
            </nav>

            {/* ══════════════════════════════════════════════════════
                 HERO SECTION
                 ══════════════════════════════════════════════════════ */}
            <section className="relative pt-32 pb-20 px-4 sm:px-6">
                <div className="max-w-4xl mx-auto text-center relative z-10">
                    {/* Badge */}
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-cyan-500/20 bg-cyan-500/5 mb-8">
                        <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
                        <span className="text-xs tracking-[0.3em] text-cyan-400 uppercase font-medium">
                            AI-Driven Rebalancing
                        </span>
                        <span className="text-xs text-slate-500">v2.0</span>
                    </div>

                    <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold leading-[1.1] mb-6">
                        <span className="bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                            Rebalance Smarter.
                        </span>
                        <br />
                        <span className="bg-gradient-to-r from-cyan-400 via-teal-400 to-emerald-400 bg-clip-text text-transparent">
                            Grow Faster.
                        </span>
                    </h1>

                    <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
                        The first algorithmic asset controller that treats your portfolio as a
                        living, breathing entity. Precision rebalancing for the modern wealth
                        builder.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Link
                            href="/register"
                            className="px-8 py-4 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 text-[#0a0e1a] font-bold tracking-wider shadow-xl shadow-cyan-500/25 hover:shadow-cyan-500/40 hover:brightness-110 active:scale-[0.98] transition-all text-sm"
                        >
                            Start Rebalancing
                        </Link>
                        <Link
                            href="/login"
                            className="px-8 py-4 rounded-xl border border-slate-700/50 text-white hover:border-cyan-500/30 hover:bg-cyan-500/5 transition-all text-sm font-semibold tracking-wider"
                        >
                            View Live Markets
                        </Link>
                    </div>

                    {/* Scroll indicator */}
                    <div className="mt-16 text-xs text-slate-600 tracking-[0.3em] uppercase animate-bounce">
                        Scroll to explore
                    </div>
                </div>
            </section>

            {/* ══════════════════════════════════════════════════════
                 EVOLUTION OF ALLOCATION
                 ══════════════════════════════════════════════════════ */}
            <section className="relative py-20 px-4 sm:px-6">
                <div className="max-w-6xl mx-auto">
                    <div className="mb-12">
                        <span className="text-[10px] tracking-[0.4em] text-cyan-400 uppercase font-bold">
                            Comparison
                        </span>
                        <h2 className="text-3xl sm:text-4xl font-bold mt-2 leading-tight">
                            The Evolution of<br />Allocation.
                        </h2>
                        <p className="text-sm text-slate-400 mt-3 max-w-md">
                            Traditional tools are static. Your capital is wild.
                            Stop letting rigidity erode your compounding power.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                        {/* Messy Allocation */}
                        <div className="rounded-2xl border border-slate-700/30 bg-[#0d1320]/60 backdrop-blur-xl p-6 hover:border-slate-600 transition-all">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20">
                                    <PieChart className="h-5 w-5 text-red-400" />
                                </div>
                                <h3 className="font-bold tracking-wider">
                                    Messy Allocation
                                </h3>
                            </div>
                            <p className="text-xs text-slate-400 mb-5 leading-relaxed">
                                Unmanaged drift, high-impact sector overweight. You&apos;re
                                making decisions using dated allocations.
                            </p>
                            {/* Stacked messy bars */}
                            <div className="space-y-2">
                                {[
                                    { w: "85%", c: "bg-red-500/60" },
                                    { w: "45%", c: "bg-amber-500/60" },
                                    { w: "70%", c: "bg-red-500/40" },
                                    { w: "30%", c: "bg-amber-500/40" },
                                ].map((bar, i) => (
                                    <div
                                        key={i}
                                        className="h-2 rounded-full bg-slate-800 overflow-hidden"
                                    >
                                        <div
                                            className={`h-full rounded-full ${bar.c}`}
                                            style={{ width: bar.w }}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Clean Rebalancing */}
                        <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 backdrop-blur-xl p-6 shadow-lg shadow-cyan-500/5">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                                    <BarChart3 className="h-5 w-5 text-cyan-400" />
                                </div>
                                <h3 className="font-bold tracking-wider">
                                    Clean Rebalancing
                                </h3>
                            </div>
                            <p className="text-xs text-slate-400 mb-5 leading-relaxed">
                                Algorithmic precision, tax-efficient allocation, risk-parity
                                weights with continuous rebalance triggers.
                            </p>
                            <div className="space-y-2">
                                {[
                                    { w: "50%", c: "bg-cyan-500" },
                                    { w: "25%", c: "bg-teal-500" },
                                    { w: "15%", c: "bg-emerald-500" },
                                    { w: "10%", c: "bg-cyan-400" },
                                ].map((bar, i) => (
                                    <div
                                        key={i}
                                        className="h-2 rounded-full bg-slate-800 overflow-hidden"
                                    >
                                        <div
                                            className={`h-full rounded-full ${bar.c}`}
                                            style={{ width: bar.w }}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ══════════════════════════════════════════════════════
                 VISUALIZATION AS POWER — DIAMOND SECTION
                 ══════════════════════════════════════════════════════ */}
            <section className="relative py-20 px-4 sm:px-6">
                <div className="max-w-5xl mx-auto text-center">
                    <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                        Visualization as Power.
                    </h2>
                    <p className="text-sm text-slate-400 max-w-xl mx-auto mb-12">
                        Watch your assets morph from a disjointed adventure to a kinetic strategy.
                        Data visualization isn&apos;t just a asset; it should be fuel.
                    </p>

                    <div className="rounded-2xl border border-cyan-500/10 bg-[#0d1320]/60 backdrop-blur-xl p-8 sm:p-10">
                        <div className="grid md:grid-cols-2 gap-8 items-center">
                            {/* Diamond visual */}
                            <div className="relative flex items-center justify-center">
                                <div className="w-48 h-48 sm:w-56 sm:h-56 relative">
                                    {/* Rotating diamond */}
                                    <div className="absolute inset-0 rotate-45 border-2 border-cyan-500/50 rounded-2xl shadow-lg shadow-cyan-500/20" />
                                    <div className="absolute inset-4 rotate-45 border-2 border-teal-500/30 rounded-xl" />
                                    <div className="absolute inset-8 rotate-45 bg-gradient-to-br from-cyan-500/10 to-teal-500/10 rounded-lg" />
                                    {/* Center value */}
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                        <span className="text-[10px] text-slate-500 tracking-widest uppercase">
                                            Portfolio Growth
                                        </span>
                                        <span className="text-3xl font-bold text-cyan-400 tabular-nums">
                                            +24.8%
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Allocation bars */}
                            <div className="space-y-6 text-left">
                                {[
                                    { label: "Equities", pct: 60, color: "bg-cyan-500" },
                                    { label: "Growth", pct: 25, color: "bg-teal-500" },
                                    { label: "Defensive", pct: 15, color: "bg-emerald-500" },
                                ].map((a, i) => (
                                    <div key={i}>
                                        <div className="flex justify-between mb-2">
                                            <span className="text-xs text-slate-400 tracking-wider uppercase">
                                                {a.label}
                                            </span>
                                            <span className="text-xs font-bold text-cyan-400 tabular-nums">
                                                {a.pct}%
                                            </span>
                                        </div>
                                        <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                                            <div
                                                className={`h-full rounded-full ${a.color} transition-all duration-1000`}
                                                style={{ width: `${a.pct}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}

                                <button className="w-full mt-4 px-6 py-3 rounded-xl border border-cyan-500/20 bg-cyan-500/5 text-cyan-400 text-xs font-bold tracking-wider uppercase hover:bg-cyan-500/10 transition-all flex items-center justify-center gap-2">
                                    <Download className="h-3.5 w-3.5" />
                                    Download Strategy Report
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ══════════════════════════════════════════════════════
                 FEATURES GRID
                 ══════════════════════════════════════════════════════ */}
            <section className="relative py-20 px-4 sm:px-6">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-14">
                        <span className="text-[10px] tracking-[0.4em] text-cyan-400 uppercase font-bold">
                            Engine Features
                        </span>
                        <h2 className="text-3xl sm:text-4xl font-bold mt-2">
                            9-Stage CFA Pipeline
                        </h2>
                        <p className="text-sm text-slate-400 mt-3 max-w-lg mx-auto">
                            Every rebalance flows through drift detection, risk parity,
                            tax optimization, factor control, stress testing, and glide path management.
                        </p>
                    </div>

                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                        {[
                            {
                                icon: Activity,
                                title: "Drift Detection",
                                desc: "Real-time portfolio drift monitoring with EMA, ADX, and RSI-based multi-signal consensus.",
                            },
                            {
                                icon: Shield,
                                title: "Risk Parity",
                                desc: "Adaptive gradient descent solver that equalizes risk contribution across all holdings.",
                            },
                            {
                                icon: Target,
                                title: "Tax-Aware Engine",
                                desc: "STCG 20%, LTCG 12.5% above ₹1.25L exemption, STT 0.1%, with tax-loss harvesting.",
                            },
                            {
                                icon: BarChart3,
                                title: "Factor Control",
                                desc: "5-factor scoring: Value, Growth, Quality, Momentum, Size — with breach alerts.",
                            },
                            {
                                icon: Zap,
                                title: "Stress Testing",
                                desc: "5 NSE-calibrated scenarios: COVID-2020, GFC-2008, Rate Hike, Nifty Correction, Taper Tantrum.",
                            },
                            {
                                icon: Brain,
                                title: "AI Summary",
                                desc: "Every rebalance report includes an AI-generated plain-English explanation of what changed and why.",
                            },
                        ].map((f, i) => (
                            <div
                                key={i}
                                className="p-6 rounded-2xl border border-slate-700/30 bg-[#0d1320]/60 backdrop-blur-xl hover:border-cyan-500/20 hover:bg-cyan-500/5 transition-all group"
                            >
                                <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 w-fit mb-4 group-hover:shadow-lg group-hover:shadow-cyan-500/10 transition-shadow">
                                    <f.icon className="h-5 w-5 text-cyan-400" />
                                </div>
                                <h3 className="text-sm font-bold tracking-wider text-white mb-2">
                                    {f.title}
                                </h3>
                                <p className="text-xs text-slate-400 leading-relaxed">
                                    {f.desc}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ══════════════════════════════════════════════════════
                 LIVE DATA BADGES
                 ══════════════════════════════════════════════════════ */}
            <section className="relative py-16 px-4 sm:px-6 border-t border-b border-slate-800/50">
                <div className="max-w-5xl mx-auto">
                    <div className="text-center mb-10">
                        <span className="text-[10px] tracking-[0.4em] text-cyan-400 uppercase font-bold">
                            Powered By
                        </span>
                        <h2 className="text-2xl font-bold mt-2">
                            Real-Time Market Data
                        </h2>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                        {[
                            {
                                icon: RefreshCw,
                                val: "< 100ms",
                                label: "Groww API Latency",
                            },
                            { icon: Eye, val: "50+", label: "Batch LTP Symbols" },
                            { icon: BarChart3, val: "5", label: "Stress Scenarios" },
                            { icon: Shield, val: "9", label: "Pipeline Stages" },
                        ].map((s, i) => (
                            <div
                                key={i}
                                className="p-5 rounded-xl border border-slate-700/30 bg-[#0d1320]/60 text-center"
                            >
                                <s.icon className="h-5 w-5 text-cyan-400 mx-auto mb-2" />
                                <p className="text-xl font-bold text-white tabular-nums">
                                    {s.val}
                                </p>
                                <p className="text-[10px] text-slate-500 tracking-wider uppercase mt-1">
                                    {s.label}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ══════════════════════════════════════════════════════
                 TESTIMONIALS
                 ══════════════════════════════════════════════════════ */}
            <section className="relative py-20 px-4 sm:px-6">
                <div className="max-w-5xl mx-auto">
                    <div className="flex items-center justify-between mb-10">
                        <div>
                            <span className="text-[10px] tracking-[0.4em] text-cyan-400 uppercase font-bold">
                                Elite Users
                            </span>
                            <h2 className="text-2xl sm:text-3xl font-bold mt-2">
                                Trusted by the Kinetic Wealthy.
                            </h2>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() =>
                                    setTestimonialIdx(
                                        (testimonialIdx - 1 + testimonials.length) %
                                            testimonials.length
                                    )
                                }
                                className="p-2 rounded-lg border border-slate-700/50 text-slate-400 hover:border-cyan-500/30 hover:text-cyan-400 transition-all"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </button>
                            <button
                                onClick={() =>
                                    setTestimonialIdx(
                                        (testimonialIdx + 1) % testimonials.length
                                    )
                                }
                                className="p-2 rounded-lg border border-slate-700/50 text-slate-400 hover:border-cyan-500/30 hover:text-cyan-400 transition-all"
                            >
                                <ChevronRight className="h-4 w-4" />
                            </button>
                        </div>
                    </div>

                    <div className="grid md:grid-cols-3 gap-5">
                        {testimonials.map((t, i) => (
                            <div
                                key={i}
                                className={`p-6 rounded-2xl border transition-all ${
                                    i === testimonialIdx
                                        ? "border-cyan-500/30 bg-cyan-500/5 shadow-lg shadow-cyan-500/5"
                                        : "border-slate-700/30 bg-[#0d1320]/60"
                                }`}
                            >
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center text-[#0a0e1a] font-bold text-sm">
                                        {t.name
                                            .split(" ")
                                            .map((n) => n[0])
                                            .join("")}
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-white">
                                            {t.name}
                                        </p>
                                        <p className="text-[10px] text-slate-500 tracking-wider">
                                            {t.role}
                                        </p>
                                    </div>
                                </div>
                                <p className="text-xs text-slate-300 leading-relaxed mb-4">
                                    {t.text}
                                </p>
                                <div className="flex gap-0.5">
                                    {Array.from({ length: t.stars }).map((_, j) => (
                                        <Star
                                            key={j}
                                            className="h-3.5 w-3.5 text-cyan-400 fill-cyan-400"
                                        />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ══════════════════════════════════════════════════════
                 FOOTER
                 ══════════════════════════════════════════════════════ */}
            <footer className="relative border-t border-slate-800/50 py-12 px-4 sm:px-6">
                <div className="max-w-5xl mx-auto text-center">
                    <div className="flex items-center justify-center gap-3 mb-6">
                        <div className="p-2 bg-gradient-to-br from-cyan-500 to-teal-500 rounded-lg">
                            <TrendingUp className="h-4 w-4 text-[#0a0e1a]" />
                        </div>
                        <span className="text-lg font-bold tracking-widest">
                            OptiWealth
                        </span>
                    </div>

                    <p className="text-xs text-slate-600 tracking-wider mb-8">
                        © 2026 OPTIWEALTH KINETIC VAULT. ALL ASSETS SECURED.
                    </p>

                    <div className="flex items-center justify-center gap-8 text-[10px] tracking-[0.3em] text-slate-600 uppercase">
                        <a href="#" className="hover:text-cyan-400 transition-colors">
                            Privacy
                        </a>
                        <a href="#" className="hover:text-cyan-400 transition-colors">
                            Security
                        </a>
                        <a href="#" className="hover:text-cyan-400 transition-colors">
                            Docs
                        </a>
                        <a href="#" className="hover:text-cyan-400 transition-colors">
                            GitHub
                        </a>
                    </div>
                </div>
            </footer>
        </div>
    );
}
