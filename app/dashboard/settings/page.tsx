"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { usePortfolioStore } from "@/lib/store";
import { Save, Trash2, User } from "lucide-react";
import { useState } from "react";

export default function SettingsPage() {
    const { user, setUser, resetSimulation } = usePortfolioStore();
    const [name, setName] = useState(user?.name || "");
    const [email, setEmail] = useState(user?.email || "");
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = () => {
        setIsSaving(true);
        setTimeout(() => {
            if (user) {
                setUser({ ...user, name, email });
            }
            setIsSaving(false);
        }, 1000);
    };

    const handleReset = () => {
        if (confirm("Are you sure you want to reset your portfolio simulation? This will restore initial balances.")) {
            resetSimulation();
        }
    };

    return (
        <div className="space-y-8 max-w-4xl">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
                <p className="text-slate-500">Manage your account and preferences.</p>
            </div>

            <Card className="p-8">
                <h2 className="text-lg font-semibold text-slate-900 mb-6 flex items-center gap-2">
                    <User className="h-5 w-5 text-slate-500" /> Profile Information
                </h2>

                <div className="space-y-6 max-w-lg">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Full Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/50 text-slate-900"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Email Address</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/50 text-slate-900"
                        />
                    </div>

                    <div className="pt-2">
                        <Button onClick={handleSave} disabled={isSaving}>
                            {isSaving ? "Saving..." : <><Save className="mr-2 h-4 w-4" /> Save Changes</>}
                        </Button>
                    </div>
                </div>
            </Card>

            <Card className="p-8 border-red-100 bg-red-50/30">
                <h2 className="text-lg font-semibold text-red-900 mb-2 flex items-center gap-2">
                    <Trash2 className="h-5 w-5" /> Danger Zone
                </h2>
                <p className="text-sm text-red-700 mb-6">Irreversible actions for your account.</p>

                <div className="flex flex-col sm:flex-row gap-4">
                    <Button variant="outline" className="bg-white hover:bg-red-50 text-red-600 border-red-200" onClick={handleReset}>
                        Reset Portfolio Data
                    </Button>
                </div>
            </Card>
        </div>
    );
}
