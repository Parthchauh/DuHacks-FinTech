"use client";

/**
 * Reset Password Page
 * ====================
 * Secure password reset with:
 * - Token validation
 * - Password strength meter
 * - Confirm password
 * - Expiry handling
 */

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ArrowLeft, Lock, Loader2, CheckCircle, XCircle, Eye, EyeOff, Check, X } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";

import { Suspense } from "react";

// Password strength calculation
function calculatePasswordStrength(password: string) {
    const checks = [
        { label: "At least 8 characters", passed: password.length >= 8 },
        { label: "Contains uppercase letter", passed: /[A-Z]/.test(password) },
        { label: "Contains lowercase letter", passed: /[a-z]/.test(password) },
        { label: "Contains a number", passed: /\d/.test(password) },
        { label: "Contains special character", passed: /[!@#$%^&*(),.?":{}|<>]/.test(password) },
    ];

    const passedCount = checks.filter(c => c.passed).length;
    let score = (passedCount / checks.length) * 100;
    
    if (password.length >= 12) score = Math.min(100, score + 10);
    if (password.length >= 16) score = Math.min(100, score + 10);

    let label = "Weak";
    let color = "bg-red-500";
    
    if (score >= 80) { label = "Strong"; color = "bg-green-500"; }
    else if (score >= 60) { label = "Good"; color = "bg-yellow-500"; }
    else if (score >= 40) { label = "Fair"; color = "bg-orange-500"; }

    return { score, label, color, checks };
}

function ResetPasswordContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const token = searchParams.get("token");

    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isValidating, setIsValidating] = useState(true);
    const [isTokenValid, setIsTokenValid] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const passwordStrength = useMemo(() => calculatePasswordStrength(password), [password]);
    const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;
    const isFormValid = passwordStrength.score >= 60 && passwordsMatch;

    // Validate token on mount
    useEffect(() => {
        if (!token) {
            setIsValidating(false);
            return;
        }

        fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/auth/verify-reset-token?token=${token}`)
            .then(res => {
                setIsTokenValid(res.ok);
                setIsValidating(false);
            })
            .catch(() => {
                setIsTokenValid(false);
                setIsValidating(false);
            });
    }, [token]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!isFormValid) return;

        setIsLoading(true);

        try {
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/auth/reset-password`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token, new_password: password })
                }
            );

            if (response.ok) {
                setIsSuccess(true);
                toast.success("Password reset successfully!");
            } else {
                const data = await response.json();
                toast.error(data.detail || "Failed to reset password");
            }
        } catch (error) {
            toast.error("An error occurred. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    // Loading state
    if (isValidating) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    // Invalid/expired token
    if (!token || !isTokenValid) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
                <Card variant="glass-card" className="w-full max-w-md p-8 text-center">
                    <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-6">
                        <XCircle className="h-8 w-8 text-red-600" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900 mb-2">Link Expired</h1>
                    <p className="text-slate-500 mb-6">
                        This password reset link is invalid or has expired. Please request a new one.
                    </p>
                    <Link href="/forgot-password">
                        <Button className="w-full">Request New Link</Button>
                    </Link>
                </Card>
            </div>
        );
    }

    // Success state
    if (isSuccess) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
                <Card variant="glass-card" className="w-full max-w-md p-8 text-center">
                    <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
                        <CheckCircle className="h-8 w-8 text-green-600" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900 mb-2">Password Reset!</h1>
                    <p className="text-slate-500 mb-6">
                        Your password has been successfully reset. You can now log in with your new password.
                    </p>
                    <Link href="/login">
                        <Button className="w-full">Go to Login</Button>
                    </Link>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-slate-50">
            <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-secondary/5 blur-3xl" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-primary/10 blur-3xl" />

            <Card variant="glass-card" className="w-full max-w-md p-8 relative z-10">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                        <Lock className="h-8 w-8 text-primary" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900">Reset Password</h1>
                    <p className="text-slate-500 mt-2">Choose a strong new password</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* New Password */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">New Password</label>
                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full px-4 py-3 pr-12 rounded-xl bg-white/50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/50 font-medium text-slate-900"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                            </button>
                        </div>
                        
                        {/* Password Strength Meter - Compact Design like Register Page */}
                        {password.length > 0 && (
                            <div className="mt-2 space-y-1.5">
                                {/* Progress Bar */}
                                <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                    <div 
                                        className={`h-full transition-all duration-500 ease-out ${
                                            passwordStrength.score >= 80 ? 'bg-green-500' :
                                            passwordStrength.score >= 60 ? 'bg-yellow-500' :
                                            passwordStrength.score >= 40 ? 'bg-orange-500' : 'bg-red-500'
                                        }`}
                                        style={{ width: `${passwordStrength.score}%` }}
                                    />
                                </div>
                                {/* Label */}
                                <p className={`text-xs ${
                                    passwordStrength.score >= 80 ? 'text-green-600' :
                                    passwordStrength.score >= 60 ? 'text-yellow-600' :
                                    passwordStrength.score >= 40 ? 'text-orange-500' : 'text-red-500'
                                }`}>
                                    <span className="font-medium">{passwordStrength.label}</span>
                                    <span className="text-slate-400 ml-1">
                                        — Use 8+ chars with uppercase, lowercase, number & special character
                                    </span>
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Confirm Password */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Confirm Password</label>
                        <div className="relative">
                            <input
                                type={showConfirmPassword ? "text" : "password"}
                                required
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="••••••••"
                                className={`w-full px-4 py-3 pr-12 rounded-xl bg-white/50 border ${
                                    confirmPassword && !passwordsMatch ? 'border-red-300' : 'border-slate-200'
                                } focus:outline-none focus:ring-2 focus:ring-primary/50 font-medium text-slate-900`}
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                                {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                            </button>
                        </div>
                        {confirmPassword && !passwordsMatch && (
                            <p className="text-xs text-red-500 flex items-center gap-1">
                                <X className="h-3 w-3" /> Passwords do not match
                            </p>
                        )}
                        {passwordsMatch && (
                            <p className="text-xs text-green-500 flex items-center gap-1">
                                <Check className="h-3 w-3" /> Passwords match
                            </p>
                        )}
                    </div>

                    <Button 
                        className="w-full text-lg font-semibold py-6" 
                        size="lg" 
                        disabled={isLoading || !isFormValid}
                    >
                        {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Reset Password"}
                    </Button>
                </form>
            </Card>
        </div>
    );
}

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        }>
            <ResetPasswordContent />
        </Suspense>
    );
}
