"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/Button";
import { Loader2, Copy, Check, ShieldCheck, AlertTriangle } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { usePortfolioStore } from "@/lib/store";

interface MFASetupProps {
    onComplete: () => void;
    onCancel: () => void;
}

export function MFASetup({ onComplete, onCancel }: MFASetupProps) {
    const [step, setStep] = useState<1 | 2>(1); // 1: Setup/QR, 2: Verification
    const [secret, setSecret] = useState("");
    const [uri, setUri] = useState("");
    const [backupCodes, setBackupCodes] = useState<string[]>([]);
    const [code, setCode] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isCopying, setIsCopying] = useState(false);
    
    // Fetch setup details immediately on mount
    const fetchSetup = async () => {
        setIsLoading(true);
        try {
            const response = await api.setupTotp();
            
            setSecret(response.secret);
            setUri(response.uri);
            setBackupCodes(response.backup_codes);
        } catch (error) {
            toast.error("Failed to initialize MFA setup");
            onCancel();
        } finally {
            setIsLoading(false);
        }
    };
    
    // Call fetchSetup only once
    useState(() => {
        fetchSetup();
    });

    const handleCopySecret = () => {
        navigator.clipboard.writeText(secret);
        setIsCopying(true);
        toast.success("Secret copied to clipboard");
        setTimeout(() => setIsCopying(false), 2000);
    };

    const handleCopyCodes = () => {
        navigator.clipboard.writeText(backupCodes.join("\n"));
        toast.success("Backup codes copied");
    };

    const handleVerify = async () => {
        if (code.length !== 6) return;
        
        setIsLoading(true);
        try {
            await api.confirmTotp(code);
            
            toast.success("Authenticator enabled successfully");
            onComplete();
        } catch (error: any) {
            toast.error(error.detail || "Invalid code. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    if (step === 1) {
        return (
            <div className="space-y-6">
                <div className="text-center space-y-2">
                    <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto text-primary">
                        <ShieldCheck className="h-6 w-6" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900">Setup Authenticator</h3>
                    <p className="text-sm text-slate-500">
                        Scan the QR code with Google Authenticator or any TOTP app.
                    </p>
                </div>

                <div className="flex justify-center p-6 bg-white rounded-xl border border-slate-200 shadow-sm">
                    {uri ? (
                        <QRCodeSVG value={uri} size={180} level={"H"} includeMargin={true} />
                    ) : (
                        <div className="h-[180px] w-[180px] flex items-center justify-center">
                            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                        </div>
                    )}
                </div>

                <div className="space-y-2">
                    <label className="text-xs uppercase font-bold text-slate-400">Or enter manually</label>
                    <div className="flex gap-2">
                        <code className="flex-1 p-3 bg-slate-50 rounded-lg border border-slate-200 text-sm font-mono text-slate-600 break-all">
                            {secret || "Loading..."}
                        </code>
                        <Button variant="outline" size="icon" onClick={handleCopySecret} disabled={!secret}>
                            {isCopying ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                        </Button>
                    </div>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-2">
                    <div className="flex items-center gap-2 text-amber-700 font-semibold text-sm">
                        <AlertTriangle className="h-4 w-4" />
                        <span>Save Backup Codes</span>
                    </div>
                    <p className="text-xs text-amber-600">
                        If you lose access to your device, these codes are the only way to recover your account.
                    </p>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                        {backupCodes.slice(0, 4).map((c, i) => (
                            <code key={i} className="text-xs bg-white px-2 py-1 rounded border border-amber-100 text-amber-800">
                                {c}
                            </code>
                        ))}
                    </div>
                    <Button variant="ghost" size="sm" className="w-full text-amber-700 hover:text-amber-800 hover:bg-amber-100/50 h-8 text-xs" onClick={handleCopyCodes}>
                        <Copy className="h-3 w-3 mr-1" /> Copy All Codes
                    </Button>
                </div>

                <div className="flex gap-3">
                    <Button variant="ghost" className="flex-1" onClick={onCancel}>Cancel</Button>
                    <Button className="flex-1" onClick={() => setStep(2)} disabled={!secret}>
                        Next Step
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="text-center space-y-2">
                <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto text-primary">
                    <ShieldCheck className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Verify Setup</h3>
                <p className="text-sm text-slate-500">
                    Enter the 6-digit code from your authenticator app to enable MFA.
                </p>
            </div>

            <div className="p-4">
                <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    className="w-full text-center text-3xl font-bold tracking-[0.5em] py-4 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/50 text-slate-800 placeholder:text-slate-200 transition-all"
                    maxLength={6}
                    autoFocus
                />
            </div>

            <div className="flex gap-3">
                <Button variant="ghost" className="flex-1" onClick={() => setStep(1)}>Back</Button>
                <Button 
                    className="flex-1" 
                    onClick={handleVerify} 
                    disabled={code.length !== 6 || isLoading}
                >
                    {isLoading ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : null}
                    Confirm & Enable
                </Button>
            </div>
        </div>
    );
}
