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
                {/* Features */}
                <section className="max-w-7xl mx-auto mt-32">
                    <h2 className="text-3xl font-bold text-center text-slate-900 mb-12">Why Indian Investors Choose OptiWealth</h2>
                    <div className="grid md:grid-cols-3 gap-8">
                        {[
                            { icon: Zap, title: "Instant Rebalancing", desc: "One-click trade execution to bring your Nifty & Gold allocation back to target." },
                            { icon: ShieldCheck, title: "Risk Management", desc: "Automated drift detection alerts you when your portfolio deviates >5%." },
                            { icon: TrendingUp, title: "Tax Efficiency", desc: "Algorithms designed to minimize short-term capital gains tax." }
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
                </section>

                {/* Testimonials */}
                <section className="max-w-7xl mx-auto mt-32">
                    <h2 className="text-3xl font-bold text-center text-slate-900 mb-12">Trusted by Early Adopters</h2>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[
                            { name: "Rahul Sharma", role: "Software Engineer", quote: "Finally, a tool that handles NiftyBees rebalancing correctly. The UI is stunning." },
                            { name: "Priya Patel", role: "Marketing Lead", quote: "OptiWealth made me realize I was holding too much cash. My returns are up 12%." },
                            { name: "Amit Verma", role: "Day Trader", quote: "The risk score analysis is a game saver. It flagged my overexposure to midcaps instantly." }
                        ].map((t, i) => (
                            <div key={i} className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                                <p className="text-slate-600 italic mb-4">"{t.quote}"</p>
                                <div>
                                    <p className="font-semibold text-slate-900">{t.name}</p>
                                    <p className="text-xs text-slate-500">{t.role}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Pricing */}
                <section className="max-w-7xl mx-auto mt-32 mb-20">
                    <h2 className="text-3xl font-bold text-center text-slate-900 mb-4">Simple, Transparent Pricing</h2>
                    <p className="text-center text-slate-500 mb-12">Start for free, upgrade as you grow.</p>

                    <div className="grid md:grid-cols-3 gap-8">
                        <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm relative">
                            <h3 className="text-lg font-semibold text-slate-900">Starter</h3>
                            <div className="text-4xl font-bold text-slate-900 mt-4 mb-2">₹0</div>
                            <p className="text-slate-500 text-sm mb-6">Forever free</p>
                            <ul className="space-y-3 mb-8">
                                <li className="flex items-center gap-2 text-sm text-slate-600"><span className="text-green-500">✓</span> Portfolio Tracking</li>
                                <li className="flex items-center gap-2 text-sm text-slate-600"><span className="text-green-500">✓</span> Basic Rebalancing</li>
                            </ul>
                            <Button variant="outline" className="w-full">Get Started</Button>
                        </div>

                        <div className="bg-slate-900 p-8 rounded-2xl shadow-xl relative transform md:-translate-y-4">
                            <div className="absolute top-0 right-0 bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-xs font-bold px-3 py-1 rounded-bl-xl rounded-tr-xl">POPULAR</div>
                            <h3 className="text-lg font-semibold text-white">Pro</h3>
                            <div className="text-4xl font-bold text-white mt-4 mb-2">₹499<span className="text-lg font-normal text-slate-400">/mo</span></div>
                            <p className="text-slate-400 text-sm mb-6">For serious investors</p>
                            <ul className="space-y-3 mb-8">
                                <li className="flex items-center gap-2 text-sm text-slate-300"><span className="text-blue-400">✓</span> Everything in Starter</li>
                                <li className="flex items-center gap-2 text-sm text-slate-300"><span className="text-blue-400">✓</span> Tax-Loss Harvesting</li>
                                <li className="flex items-center gap-2 text-sm text-slate-300"><span className="text-blue-400">✓</span> Advanced Analytics</li>
                            </ul>
                            <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white border-none">Start Free Trial</Button>
                        </div>

                        <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm relative">
                            <h3 className="text-lg font-semibold text-slate-900">Wealth</h3>
                            <div className="text-4xl font-bold text-slate-900 mt-4 mb-2">₹1999<span className="text-lg font-normal text-slate-400">/mo</span></div>
                            <p className="text-slate-500 text-sm mb-6">For HNIs & Family Offices</p>
                            <ul className="space-y-3 mb-8">
                                <li className="flex items-center gap-2 text-sm text-slate-600"><span className="text-green-500">✓</span> Everything in Pro</li>
                                <li className="flex items-center gap-2 text-sm text-slate-600"><span className="text-green-500">✓</span> Dedicated Advisor</li>
                                <li className="flex items-center gap-2 text-sm text-slate-600"><span className="text-green-500">✓</span> API Access</li>
                            </ul>
                            <Button variant="outline" className="w-full">Contact Sales</Button>
                        </div>
                    </div>
                </section>
            </main>
        </div>
    );
}
