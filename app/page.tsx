"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { ArrowRight, TrendingUp, ShieldCheck, Zap } from "lucide-react";

export default function Home() {
    return (
        <div className="min-h-screen bg-slate-50 overflow-hidden relative">
            <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-primary/10 rounded-lg text-primary">
                            <TrendingUp className="h-6 w-6" />
                        </div>
                        <span className="text-xl font-bold text-slate-900 tracking-tight">OptiWealth</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <Link href="/login" className="text-sm font-semibold text-slate-600 hover:text-slate-900">Sign In</Link>
                        <Link href="/register">
                            <Button>Get Started <ArrowRight className="ml-2 h-4 w-4" /></Button>
                        </Link>
                    </div>
                </div>
            </nav>

            <main className="pt-32 pb-16 px-6">
                <div className="max-w-7xl mx-auto text-center relative z-10">
                    <h1 className="text-5xl md:text-7xl font-extrabold text-slate-900 mb-6 tracking-tight leading-tight">
                        Wealth, <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Optimized.</span>
                    </h1>
                    <p className="text-xl text-slate-600 mb-10 max-w-2xl mx-auto leading-relaxed">
                        OptiWealth's quantitative engine automatically rebalances your Indian portfolio for maximum returns and minimal risk.
                    </p>
                    <div className="flex justify-center gap-4">
                        <Link href="/register">
                            <Button size="lg" className="px-8 text-lg h-14 shadow-xl shadow-primary/20">
                                Start Investing Now
                            </Button>
                        </Link>
                        <Button variant="outline" size="lg" className="px-8 text-lg h-14 bg-white/80">
                            View Live Demo
                        </Button>
                    </div>
                </div>

                {/* Features */}
                <div className="max-w-7xl mx-auto mt-32 grid md:grid-cols-3 gap-8">
                    {[
                        { icon: Zap, title: "Instant Rebalancing", desc: "One-click execution to bring your portfolio back to target." },
                        { icon: ShieldCheck, title: "Risk Management", desc: "Automated drift detection and volatility checks." },
                        { icon: TrendingUp, title: "Smart Growth", desc: "Algorithms designed to maximize long-term compound interest." }
                    ].map((feature, i) => (
                        <div key={i} className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                            <div className="h-12 w-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 mb-6">
                                <feature.icon className="h-6 w-6" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-3">{feature.title}</h3>
                            <p className="text-slate-600 leading-relaxed">{feature.desc}</p>
                        </div>
                    ))}
                </div>
            </main>
        </div>
    );
}
