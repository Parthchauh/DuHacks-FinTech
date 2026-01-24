"use client";

import { RebalanceWizard } from "@/components/dashboard/RebalanceWizard";
import { Button } from "@/components/ui/Button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export default function RebalancePage() {
    const [isOpen, setIsOpen] = useState(true);

    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-slate-900 mb-2">Portfolio Rebalancing</h1>
                <p className="text-slate-500">Launch the wizard to optimize your holdings.</p>
            </div>

            <div className="p-8 bg-white border border-slate-100 rounded-2xl shadow-sm text-center">
                <p className="mb-6 text-slate-600 max-w-sm mx-auto">
                    The rebalancing wizard analyzes your current allocation against your targets and generates a tax-efficient trade plan.
                </p>
                <Button size="lg" onClick={() => setIsOpen(true)} className="shadow-xl shadow-primary/20">
                    Start Wizard
                </Button>
            </div>

            <div className="mt-8">
                <Link href="/dashboard" className="text-sm text-slate-500 hover:text-slate-900 flex items-center gap-2">
                    <ArrowLeft className="h-4 w-4" /> Back to Dashboard
                </Link>
            </div>

            <RebalanceWizard isOpen={isOpen} onClose={() => setIsOpen(false)} />
        </div>
    );
}
