"use client";

/**
 * Sidebar Component
 * ==================
 * Premium responsive sidebar with:
 * - Desktop: Fixed sidebar with navigation
 * - Mobile: Slide-out drawer with hamburger toggle
 * - Glassmorphism overlay and smooth animations
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
    Menu,
    X
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
    const pathname = usePathname();
    const { logout } = usePortfolioStore();
    const router = useRouter();
    const [isMobileOpen, setIsMobileOpen] = useState(false);

    // Close sidebar on route change
    useEffect(() => {
        setIsMobileOpen(false);
    }, [pathname]);

    // Prevent body scroll when mobile menu is open
    useEffect(() => {
        if (isMobileOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isMobileOpen]);

    const handleLogout = () => {
        setIsMobileOpen(false);
        Swal.fire({
            title: 'Sign Out?',
            text: "Are you sure you want to end your session?",
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#2563eb',
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

    const NavContent = () => (
        <>
            {/* Logo */}
            <div className="flex h-16 items-center gap-2 px-6 border-b border-slate-100">
                <div className="p-1.5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg text-white shadow-lg shadow-blue-500/20">
                    <TrendingUp className="h-5 w-5" />
                </div>
                <span className="text-lg font-bold text-slate-900 tracking-tight">OptiWealth</span>
            </div>

            {/* Navigation Links */}
            <div className="flex-1 flex flex-col gap-1 p-4 overflow-y-auto">
                {navigation.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            onClick={() => setIsMobileOpen(false)}
                            className={cn(
                                "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200",
                                "min-h-[48px] touch-manipulation",
                                isActive
                                    ? "bg-gradient-to-r from-blue-500/10 to-indigo-500/10 text-blue-600 shadow-sm"
                                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 active:bg-slate-100"
                            )}
                        >
                            <item.icon className={cn(
                                "h-5 w-5 transition-colors",
                                isActive ? "text-blue-600" : "text-slate-400"
                            )} />
                            {item.name}
                            {isActive && (
                                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-600" />
                            )}
                        </Link>
                    );
                })}
            </div>

            {/* Sign Out */}
            <div className="p-4 border-t border-slate-100">
                <Button 
                    variant="ghost" 
                    className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 min-h-[48px] rounded-xl" 
                    onClick={handleLogout}
                >
                    <LogOut className="mr-3 h-5 w-5" /> Sign Out
                </Button>
            </div>
        </>
    );

    return (
        <>
            {/* Mobile Header with Hamburger */}
            <div className="lg:hidden fixed top-0 left-0 right-0 z-40 h-16 bg-white/80 backdrop-blur-xl border-b border-slate-100">
                <div className="flex items-center justify-between h-full px-4">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg text-white shadow-lg shadow-blue-500/20">
                            <TrendingUp className="h-5 w-5" />
                        </div>
                        <span className="text-lg font-bold text-slate-900 tracking-tight">OptiWealth</span>
                    </div>
                    
                    {/* Premium Hamburger Button with SVG */}
                    <button
                        onClick={() => setIsMobileOpen(!isMobileOpen)}
                        className={cn(
                            "relative w-12 h-12 rounded-xl flex items-center justify-center",
                            "bg-slate-50 hover:bg-slate-100 active:bg-slate-200",
                            "transition-all duration-300 touch-manipulation"
                        )}
                        aria-label={isMobileOpen ? "Close menu" : "Open menu"}
                    >
                        {isMobileOpen ? (
                            // X Icon SVG
                            <svg 
                                xmlns="http://www.w3.org/2000/svg" 
                                width="24" 
                                height="24" 
                                viewBox="0 0 24 24" 
                                fill="none" 
                                stroke="currentColor" 
                                strokeWidth="2" 
                                strokeLinecap="round" 
                                strokeLinejoin="round"
                                className="text-slate-700 transition-transform duration-300"
                            >
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                        ) : (
                            // Hamburger Menu SVG
                            <svg 
                                xmlns="http://www.w3.org/2000/svg" 
                                width="24" 
                                height="24" 
                                viewBox="0 0 24 24" 
                                fill="none" 
                                stroke="currentColor" 
                                strokeWidth="2" 
                                strokeLinecap="round" 
                                strokeLinejoin="round"
                                className="text-slate-700 transition-transform duration-300"
                            >
                                <line x1="4" y1="6" x2="20" y2="6" />
                                <line x1="4" y1="12" x2="20" y2="12" />
                                <line x1="4" y1="18" x2="20" y2="18" />
                            </svg>
                        )}
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
                        "absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300",
                        isMobileOpen ? "opacity-100" : "opacity-0"
                    )}
                    onClick={() => setIsMobileOpen(false)}
                />
                
                {/* Slide-out Sidebar */}
                <div 
                    className={cn(
                        "absolute top-0 left-0 bottom-0 w-[280px] max-w-[85vw] bg-white shadow-2xl",
                        "flex flex-col transition-transform duration-300 ease-out",
                        isMobileOpen ? "translate-x-0" : "-translate-x-full"
                    )}
                >
                    <NavContent />
                </div>
            </div>

            {/* Desktop Sidebar */}
            <div className="hidden lg:flex w-64 flex-col fixed inset-y-0 z-50 bg-white border-r border-slate-200">
                <NavContent />
            </div>
        </>
    );
}
