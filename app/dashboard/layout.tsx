"use client";

import { Sidebar } from "@/components/layout/Sidebar";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-slate-50/50">
            <Sidebar />
            <div className="lg:pl-64 min-h-screen">
                <header className="h-20 border-b border-slate-100 bg-white/50 backdrop-blur-xl sticky top-0 z-30 px-8 flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-slate-800">Dashboard</h2>
                    <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-slate-200" />
                    </div>
                </header>
                <main className="p-8 max-w-7xl mx-auto">
                    {children}
                </main>
            </div>
        </div>
    );
}
