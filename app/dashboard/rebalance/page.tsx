"use client";

/**
 * Rebalance Page
 * ================
 * Portfolio rebalancing wizard launcher.
 */

import { RebalanceWizard } from "@/components/dashboard/RebalanceWizard";
import { Button } from "@/components/ui/Button";
import { usePortfolioStore } from "@/lib/store";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Scale } from "lucide-react";

export default function RebalancePage() {
    const router = useRouter();
    const { isAuthenticated, holdings } = usePortfolioStore();
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        if (!isAuthenticated) {
            router.push('/login');
        }
    }, [isAuthenticated, router]);

    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-slate-900 mb-2">Portfolio Rebalancing</h1>
                <p className="text-slate-500">Launch the wizard to optimize your holdings.</p>
            </div>

            <div className="p-8 bg-white border border-slate-100 rounded-2xl shadow-sm text-center max-w-md">
                {holdings.length === 0 ? (
                    <>
                        {/* Empty State */}
                        <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                            <Scale className="h-10 w-10 text-slate-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-slate-800 mb-2">No Holdings to Rebalance</h3>
                        <p className="text-slate-500 mb-6">
                            Add some holdings to your portfolio first, then come back to rebalance them.
                        </p>
                        <Button onClick={() => router.push('/dashboard/portfolio')}>
                            Go to Portfolio
                        </Button>
                    </>
                ) : (
                    <>
                        <p className="mb-6 text-slate-600">
                            The rebalancing wizard analyzes your current allocation against your targets and generates a tax-efficient trade plan.
                        </p>
                        <Button size="lg" onClick={() => setIsOpen(true)} className="shadow-xl shadow-primary/20">
                            Start Wizard
                        </Button>
                    </>
                )}
            </div>

            <RebalanceWizard isOpen={isOpen} onClose={() => setIsOpen(false)} />
        </div>
    );
}
