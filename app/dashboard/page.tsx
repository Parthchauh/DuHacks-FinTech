"use client";

import { StatCard } from "@/components/dashboard/StatCard";
import { DollarSign, TrendingUp, Activity, PieChart, IndianRupee, Download } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { PerformanceChart } from "@/components/dashboard/PerformanceChart";
import { usePortfolioStore } from "@/lib/store";
import { calculatePortfolioTotal } from "@/lib/finance";
import { formatCurrency } from "@/lib/utils";
import { downloadPortfolioReport } from "@/lib/report";
import { motion } from "framer-motion";

const container = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1
        }
    }
};

const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
};

export default function DashboardPage() {
    const { user, holdings } = usePortfolioStore();
    const totalBalance = calculatePortfolioTotal(holdings);

    const handleDownload = () => {
        downloadPortfolioReport(holdings, totalBalance);
    };

    return (
        <motion.div
            className="space-y-8"
            variants={container}
            initial="hidden"
            animate="show"
        >
            {/* Welcome Section */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Welcome back, {user?.name.split(' ')[0]}</h1>
                    <p className="text-slate-500">Here's what's happening with your portfolio today.</p>
                </div>
                <div className="flex gap-3">
                    <Button variant="outline" onClick={handleDownload}>
                        <Download className="mr-2 h-4 w-4" /> Download Report
                    </Button>
                    <Button>Rebalance Portfolio</Button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { title: "Total Balance", value: formatCurrency(totalBalance), change: "+12.5%", trend: "up", icon: IndianRupee },
                    { title: "Total Return", value: formatCurrency(totalBalance * 0.14), change: "+14.3%", trend: "up", icon: TrendingUp },
                    { title: "Risk Score", value: "6.4/10", change: "-0.2", trend: "down", icon: Activity },
                    { title: "Asset Class Drift", value: "2.1%", change: "Needs Rebalancing", trend: "neutral", icon: PieChart }
                ].map((stat, i) => (
                    <motion.div key={i} variants={item}>
                        <StatCard // @ts-ignore
                            {...stat}
                        />
                    </motion.div>
                ))}
            </div>

            {/* Main Content Area */}
            <div className="grid lg:grid-cols-3 gap-8">
                <motion.div variants={item} className="lg:col-span-2 space-y-6">
                    <PerformanceChart />
                </motion.div>

                <motion.div variants={item} className="space-y-6">
                    {/* Recent Activity */}
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 h-full">
                        <h3 className="font-semibold text-slate-900 mb-6">Recent Activity</h3>
                        <div className="space-y-4">
                            {[
                                { ticker: "NIFTYBEES", name: "Bought Nifty BeES", amount: 15000 },
                                { ticker: "RELIANCE", name: "Bought Reliance", amount: 24500 },
                                { ticker: "GOLDBEES", name: "Sold Gold BeES", amount: 8400 }
                            ].map((item, i) => (
                                <div key={i} className="flex items-center gap-4 p-3 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer">
                                    <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-xs">
                                        {item.ticker.substring(0, 4)}
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-slate-900">{item.name}</p>
                                        <p className="text-xs text-slate-500">Today, 10:42 AM</p>
                                    </div>
                                    <div className="ml-auto text-sm font-medium text-slate-900">
                                        {formatCurrency(item.amount)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </motion.div>
            </div>
        </motion.div>
    );
}
