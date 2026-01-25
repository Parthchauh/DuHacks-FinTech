"use client";

/**
 * OptiWealth Landing Page
 * =======================
 * Premium light-themed landing page with:
 * - Clean white background with subtle gradients
 * - Glassmorphism cards and panels
 * - Neumorphism buttons and interactive elements
 * - Electro glow border effects
 * - Human-friendly, authentic copy
 * - Smooth micro-animations
 */

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { ArrowRight, TrendingUp, ShieldCheck, Zap, BarChart3, PieChart, Target, CheckCircle, Sparkles, ArrowUpRight } from "lucide-react";

export default function Home() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 text-slate-900 overflow-hidden relative">
            {/* Subtle Background Elements */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                {/* Soft gradient orbs */}
                <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] bg-gradient-to-br from-blue-100/40 to-indigo-100/20 rounded-full blur-3xl" />
                <div className="absolute bottom-[-30%] left-[-10%] w-[600px] h-[600px] bg-gradient-to-tr from-purple-100/30 to-pink-100/10 rounded-full blur-3xl" />
                {/* Grid pattern overlay */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#f0f0f040_1px,transparent_1px),linear-gradient(to_bottom,#f0f0f040_1px,transparent_1px)] bg-[size:60px_60px]" />
            </div>

            {/* Navigation */}
            <nav className="fixed top-0 w-full z-50">
                <div className="backdrop-blur-xl bg-white/70 border-b border-slate-200/50 shadow-sm">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
                        <Link href="/" className="flex items-center gap-2 sm:gap-3 group shrink-0">
                            <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg shadow-blue-500/25 group-hover:shadow-blue-500/40 transition-shadow">
                                <TrendingUp className="h-5 w-5 text-white" />
                            </div>
                            <span className="text-base sm:text-xl font-bold tracking-tight text-slate-900">OptiWealth</span>
                        </Link>
                        <div className="flex items-center gap-2 sm:gap-4">
                            <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors whitespace-nowrap">
                                Sign In
                            </Link>
                            <Link href="/register">
                                {/* Neumorphism button */}
                                <Button className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold px-3 sm:px-6 h-9 sm:h-10 text-xs sm:text-sm shadow-lg shadow-blue-500/30 hover:shadow-blue-600/40 transition-all whitespace-nowrap">
                                    Get Started <ArrowRight className="ml-1.5 sm:ml-2 h-3 w-3 sm:h-4 sm:w-4" />
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <main className="pt-28 sm:pt-36 pb-16 sm:pb-24 px-4 sm:px-6">
                <div className="max-w-7xl mx-auto">
                    <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
                        {/* Left: Content */}
                        <div className="space-y-6 sm:space-y-8">
                            {/* Trust badge */}
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-slate-200 shadow-sm text-sm text-slate-700">
                                <span className="flex items-center gap-1.5">
                                    <CheckCircle className="h-4 w-4 text-green-500" />
                                    Trusted by 10,000+ investors across India
                                </span>
                            </div>
                            
                            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.1] tracking-tight">
                                Smart investing,{" "}
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600">
                                    made simple.
                                </span>
                            </h1>
                            
                            <p className="text-lg text-slate-600 leading-relaxed max-w-lg">
                                Stop guessing, start growing. OptiWealth helps you build and maintain a balanced portfolio with real-time insights, smart rebalancing, and zero complexity.
                            </p>
                            
                            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                                <Link href="/register" className="w-full sm:w-auto">
                                    <Button size="lg" className="w-full sm:w-auto bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold px-8 h-14 text-lg shadow-xl shadow-blue-500/25 hover:shadow-blue-600/35 transition-all hover:-translate-y-0.5">
                                        Start for Free <ArrowRight className="ml-2 h-5 w-5" />
                                    </Button>
                                </Link>
                                <Button variant="outline" size="lg" className="w-full sm:w-auto border-slate-300 bg-white hover:bg-slate-50 text-slate-700 px-8 h-14 text-lg shadow-sm hover:shadow transition-all">
                                    Watch Demo
                                </Button>
                            </div>

                            {/* Quick Stats */}
                            <div className="flex flex-wrap gap-6 sm:gap-10 pt-6 border-t border-slate-200">
                                <div>
                                    <div className="text-2xl sm:text-3xl font-bold text-slate-900">₹50Cr+</div>
                                    <div className="text-sm text-slate-500">Assets Managed</div>
                                </div>
                                <div>
                                    <div className="text-2xl sm:text-3xl font-bold text-green-600">+12.4%</div>
                                    <div className="text-sm text-slate-500">Avg. Returns</div>
                                </div>
                                <div>
                                    <div className="text-2xl sm:text-3xl font-bold text-slate-900">4.9★</div>
                                    <div className="text-sm text-slate-500">User Rating</div>
                                </div>
                            </div>
                        </div>

                        {/* Right: Premium Glassmorphism Card */}
                        <div className="relative">
                            {/* Electro glow border effect */}
                            <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 rounded-3xl blur-lg opacity-20 animate-pulse" />
                            
                            {/* Glassmorphism card */}
                            <div className="relative bg-white/80 backdrop-blur-xl rounded-2xl border border-white/50 shadow-2xl p-8 space-y-6">
                                {/* Mock Portfolio Preview */}
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-slate-500">Portfolio Value</p>
                                        <p className="text-3xl font-bold text-slate-900">₹12,45,892</p>
                                    </div>
                                    <div className="px-3 py-1.5 bg-green-50 text-green-700 rounded-full text-sm font-semibold border border-green-100">
                                        +18.2% ↑
                                    </div>
                                </div>
                                
                                {/* Chart mockup */}
                                <div className="h-32 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl flex items-end justify-around px-4 pb-4">
                                    {[40, 55, 35, 70, 50, 85, 60].map((h, i) => (
                                        <div 
                                            key={i} 
                                            className="w-6 bg-gradient-to-t from-blue-500 to-indigo-400 rounded-t-md transition-all hover:from-blue-600 hover:to-indigo-500"
                                            style={{ height: `${h}%` }}
                                        />
                                    ))}
                                </div>
                                
                                {/* Metrics row */}
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="text-center p-3 bg-slate-50 rounded-xl">
                                        <p className="text-xs text-slate-500">Sharpe</p>
                                        <p className="text-lg font-bold text-slate-900">1.82</p>
                                    </div>
                                    <div className="text-center p-3 bg-slate-50 rounded-xl">
                                        <p className="text-xs text-slate-500">Risk</p>
                                        <p className="text-lg font-bold text-amber-600">Medium</p>
                                    </div>
                                    <div className="text-center p-3 bg-slate-50 rounded-xl">
                                        <p className="text-xs text-slate-500">Holdings</p>
                                        <p className="text-lg font-bold text-slate-900">8</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Features Section */}
            <section className="py-20 px-4 sm:px-6 relative">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-14">
                        <p className="text-sm font-semibold text-blue-600 mb-2">WHY OPTIWEALTH</p>
                        <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
                            Everything you need to invest smarter
                        </h2>
                        <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                            Built for Indian investors who want professional-grade tools without the complexity
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[
                            {
                                icon: BarChart3,
                                title: "Real-Time Analytics",
                                description: "Track your portfolio performance with live NSE/BSE data updates and comprehensive metrics.",
                                gradient: "from-blue-500 to-cyan-500",
                                glow: "shadow-blue-500/20"
                            },
                            {
                                icon: Target,
                                title: "Smart Rebalancing",
                                description: "Get personalized recommendations to keep your portfolio aligned with your goals.",
                                gradient: "from-indigo-500 to-purple-500",
                                glow: "shadow-indigo-500/20"
                            },
                            {
                                icon: ShieldCheck,
                                title: "Risk Assessment",
                                description: "Understand your portfolio&apos;s risk profile with Sharpe ratio, beta, and volatility analysis.",
                                gradient: "from-emerald-500 to-green-500",
                                glow: "shadow-emerald-500/20"
                            },
                            {
                                icon: PieChart,
                                title: "Allocation Insights",
                                description: "Visualize your asset distribution and identify diversification opportunities.",
                                gradient: "from-amber-500 to-orange-500",
                                glow: "shadow-amber-500/20"
                            },
                            {
                                icon: Zap,
                                title: "Instant Recommendations",
                                description: "Receive actionable trade suggestions based on modern portfolio theory.",
                                gradient: "from-pink-500 to-rose-500",
                                glow: "shadow-pink-500/20"
                            },
                            {
                                icon: Sparkles,
                                title: "Tax Optimization",
                                description: "Minimize tax liability with smart harvest suggestions and holding period tracking.",
                                gradient: "from-violet-500 to-purple-500",
                                glow: "shadow-violet-500/20"
                            }
                        ].map((feature, i) => (
                            <div
                                key={i}
                                className="group relative bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                            >
                                {/* Electro border on hover */}
                                <div className={`absolute -inset-0.5 bg-gradient-to-r ${feature.gradient} rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-sm -z-10`} />
                                
                                <div className="relative">
                                    <div className={`w-12 h-12 bg-gradient-to-br ${feature.gradient} rounded-xl flex items-center justify-center mb-4 shadow-lg ${feature.glow}`}>
                                        <feature.icon className="h-6 w-6 text-white" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-slate-900 mb-2">{feature.title}</h3>
                                    <p className="text-slate-600 text-sm leading-relaxed">{feature.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-20 px-4 sm:px-6">
                <div className="max-w-4xl mx-auto relative">
                    {/* Electro glow border */}
                    <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 rounded-3xl blur-lg opacity-30" />
                    
                    {/* Glassmorphism CTA card */}
                    <div className="relative bg-white/90 backdrop-blur-xl rounded-2xl border border-white/50 shadow-2xl p-8 sm:p-12 text-center">
                        <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
                            Ready to grow your wealth?
                        </h2>
                        <p className="text-lg text-slate-600 mb-8 max-w-xl mx-auto">
                            Join thousands of investors who are building smarter portfolios with OptiWealth. No credit card required.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <Link href="/register">
                                <Button size="lg" className="w-full sm:w-auto bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold px-8 h-14 text-lg shadow-xl shadow-blue-500/25">
                                    Create Free Account <ArrowUpRight className="ml-2 h-5 w-5" />
                                </Button>
                            </Link>
                        </div>
                        <p className="text-sm text-slate-500 mt-4">
                            Free forever for personal use • No hidden fees
                        </p>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-8 px-4 sm:px-6 border-t border-slate-200 bg-white/50">
                <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg">
                            <TrendingUp className="h-4 w-4 text-white" />
                        </div>
                        <span className="font-semibold text-slate-900">OptiWealth</span>
                    </div>
                    <p className="text-sm text-slate-500">
                        © 2026 OptiWealth. Built with care for Indian investors.
                    </p>
                </div>
            </footer>
        </div>
    );
}
