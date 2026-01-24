"use client";

/**
 * Security Settings Page - TOTP and IP Whitelisting
 * ===================================================
 * Configure MFA method and IP restrictions.
 */

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { 
    Shield, 
    Smartphone, 
    Mail, 
    Key, 
    Plus, 
    Trash2, 
    Check,
    Copy,
    QrCode,
    Loader2,
    AlertTriangle
} from "lucide-react";
import { toast } from "sonner";

export default function SecuritySettingsPage() {
    const [mfaMethod, setMfaMethod] = useState<"email" | "totp">("email");
    const [totpSecret, setTotpSecret] = useState<string | null>(null);
    const [totpUri, setTotpUri] = useState<string | null>(null);
    const [backupCodes, setBackupCodes] = useState<string[]>([]);
    const [showBackupCodes, setShowBackupCodes] = useState(false);
    const [isSettingUp, setIsSettingUp] = useState(false);
    const [verifyCode, setVerifyCode] = useState("");
    
    // IP Whitelist
    const [allowedIps, setAllowedIps] = useState<string[]>([]);
    const [newIp, setNewIp] = useState("");
    const [currentIp, setCurrentIp] = useState("");

    useEffect(() => {
        // Get current IP
        fetch("https://api.ipify.org?format=json")
            .then(res => res.json())
            .then(data => setCurrentIp(data.ip))
            .catch(() => setCurrentIp("Unable to detect"));
    }, []);

    const setupTotp = async () => {
        setIsSettingUp(true);
        try {
            const response = await fetch("http://localhost:8000/api/auth/mfa/setup-totp", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("access_token")}`,
                },
            });
            
            if (response.ok) {
                const data = await response.json();
                setTotpSecret(data.secret);
                setTotpUri(data.uri);
                setBackupCodes(data.backup_codes || []);
                toast.success("Scan the QR code with your authenticator app");
            } else {
                toast.error("Failed to generate TOTP secret");
            }
        } catch (error) {
            toast.error("Failed to setup TOTP");
        } finally {
            setIsSettingUp(false);
        }
    };

    const confirmTotp = async () => {
        if (verifyCode.length !== 6) {
            toast.error("Please enter a 6-digit code");
            return;
        }

        try {
            const response = await fetch("http://localhost:8000/api/auth/mfa/confirm-totp", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${localStorage.getItem("access_token")}`,
                },
                body: JSON.stringify({ code: verifyCode }),
            });

            if (response.ok) {
                setMfaMethod("totp");
                toast.success("Authenticator app enabled successfully");
                setShowBackupCodes(true);
            } else {
                toast.error("Invalid code. Please try again.");
            }
        } catch (error) {
            toast.error("Verification failed");
        }
    };

    const addIp = () => {
        // Basic IP validation
        const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
        if (!ipRegex.test(newIp)) {
            toast.error("Invalid IP address format");
            return;
        }
        if (allowedIps.includes(newIp)) {
            toast.error("IP already in whitelist");
            return;
        }
        setAllowedIps([...allowedIps, newIp]);
        setNewIp("");
        toast.success("IP added to whitelist");
    };

    const removeIp = (ip: string) => {
        setAllowedIps(allowedIps.filter(i => i !== ip));
        toast.success("IP removed from whitelist");
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.success("Copied to clipboard");
    };

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3 mb-8">
                <div className="p-3 bg-blue-100 rounded-xl">
                    <Shield className="h-7 w-7 text-blue-600" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Security Settings</h1>
                    <p className="text-sm text-slate-500">Configure MFA and access controls</p>
                </div>
            </div>

            {/* MFA Method Selection */}
            <Card className="p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-4">Two-Factor Authentication</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    {/* Email OTP Option */}
                    <button
                        onClick={() => setMfaMethod("email")}
                        className={`p-4 rounded-xl border-2 transition-all text-left ${
                            mfaMethod === "email" 
                                ? "border-blue-500 bg-blue-50" 
                                : "border-slate-200 hover:border-slate-300"
                        }`}
                    >
                        <div className="flex items-center gap-3 mb-2">
                            <Mail className={`h-5 w-5 ${mfaMethod === "email" ? "text-blue-600" : "text-slate-400"}`} />
                            <span className="font-medium text-slate-900">Email OTP</span>
                            {mfaMethod === "email" && <Check className="h-4 w-4 text-blue-600 ml-auto" />}
                        </div>
                        <p className="text-sm text-slate-500">Receive one-time codes via email</p>
                    </button>

                    {/* Authenticator App Option */}
                    <button
                        onClick={() => mfaMethod !== "totp" && setupTotp()}
                        className={`p-4 rounded-xl border-2 transition-all text-left ${
                            mfaMethod === "totp" 
                                ? "border-blue-500 bg-blue-50" 
                                : "border-slate-200 hover:border-slate-300"
                        }`}
                    >
                        <div className="flex items-center gap-3 mb-2">
                            <Smartphone className={`h-5 w-5 ${mfaMethod === "totp" ? "text-blue-600" : "text-slate-400"}`} />
                            <span className="font-medium text-slate-900">Authenticator App</span>
                            {mfaMethod === "totp" && <Check className="h-4 w-4 text-blue-600 ml-auto" />}
                        </div>
                        <p className="text-sm text-slate-500">Use Google/Microsoft Authenticator</p>
                    </button>
                </div>

                {/* TOTP Setup Flow */}
                {totpSecret && mfaMethod !== "totp" && (
                    <div className="bg-slate-50 rounded-xl p-6 space-y-4">
                        <div className="flex items-center gap-2 text-amber-600 mb-4">
                            <AlertTriangle className="h-5 w-5" />
                            <span className="font-medium">Complete setup to enable authenticator</span>
                        </div>

                        {/* QR Code Placeholder */}
                        <div className="flex justify-center">
                            <div className="w-48 h-48 bg-white rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center">
                                <div className="text-center">
                                    <QrCode className="h-12 w-12 text-slate-300 mx-auto mb-2" />
                                    <p className="text-xs text-slate-400">QR Code</p>
                                    <p className="text-xs text-slate-400">(Use TOTP URI)</p>
                                </div>
                            </div>
                        </div>

                        {/* Manual Entry */}
                        <div className="text-center">
                            <p className="text-sm text-slate-500 mb-2">Or enter manually:</p>
                            <div className="flex items-center justify-center gap-2">
                                <code className="px-3 py-2 bg-white rounded-lg text-sm font-mono text-slate-700 border">
                                    {totpSecret}
                                </code>
                                <Button size="sm" variant="ghost" onClick={() => copyToClipboard(totpSecret)}>
                                    <Copy className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>

                        {/* Verify Code */}
                        <div className="pt-4 border-t border-slate-200">
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Enter code from your app to verify:
                            </label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={verifyCode}
                                    onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                                    placeholder="000000"
                                    className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-center text-2xl tracking-widest font-mono"
                                    maxLength={6}
                                />
                                <Button onClick={confirmTotp} disabled={verifyCode.length !== 6}>
                                    Verify
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Backup Codes */}
                {showBackupCodes && backupCodes.length > 0 && (
                    <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                        <div className="flex items-center gap-2 text-amber-700 mb-3">
                            <Key className="h-5 w-5" />
                            <span className="font-medium">Save your backup codes</span>
                        </div>
                        <p className="text-sm text-amber-600 mb-4">
                            Store these codes in a safe place. Each code can only be used once.
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                            {backupCodes.map((code, i) => (
                                <code key={i} className="px-3 py-2 bg-white rounded text-sm font-mono text-center">
                                    {code}
                                </code>
                            ))}
                        </div>
                        <Button 
                            variant="outline" 
                            size="sm" 
                            className="mt-4"
                            onClick={() => copyToClipboard(backupCodes.join("\n"))}
                        >
                            <Copy className="h-4 w-4 mr-2" />
                            Copy All Codes
                        </Button>
                    </div>
                )}
            </Card>

            {/* IP Whitelisting */}
            <Card className="p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-2">IP Whitelisting</h2>
                <p className="text-sm text-slate-500 mb-4">
                    Restrict login to specific IP addresses. Leave empty to allow all IPs.
                </p>

                {/* Current IP */}
                <div className="flex items-center gap-2 text-sm text-slate-500 mb-4">
                    <span>Your current IP:</span>
                    <code className="px-2 py-1 bg-slate-100 rounded font-mono">{currentIp}</code>
                    <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => {
                            setNewIp(currentIp);
                        }}
                    >
                        Use This IP
                    </Button>
                </div>

                {/* Add IP */}
                <div className="flex gap-2 mb-4">
                    <input
                        type="text"
                        value={newIp}
                        onChange={(e) => setNewIp(e.target.value)}
                        placeholder="Enter IP address (e.g., 192.168.1.1)"
                        className="flex-1 px-4 py-2 border border-slate-300 rounded-lg"
                    />
                    <Button onClick={addIp}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add IP
                    </Button>
                </div>

                {/* Whitelist */}
                {allowedIps.length > 0 ? (
                    <div className="space-y-2">
                        {allowedIps.map((ip) => (
                            <div key={ip} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                                <code className="font-mono text-sm">{ip}</code>
                                <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => removeIp(ip)}
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-8 text-slate-400">
                        <Shield className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No IP restrictions configured</p>
                        <p className="text-xs">All IP addresses can access your account</p>
                    </div>
                )}
            </Card>
        </div>
    );
}
