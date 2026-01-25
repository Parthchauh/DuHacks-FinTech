"use client";

/**
 * Settings Page
 * ==============
 * User profile settings with proper API integration.
 */

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ImportZone } from "@/components/dashboard/ImportZone";
import { NotificationSettings } from "@/components/dashboard/NotificationSettings";
import { MFASetup } from "@/components/auth/MFASetup";
import { usePortfolioStore } from "@/lib/store";
import { api } from "@/lib/api";
import { Save, Trash2, User, Loader2, FileSpreadsheet, ShieldCheck, X } from "lucide-react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Swal from 'sweetalert2';

export default function SettingsPage() {
    const router = useRouter();
    const { user, isAuthenticated, fetchUser, logout, deleteAccount } = usePortfolioStore();
    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    
    // MFA State
    const [mfaStatus, setMfaStatus] = useState<{ enabled: boolean; method: string } | null>(null);
    const [showMfaSetup, setShowMfaSetup] = useState(false);
    const [isLoadingMfa, setIsLoadingMfa] = useState(false);

    useEffect(() => {
        if (!isAuthenticated) {
            router.push('/login');
            return;
        }
        fetchUser();
        fetchMfaStatus();
    }, [isAuthenticated, router, fetchUser]);

    // Update form when user data loads
    useEffect(() => {
        if (user) {
            setFullName(user.full_name || "");
            setEmail(user.email || "");
        }
    }, [user]);

    const fetchMfaStatus = async () => {
        try {
            const status = await api.getMfaStatus();
            setMfaStatus({
                enabled: status.totp_enabled,
                method: status.method
            });
        } catch (error) {
            console.error("Failed to fetch MFA status", error);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await api.updateMe({ full_name: fullName });
            toast.success("Settings saved successfully!");
            fetchUser();
        } catch (error: any) {
            toast.error(error.detail || "Failed to save settings");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDisableMfa = async () => {
        const result = await Swal.fire({
            title: 'Disable 2FA?',
            text: "Your account will be less secure without Two-Factor Authentication.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#f59e0b',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'Yes, Disable',
            customClass: {
                popup: 'rounded-2xl',
                confirmButton: 'px-6 py-2.5 rounded-xl font-bold',
                cancelButton: 'px-6 py-2.5 rounded-xl font-medium'
            }
        });

        if (result.isConfirmed) {
            setIsLoadingMfa(true);
            try {
                await api.disableMfa();
                toast.success("MFA disabled successfully");
                fetchMfaStatus();
            } catch (error) {
                toast.error("Failed to disable MFA");
            } finally {
                setIsLoadingMfa(false);
            }
        }
    };

    const handleLogout = () => {
        Swal.fire({
            title: 'Sign Out?',
            text: "Are you sure you want to end your session?",
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#2563eb',
            cancelButtonColor: '#94a3b8',
            confirmButtonText: 'Yes, Sign Out',
            padding: '2em',
            customClass: {
                popup: 'rounded-2xl',
                confirmButton: 'px-6 py-2.5 rounded-xl font-semibold',
                cancelButton: 'px-6 py-2.5 rounded-xl font-medium'
            }
        }).then((result) => {
            if (result.isConfirmed) {
                logout();
                router.push('/login');
            }
        });
    };

    const handleDeleteAccount = async () => {
        const result = await Swal.fire({
            title: 'Delete Account?',
            html: "This action is <b style='color:#dc2626'>PERMANENT</b> and cannot be undone.<br>All your portfolios, holdings, and transaction history will be erased immediately.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc2626',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'Yes, Delete Everything',
            cancelButtonText: 'Cancel',
            padding: '2em',
            customClass: {
                popup: 'rounded-2xl',
                confirmButton: 'px-6 py-2.5 rounded-xl font-bold',
                cancelButton: 'px-6 py-2.5 rounded-xl font-medium'
            }
        });

        if (result.isConfirmed) {
            const { value: confirmText } = await Swal.fire({
                title: 'Final Confirmation',
                text: "Please type 'DELETE' to confirm account destruction.",
                input: 'text',
                inputPlaceholder: 'DELETE',
                icon: 'error',
                showCancelButton: true,
                confirmButtonColor: '#dc2626',
                cancelButtonColor: '#64748b',
                confirmButtonText: 'Permanently Delete',
                padding: '2em',
                customClass: {
                    popup: 'rounded-2xl',
                    confirmButton: 'px-6 py-2.5 rounded-xl font-bold',
                    cancelButton: 'px-6 py-2.5 rounded-xl font-medium'
                },
                preConfirm: (text) => {
                    if (text !== 'DELETE') {
                        Swal.showValidationMessage('You must type DELETE precisely.');
                    }
                    return text;
                }
            });

            if (confirmText === 'DELETE') {
                setIsDeleting(true);
                const success = await deleteAccount();
                if (success) {
                    await Swal.fire({
                        title: 'Account Deleted',
                        text: 'Your account has been successfully removed.',
                        icon: 'success',
                        timer: 2000,
                        showConfirmButton: false,
                        padding: '2em',
                        customClass: { popup: 'rounded-2xl' }
                    });
                    router.push('/register');
                } else {
                    toast.error("Failed to delete account");
                    setIsDeleting(false);
                }
            }
        }
    };

    return (
        <div className="space-y-8 max-w-4xl relative">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
                <p className="text-slate-500">Manage your account and preferences.</p>
            </div>

            {/* Profile Card */}
            <Card className="p-8">
                <h2 className="text-lg font-semibold text-slate-900 mb-6 flex items-center gap-2">
                    <User className="h-5 w-5 text-slate-500" /> Profile Information
                </h2>

                <div className="space-y-6 max-w-lg">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Full Name</label>
                        <input
                            type="text"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            placeholder="Enter your full name"
                            className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/50 text-slate-900"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Email Address</label>
                        <input
                            type="email"
                            value={email}
                            disabled
                            className="w-full px-4 py-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-500 cursor-not-allowed"
                        />
                        <p className="text-xs text-slate-400">Email cannot be changed</p>
                    </div>

                    <div className="pt-2">
                        <Button onClick={handleSave} disabled={isSaving}>
                            {isSaving ? (
                                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
                            ) : (
                                <><Save className="mr-2 h-4 w-4" /> Save Changes</>
                            )}
                        </Button>
                    </div>
                </div>
            </Card>
            
            {/* Security Settings Card */}
            <Card className="p-8">
                <h2 className="text-lg font-semibold text-slate-900 mb-6 flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-slate-500" /> Security Settings
                </h2>
                
                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100 gap-4">
                    <div>
                        <h3 className="font-semibold text-slate-900">Two-Factor Authentication (2FA)</h3>
                        <p className="text-sm text-slate-500 mt-1">
                            {mfaStatus?.enabled 
                                ? "Your account is secured with Google Authenticator."
                                : "Add an extra layer of security to your account."}
                        </p>
                    </div>
                    
                    {mfaStatus?.enabled ? (
                        <Button 
                            variant="outline" 
                            className="w-full sm:w-auto bg-white hover:bg-red-50 text-red-600 border-red-100 hover:border-red-200"
                            onClick={handleDisableMfa}
                            disabled={isLoadingMfa}
                        >
                            {isLoadingMfa ? <Loader2 className="h-4 w-4 animate-spin" /> : "Disable 2FA"}
                        </Button>
                    ) : (
                        <Button 
                            className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-white shadow-sm shadow-primary/20"
                            onClick={() => setShowMfaSetup(true)}
                        >
                            Enable 2FA
                        </Button>
                    )}
                </div>
            </Card>

            <NotificationSettings />

            <Card className="p-8">
                <h2 className="text-lg font-semibold text-slate-900 mb-6 flex items-center gap-2">
                    <FileSpreadsheet className="h-5 w-5 text-slate-500" /> Import Holdings
                </h2>
                <div className="max-w-xl">
                    <ImportZone />
                </div>
            </Card>

            <Card className="p-8 border-red-100 bg-red-50/30">
                <h2 className="text-lg font-semibold text-red-900 mb-2 flex items-center gap-2">
                    <Trash2 className="h-5 w-5" /> Danger Zone
                </h2>
                <div className="flex flex-col sm:flex-row gap-4 mt-6">
                    <Button 
                        variant="outline" 
                        className="bg-white hover:bg-slate-50 text-slate-700 border-slate-200" 
                        onClick={handleLogout}
                    >
                        Sign Out
                    </Button>
                    <Button 
                        variant="destructive" 
                        className="bg-red-600 hover:bg-red-700 text-white border-none shadow-sm shadow-red-200" 
                        onClick={handleDeleteAccount}
                        disabled={isDeleting}
                    >
                        {isDeleting ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deleting...</>
                        ) : (
                            <><Trash2 className="mr-2 h-4 w-4" /> Delete Account</>
                        )}
                    </Button>
                </div>
            </Card>
            
            {/* MFA Setup Modal Overlay */}
            {showMfaSetup && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <Card className="w-full max-w-md bg-white shadow-2xl relative animate-in zoom-in-95 duration-200">
                        <button 
                            onClick={() => setShowMfaSetup(false)}
                            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
                        >
                            <X className="h-5 w-5" />
                        </button>
                        <div className="p-6">
                            <MFASetup 
                                onComplete={() => {
                                    setShowMfaSetup(false);
                                    fetchMfaStatus();
                                }} 
                                onCancel={() => setShowMfaSetup(false)} 
                            />
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
}
