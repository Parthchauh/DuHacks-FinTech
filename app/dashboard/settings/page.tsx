"use client";

/**
 * Settings Page — Dark Vault Theme
 * ==================================
 * Profile, security (MFA), notifications, import, danger zone
 */

import { ImportZone } from "@/components/dashboard/ImportZone";
import { NotificationSettings } from "@/components/dashboard/NotificationSettings";
import { MFASetup } from "@/components/auth/MFASetup";
import { usePortfolioStore } from "@/lib/store";
import { api } from "@/lib/api";
import {
    Save, Trash2, User, Loader2, FileSpreadsheet,
    ShieldCheck, X, LogOut, Lock,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Swal from "sweetalert2";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.35 } } };

const swalDark = {
    background: "rgba(13, 19, 32, 0.98)",
    color: "#e2e8f0",
    customClass: {
        popup: "rounded-2xl border border-cyan-500/20 shadow-2xl shadow-cyan-500/10",
        confirmButton: "px-6 py-2.5 rounded-xl font-semibold",
        cancelButton: "px-6 py-2.5 rounded-xl font-medium",
    },
};

export default function SettingsPage() {
    const router = useRouter();
    const { user, isAuthenticated, fetchUser, logout, deleteAccount } = usePortfolioStore();
    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [mfaStatus, setMfaStatus] = useState<{ enabled: boolean; method: string } | null>(null);
    const [showMfaSetup, setShowMfaSetup] = useState(false);
    const [isLoadingMfa, setIsLoadingMfa] = useState(false);

    useEffect(() => {
        if (!isAuthenticated) { router.push("/login"); return; }
        fetchUser();
        loadMfaStatus();
    }, [isAuthenticated, router, fetchUser]);

    useEffect(() => {
        if (user) {
            setFullName(user.full_name || "");
            setEmail(user.email || "");
        }
    }, [user]);

    const loadMfaStatus = async () => {
        try {
            const status = await api.getMfaStatus();
            setMfaStatus({ enabled: status.totp_enabled, method: status.method });
        } catch { /* non-critical */ }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await api.updateMe({ full_name: fullName });
            toast.success("Profile updated!");
            fetchUser();
        } catch (error: any) {
            toast.error(error?.detail || "Failed to save settings");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDisableMfa = async () => {
        const result = await Swal.fire({
            title: "Disable 2FA?",
            text: "Your account will be less secure without Two-Factor Authentication.",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#f59e0b",
            cancelButtonColor: "#334155",
            confirmButtonText: "Yes, Disable",
            ...swalDark,
        });
        if (result.isConfirmed) {
            setIsLoadingMfa(true);
            try {
                await api.disableMfa();
                toast.success("MFA disabled");
                loadMfaStatus();
            } catch { toast.error("Failed to disable MFA"); }
            finally { setIsLoadingMfa(false); }
        }
    };

    const handleLogout = () => {
        Swal.fire({
            title: "Seal Vault?",
            text: "Are you sure you want to end your session?",
            icon: "question",
            showCancelButton: true,
            confirmButtonColor: "#06b6d4",
            cancelButtonColor: "#334155",
            confirmButtonText: "Yes, Sign Out",
            ...swalDark,
        }).then((result) => {
            if (result.isConfirmed) { logout(); router.push("/login"); }
        });
    };

    const handleDeleteAccount = async () => {
        const result = await Swal.fire({
            title: "Delete Account?",
            html: "This action is <b style='color:#f87171'>PERMANENT</b> and cannot be undone.<br>All portfolios, holdings, and transaction history will be erased.",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#dc2626",
            cancelButtonColor: "#334155",
            confirmButtonText: "Yes, Delete Everything",
            ...swalDark,
        });
        if (!result.isConfirmed) return;

        const { value: confirmText } = await Swal.fire({
            title: "Final Confirmation",
            text: "Type 'DELETE' to permanently destroy your account.",
            input: "text",
            inputPlaceholder: "DELETE",
            icon: "error",
            showCancelButton: true,
            confirmButtonColor: "#dc2626",
            cancelButtonColor: "#334155",
            confirmButtonText: "Permanently Delete",
            preConfirm: (text) => {
                if (text !== "DELETE") Swal.showValidationMessage("You must type DELETE precisely.");
                return text;
            },
            ...swalDark,
        });

        if (confirmText === "DELETE") {
            setIsDeleting(true);
            const success = await deleteAccount();
            if (success) {
                await Swal.fire({ title: "Account Deleted", icon: "success", timer: 2000, showConfirmButton: false, ...swalDark });
                router.push("/register");
            } else {
                toast.error("Failed to delete account");
                setIsDeleting(false);
            }
        }
    };

    const inputClass = "w-full px-4 py-3 rounded-xl bg-[#0a0e1a] border border-slate-700/50 focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none text-white placeholder:text-slate-600 text-sm transition-all";
    const labelClass = "text-xs font-semibold tracking-widest text-slate-400 uppercase ml-1";

    return (
        <motion.div
            className="space-y-6 max-w-3xl"
            initial="hidden"
            animate="show"
            variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } }}
        >
            <motion.div variants={item}>
                <h1 className="text-2xl font-bold text-white">Settings</h1>
                <p className="text-slate-400 text-sm mt-1">Manage your account and preferences.</p>
            </motion.div>

            {/* Profile */}
            <motion.div variants={item} className="rounded-2xl border border-cyan-500/10 bg-[#0d1320]/80 p-6">
                <h2 className="font-semibold text-white text-sm tracking-widest uppercase mb-5 flex items-center gap-2">
                    <User className="h-4 w-4 text-cyan-400" /> Profile Information
                </h2>
                <div className="space-y-4 max-w-md">
                    <div className="space-y-1.5">
                        <label className={labelClass}>Full Name</label>
                        <input
                            type="text"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            placeholder="Your full name"
                            autoComplete="name"
                            className={inputClass}
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className={labelClass}>Email Address</label>
                        <input
                            type="email"
                            value={email}
                            disabled
                            className={cn(inputClass, "opacity-50 cursor-not-allowed")}
                        />
                        <p className="text-xs text-slate-600 ml-1">Email cannot be changed</p>
                    </div>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 text-[#0a0e1a] font-semibold text-sm hover:brightness-110 active:scale-[0.98] transition-all shadow-lg shadow-cyan-500/20 disabled:opacity-60"
                    >
                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        {isSaving ? "Saving…" : "Save Changes"}
                    </button>
                </div>
            </motion.div>

            {/* Security */}
            <motion.div variants={item} className="rounded-2xl border border-cyan-500/10 bg-[#0d1320]/80 p-6">
                <h2 className="font-semibold text-white text-sm tracking-widest uppercase mb-5 flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-cyan-400" /> Security Settings
                </h2>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-[#0a0e1a] rounded-xl border border-slate-800/60 gap-4">
                    <div>
                        <h3 className="font-semibold text-slate-200 text-sm">Two-Factor Authentication (2FA)</h3>
                        <p className="text-xs text-slate-500 mt-1">
                            {mfaStatus?.enabled
                                ? "Your account is secured with Google Authenticator."
                                : "Add an extra layer of security to your account."}
                        </p>
                        {mfaStatus?.enabled && (
                            <span className="inline-flex items-center gap-1 mt-2 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                                <Lock className="h-3 w-3" /> Active
                            </span>
                        )}
                    </div>
                    {mfaStatus?.enabled ? (
                        <button
                            onClick={handleDisableMfa}
                            disabled={isLoadingMfa}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-red-500/25 text-red-400 hover:bg-red-500/10 transition-all text-sm font-medium disabled:opacity-50 flex-shrink-0"
                        >
                            {isLoadingMfa ? <Loader2 className="h-4 w-4 animate-spin" /> : "Disable 2FA"}
                        </button>
                    ) : (
                        <button
                            onClick={() => setShowMfaSetup(true)}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 hover:bg-cyan-500/15 transition-all text-sm font-semibold flex-shrink-0"
                        >
                            <ShieldCheck className="h-4 w-4" /> Enable 2FA
                        </button>
                    )}
                </div>
            </motion.div>

            {/* Notification Settings */}
            <motion.div variants={item}><NotificationSettings /></motion.div>

            {/* Import Holdings */}
            <motion.div variants={item} className="rounded-2xl border border-cyan-500/10 bg-[#0d1320]/80 p-6">
                <h2 className="font-semibold text-white text-sm tracking-widest uppercase mb-5 flex items-center gap-2">
                    <FileSpreadsheet className="h-4 w-4 text-cyan-400" /> Import Holdings
                </h2>
                <div className="max-w-xl"><ImportZone /></div>
            </motion.div>

            {/* Danger Zone */}
            <motion.div variants={item} className="rounded-2xl border border-red-500/15 bg-red-500/3 p-6">
                <h2 className="font-semibold text-red-400 text-sm tracking-widest uppercase mb-5 flex items-center gap-2">
                    <Trash2 className="h-4 w-4" /> Danger Zone
                </h2>
                <div className="flex flex-col sm:flex-row gap-3">
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-700/60 text-slate-400 hover:text-slate-200 hover:border-slate-600 bg-[#0a0e1a] transition-all text-sm font-medium"
                    >
                        <LogOut className="h-4 w-4" /> Sign Out
                    </button>
                    <button
                        onClick={handleDeleteAccount}
                        disabled={isDeleting}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-600/80 hover:bg-red-600 text-white transition-all text-sm font-semibold border border-red-500/30 disabled:opacity-60"
                    >
                        {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        {isDeleting ? "Deleting…" : "Delete Account"}
                    </button>
                </div>
            </motion.div>

            {/* MFA Setup Modal */}
            {showMfaSetup && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0a0e1a]/80 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-2xl border border-cyan-500/15 bg-[#0d1320] shadow-2xl shadow-cyan-500/10 relative p-6">
                        <button
                            onClick={() => setShowMfaSetup(false)}
                            className="absolute top-4 right-4 text-slate-500 hover:text-slate-300 transition-colors"
                        >
                            <X className="h-5 w-5" />
                        </button>
                        <MFASetup
                            onComplete={() => { setShowMfaSetup(false); loadMfaStatus(); }}
                            onCancel={() => setShowMfaSetup(false)}
                        />
                    </div>
                </div>
            )}
        </motion.div>
    );
}
