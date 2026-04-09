"use client";

/**
 * Sidebar Component — Dark Vault Theme
 * ======================================
 * Premium responsive sidebar with:
 * - Desktop: Fixed sidebar with dark glassmorphism
 * - Mobile: Slide-out drawer with hamburger toggle
 * - User profile section with avatar initials
 * - Cyan glow on active routes
 * - Portfolio switcher dropdown
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import {
    BarChart2,
    Home,
    PieChart,
    Settings,
    History,
    Briefcase,
    LogOut,
    TrendingUp,
    ChevronDown,
} from "lucide-react";
import { usePortfolioStore } from "@/lib/store";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";

const navigation = [
    { name: "Overview", href: "/dashboard", icon: Home },
    { name: "Portfolio", href: "/dashboard/portfolio", icon: PieChart },
    { name: "Transactions", href: "/dashboard/transactions", icon: History },
    { name: "Analytics", href: "/dashboard/analytics", icon: BarChart2 },
    { name: "Rebalance", href: "/dashboard/rebalance", icon: Briefcase },
    { name: "Settings", href: "/dashboard/settings", icon: Settings },
];

export function Sidebar() {
    const pathname = usePathname();
    const { logout, user, portfolios, currentPortfolioId, setCurrentPortfolio } =
        usePortfolioStore();
    const router = useRouter();
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const [showPortfolioMenu, setShowPortfolioMenu] = useState(false);

    // Close sidebar on route change
    useEffect(() => {
        setIsMobileOpen(false);
    }, [pathname]);

    // Prevent body scroll when mobile menu is open
    useEffect(() => {
        document.body.style.overflow = isMobileOpen ? "hidden" : "";
        return () => { document.body.style.overflow = ""; };
    }, [isMobileOpen]);

    const handleLogout = () => {
        setIsMobileOpen(false);
        Swal.fire({
            title: "Seal Vault?",
            text: "Are you sure you want to end your session?",
            icon: "question",
            showCancelButton: true,
            confirmButtonColor: "#06b6d4",
            cancelButtonColor: "#334155",
            confirmButtonText: "Yes, Sign Out",
            cancelButtonText: "Stay Logged In",
            padding: "2em",
            background: "rgba(13, 19, 32, 0.98)",
            color: "#e2e8f0",
            customClass: {
                popup: "rounded-2xl border border-cyan-500/20 shadow-2xl shadow-cyan-500/10",
                confirmButton: "px-6 py-2.5 rounded-xl font-semibold",
                cancelButton: "px-6 py-2.5 rounded-xl font-medium",
            },
        }).then((result) => {
            if (result.isConfirmed) {
                logout();
                router.push("/login");
            }
        });
    };

    // User avatar initials
    const initials = user?.full_name
        ? user.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
        : "OW";

    const currentPortfolio = portfolios.find((p) => p.id === currentPortfolioId);

    const NavContent = () => (
        <>
            {/* Logo */}
            <div className="flex h-16 items-center gap-2.5 px-5 border-b border-cyan-500/10">
                <div className="p-1.5 bg-gradient-to-br from-cyan-500 to-teal-500 rounded-lg shadow-lg shadow-cyan-500/25">
                    <TrendingUp className="h-5 w-5 text-[#0a0e1a]" />
                </div>
                <div>
                    <span className="text-base font-bold tracking-widest text-white">
                        OPTIWEALTH
                    </span>
                    <div className="text-[10px] tracking-[0.3em] text-slate-500 uppercase">
                        The Vault
                    </div>
                </div>
            </div>

            {/* Portfolio Switcher (if multiple portfolios) */}
            {portfolios.length > 1 && (
                <div className="px-4 pt-4 relative">
                    <button
                        onClick={() => setShowPortfolioMenu(!showPortfolioMenu)}
                        className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-[#0a0e1a] border border-cyan-500/15 text-sm hover:border-cyan-500/30 transition-all"
                    >
                        <span className="text-slate-300 truncate">
                            {currentPortfolio?.name || "Select Portfolio"}
                        </span>
                        <ChevronDown
                            className={`h-4 w-4 text-slate-500 transition-transform ${showPortfolioMenu ? "rotate-180" : ""}`}
                        />
                    </button>
                    {showPortfolioMenu && (
                        <div className="absolute left-4 right-4 top-full mt-1 z-50 rounded-xl bg-[#0d1320] border border-cyan-500/15 shadow-xl py-1 overflow-hidden">
                            {portfolios.map((p) => (
                                <button
                                    key={p.id}
                                    onClick={() => {
                                        setCurrentPortfolio(p.id);
                                        setShowPortfolioMenu(false);
                                    }}
                                    className={cn(
                                        "w-full px-4 py-2.5 text-left text-sm transition-colors",
                                        p.id === currentPortfolioId
                                            ? "text-cyan-400 bg-cyan-500/10"
                                            : "text-slate-400 hover:bg-cyan-500/5 hover:text-slate-200"
                                    )}
                                >
                                    {p.name}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Navigation Links */}
            <div className="flex-1 flex flex-col gap-0.5 p-3 overflow-y-auto mt-2">
                {navigation.map((item) => {
                    const isActive =
                        item.href === "/dashboard"
                            ? pathname === "/dashboard"
                            : pathname.startsWith(item.href);
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            onClick={() => setIsMobileOpen(false)}
                            className={cn(
                                "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200",
                                "min-h-[48px] touch-manipulation relative",
                                isActive
                                    ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-[0_0_12px_rgba(0,229,255,0.08)]"
                                    : "text-slate-400 hover:bg-cyan-500/5 hover:text-slate-200 border border-transparent"
                            )}
                        >
                            <item.icon
                                className={cn(
                                    "h-5 w-5 transition-colors flex-shrink-0",
                                    isActive ? "text-cyan-400" : "text-slate-500"
                                )}
                            />
                            {item.name}
                            {isActive && (
                                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(0,229,255,0.6)]" />
                            )}
                        </Link>
                    );
                })}
            </div>

            {/* User Profile + Sign Out */}
            <div className="p-3 border-t border-cyan-500/10">
                {user && (
                    <div className="flex items-center gap-3 px-3 py-2.5 mb-2 rounded-xl bg-[#0a0e1a] border border-cyan-500/10">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center text-xs font-bold text-[#0a0e1a] flex-shrink-0">
                            {initials}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-200 truncate">
                                {user.full_name}
                            </p>
                            <p className="text-xs text-slate-500 truncate">{user.email}</p>
                        </div>
                    </div>
                )}
                <button
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all min-h-[48px] touch-manipulation"
                    onClick={handleLogout}
                >
                    <LogOut className="h-5 w-5 flex-shrink-0" />
                    Sign Out
                </button>
            </div>
        </>
    );

    return (
        <>
            {/* Mobile Header */}
            <div className="lg:hidden fixed top-0 left-0 right-0 z-40 h-16 bg-[#0a0e1a]/90 backdrop-blur-xl border-b border-cyan-500/10">
                <div className="flex items-center justify-between h-full px-4">
                    <div className="flex items-center gap-2.5">
                        <div className="p-1.5 bg-gradient-to-br from-cyan-500 to-teal-500 rounded-lg text-[#0a0e1a] shadow-lg shadow-cyan-500/20">
                            <TrendingUp className="h-5 w-5" />
                        </div>
                        <span className="text-base font-bold tracking-widest text-white">
                            OPTIWEALTH
                        </span>
                    </div>

                    <button
                        onClick={() => setIsMobileOpen(!isMobileOpen)}
                        className={cn(
                            "relative w-11 h-11 rounded-xl flex items-center justify-center",
                            "bg-[#0d1320] border border-cyan-500/15 hover:border-cyan-500/30",
                            "transition-all duration-300 touch-manipulation"
                        )}
                        aria-label={isMobileOpen ? "Close menu" : "Open menu"}
                    >
                        <div className="w-5 h-4 flex flex-col justify-between">
                            <span
                                className={cn(
                                    "block h-0.5 bg-slate-400 rounded-full transition-all duration-300",
                                    isMobileOpen && "rotate-45 translate-y-[7px]"
                                )}
                            />
                            <span
                                className={cn(
                                    "block h-0.5 bg-slate-400 rounded-full transition-all duration-300",
                                    isMobileOpen && "opacity-0 scale-x-0"
                                )}
                            />
                            <span
                                className={cn(
                                    "block h-0.5 bg-slate-400 rounded-full transition-all duration-300",
                                    isMobileOpen && "-rotate-45 -translate-y-[7px]"
                                )}
                            />
                        </div>
                    </button>
                </div>
            </div>

            {/* Mobile Sidebar Overlay */}
            <div
                className={cn(
                    "lg:hidden fixed inset-0 z-50 transition-all duration-300",
                    isMobileOpen ? "visible" : "invisible"
                )}
            >
                {/* Backdrop */}
                <div
                    className={cn(
                        "absolute inset-0 bg-[#0a0e1a]/80 backdrop-blur-sm transition-opacity duration-300",
                        isMobileOpen ? "opacity-100" : "opacity-0"
                    )}
                    onClick={() => setIsMobileOpen(false)}
                />

                {/* Slide-out Sidebar */}
                <div
                    className={cn(
                        "absolute top-0 left-0 bottom-0 w-[280px] max-w-[85vw]",
                        "bg-[#0d1320] border-r border-cyan-500/10 shadow-2xl shadow-cyan-500/5",
                        "flex flex-col transition-transform duration-300 ease-out",
                        isMobileOpen ? "translate-x-0" : "-translate-x-full"
                    )}
                >
                    <NavContent />
                </div>
            </div>

            {/* Desktop Sidebar */}
            <div className="hidden lg:flex w-64 flex-col fixed inset-y-0 z-50 bg-[#0d1320] border-r border-cyan-500/10">
                <NavContent />
            </div>
        </>
    );
}
