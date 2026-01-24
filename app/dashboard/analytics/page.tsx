"use client";

import { Card } from "@/components/ui/Card";
import { Activity, BarChart2, TrendingUp } from "lucide-react";

export default function AnalyticsPage() {
    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Portfolio Analytics</h1>
                <p className="text-slate-500">Deep dive into your portfolio performance and risk metrics.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="p-6 bg-gradient-to-br from-indigo-500 to-purple-600 text-white border-none">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                            <Activity className="h-5 w-5" />
                        </div>
                        <h3 className="font-semibold text-white/90">Sharpe Ratio</h3>
                    </div>
                    <div className="text-3xl font-bold mb-2">2.84</div>
                    <p className="text-white/70 text-sm">Top 5% of portfolios</p>
                </Card>

                <Card className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                            <TrendingUp className="h-5 w-5" />
                        </div>
                        <h3 className="font-semibold text-slate-900">Alpha</h3>
                    </div>
                    <div className="text-3xl font-bold text-slate-900 mb-2">+4.2%</div>
                    <p className="text-slate-500 text-sm">Excess return vs Nifty 50</p>
                </Card>

                <Card className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                            <BarChart2 className="h-5 w-5" />
                        </div>
                        <h3 className="font-semibold text-slate-900">Beta</h3>
                    </div>
                    <div className="text-3xl font-bold text-slate-900 mb-2">0.85</div>
                    <p className="text-slate-500 text-sm">Lower volatility than market</p>
                </Card>
            </div>

            <div className="grid lg:grid-cols-2 gap-8">
                <Card className="p-6">
                    <h3 className="font-bold text-slate-900 mb-6">Asset Correlation Matrix</h3>
                    <div className="aspect-square bg-slate-50 rounded-xl flex items-center justify-center text-slate-400">
                        Heatmap Chart Placeholder (Recharts)
                    </div>
                </Card>
                <Card className="p-6">
                    <h3 className="font-bold text-slate-900 mb-6">Monthly Returns</h3>
                    <div className="aspect-square bg-slate-50 rounded-xl flex items-center justify-center text-slate-400">
                        Bar Chart Placeholder (Recharts)
                    </div>
                </Card>
            </div>

            <Card className="overflow-hidden">
                <div className="p-6 border-b border-slate-100">
                    <h3 className="font-bold text-slate-900">Top Performers</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 text-xs text-slate-500 uppercase font-semibold">
                            <tr>
                                <th className="px-6 py-4">Asset</th>
                                <th className="px-6 py-4 text-right">Return (YTD)</th>
                                <th className="px-6 py-4 text-right">Contribution</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            <tr className="hover:bg-slate-50/50">
                                <td className="px-6 py-4 font-medium text-slate-900">RELIANCE</td>
                                <td className="px-6 py-4 text-right text-green-600 font-medium">+24.5%</td>
                                <td className="px-6 py-4 text-right text-slate-600">₹45,200</td>
                            </tr>
                            <tr className="hover:bg-slate-50/50">
                                <td className="px-6 py-4 font-medium text-slate-900">NIFTYBEES</td>
                                <td className="px-6 py-4 text-right text-green-600 font-medium">+15.2%</td>
                                <td className="px-6 py-4 text-right text-slate-600">₹1,25,000</td>
                            </tr>
                            <tr className="hover:bg-slate-50/50">
                                <td className="px-6 py-4 font-medium text-slate-900">GOLDBEES</td>
                                <td className="px-6 py-4 text-right text-green-600 font-medium">+12.1%</td>
                                <td className="px-6 py-4 text-right text-slate-600">₹62,000</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
}
