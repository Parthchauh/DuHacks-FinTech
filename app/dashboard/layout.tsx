"use client";

import { Sidebar } from "@/components/layout/Sidebar";
import { usePortfolioStore } from "@/lib/store";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { user } = usePortfolioStore();
    const router = useRouter();
    const [isAuthorized, setIsAuthorized] = useState(false);

    useEffect(() => {
        if (!user) {
            router.push("/login");
        } else {
            setIsAuthorized(true);
        }
    }, [user, router]);

    if (!isAuthorized) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-slate-50">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50">
            <Sidebar />
            <main className="lg:pl-64 min-h-screen">
                <div className="max-w-7xl mx-auto p-4 lg:p-8">
                    {children}
                </div>
            </main>
        </div>
    );
}
