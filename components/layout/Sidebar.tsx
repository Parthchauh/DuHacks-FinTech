"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
    BarChart2,
    Home,
    PieChart,
    Settings,
    History,
    Briefcase,
    LogOut,
    TrendingUp
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { usePortfolioStore } from "@/lib/store";
import { useRouter } from "next/navigation";
import Swal from 'sweetalert2';

const navigation = [
    { name: 'Overview', href: '/dashboard', icon: Home },
    { name: 'Portfolio', href: '/dashboard/portfolio', icon: PieChart },
    { name: 'Transactions', href: '/dashboard/transactions', icon: History },
    { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart2 },
    { name: 'Rebalance', href: '/dashboard/rebalance', icon: Briefcase },
    { name: 'Settings', href: '/dashboard/settings', icon: Settings },
];

export function Sidebar() {

// ... (existing imports)

    const pathname = usePathname();
    const { logout } = usePortfolioStore();
    const router = useRouter();

    const handleLogout = () => {
        Swal.fire({
            title: 'Sign Out?',
            text: "Are you sure you want to end your session?",
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#2563eb', // blue-600
            cancelButtonColor: '#94a3b8',
            confirmButtonText: 'Yes, Sign Out',
            cancelButtonText: 'Stay Logged In',
            padding: '2em',
            customClass: {
                popup: 'rounded-2xl shadow-xl border border-slate-100',
                confirmButton: 'px-6 py-2.5 rounded-xl font-semibold',
                cancelButton: 'px-6 py-2.5 rounded-xl font-medium'
            }
        }).then((result) => {
            if (result.isConfirmed) {
                logout();
                router.push("/login");
            }
        });
    };

    return (
        <div className="hidden lg:flex w-64 flex-col fixed inset-y-0 z-50 bg-white border-r border-slate-200">
            <div className="flex h-16 items-center gap-2 px-6 border-b border-slate-100">
                <div className="p-1.5 bg-primary rounded-lg text-white">
                    <TrendingUp className="h-5 w-5" />
                </div>
                <span className="text-lg font-bold text-slate-900 tracking-tight">OptiWealth</span>
            </div>

            <div className="flex-1 flex flex-col gap-1 p-4">
                {navigation.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                                isActive
                                    ? "bg-primary/5 text-primary"
                                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                            )}
                        >
                            <item.icon className={cn("h-4 w-4", isActive ? "text-primary" : "text-slate-400")} />
                            {item.name}
                        </Link>
                    );
                })}
            </div>

            <div className="p-4 border-t border-slate-100">
                <Button variant="ghost" className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50" onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" /> Sign Out
                </Button>
            </div>
        </div>
    );
}
