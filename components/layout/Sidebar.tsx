"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
    BarChart3,
    Home,
    PieChart,
    Settings,
    LogOut,
    Wallet,
    ArrowLeftRight,
    TrendingUp
} from "lucide-react";

const navItems = [
    { name: "Overview", href: "/dashboard", icon: Home },
    { name: "Portfolio", href: "/dashboard/portfolio", icon: PieChart },
    { name: "Rebalance", href: "/dashboard/rebalance", icon: ArrowLeftRight },
    { name: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
    { name: "Transactions", href: "/dashboard/transactions", icon: Wallet },
    { name: "Settings", href: "/dashboard/settings", icon: Settings },
];

export function Sidebar() {
    const pathname = usePathname();

    return (
        <aside className="w-64 fixed left-0 top-0 bottom-0 z-40 hidden lg:flex flex-col border-r border-slate-100 bg-white/50 backdrop-blur-xl">
            <div className="h-24 flex items-center px-8">
                <Link href="/" className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-primary to-secondary flex items-center justify-center text-white shadow-lg shadow-primary/30">
                        <TrendingUp className="h-6 w-6" />
                    </div>
                    <span className="text-xl font-bold text-slate-800 tracking-tight">
                        OptiWealth
                    </span>
                </Link>
            </div>

            <div className="flex-1 py-6 px-4 space-y-2">
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-3 px-4 py-3.5 text-sm font-medium rounded-xl transition-all duration-200",
                                isActive
                                    ? "bg-primary/10 text-primary shadow-sm"
                                    : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                            )}
                        >
                            <item.icon className={cn("h-5 w-5", isActive ? "text-primary" : "text-slate-400")} />
                            {item.name}
                        </Link>
                    );
                })}
            </div>

            <div className="p-6 border-t border-slate-50">
                <button className="flex items-center gap-3 px-4 py-3 w-full text-sm font-medium text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors">
                    <LogOut className="h-5 w-5" />
                    Sign Out
                </button>
            </div>
        </aside>
    );
}
