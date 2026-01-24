"use client";

/**
 * Forgot Password Page
 * =====================
 * Secure password reset request with:
 * - Email input validation
 * - Generic success message (no account enumeration)
 * - Rate limit awareness
 */

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ArrowLeft, Mail, Loader2, CheckCircle } from "lucide-react";
import { useState } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);

    const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!isEmailValid) {
            toast.error("Please enter a valid email address");
            return;
        }

        setIsLoading(true);

        try {
            await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/auth/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email.toLowerCase().trim() })
            });
            
            // Always show success (no account enumeration)
            setIsSubmitted(true);
        } catch (error) {
            // Still show success to prevent enumeration
            setIsSubmitted(true);
        } finally {
            setIsLoading(false);
        }
    };

    if (isSubmitted) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-slate-50">
                <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-green-500/5 blur-3xl" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-primary/10 blur-3xl" />

                <Card variant="glass-card" className="w-full max-w-md p-8 relative z-10 text-center">
                    <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
                        <CheckCircle className="h-8 w-8 text-green-600" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900 mb-2">Check Your Email</h1>
                    <p className="text-slate-500 mb-6">
                        If an account with <strong>{email}</strong> exists, you will receive a password reset link shortly.
                    </p>
                    <p className="text-sm text-slate-400 mb-6">
                        The link will expire in 1 hour for security reasons.
                    </p>
                    <Link href="/login">
                        <Button variant="outline" className="w-full">
                            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Login
                        </Button>
                    </Link>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-slate-50">
            <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-secondary/5 blur-3xl animate-[float_10s_ease-in-out_infinite]" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-primary/10 blur-3xl animate-[float_12s_ease-in-out_infinite_reverse]" />

            <div className="absolute top-4 left-4 sm:top-8 sm:left-8">
                <Link href="/login" className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors">
                    <ArrowLeft className="h-4 w-4" /> Back to Login
                </Link>
            </div>

            <Card variant="glass-card" className="w-full max-w-md p-8 relative z-10">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                        <Mail className="h-8 w-8 text-primary" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900">Forgot Password?</h1>
                    <p className="text-slate-500 mt-2">
                        Enter your email and we'll send you a reset link
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Email Address</label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@example.com"
                            className={`w-full px-4 py-3 rounded-xl bg-white/50 border ${
                                email && !isEmailValid ? 'border-red-300' : 'border-slate-200'
                            } focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-medium text-slate-900`}
                        />
                        {email && !isEmailValid && (
                            <p className="text-xs text-red-500">Please enter a valid email address</p>
                        )}
                    </div>

                    <Button 
                        className="w-full text-lg font-semibold py-6" 
                        size="lg" 
                        disabled={isLoading || !isEmailValid}
                    >
                        {isLoading ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                            "Send Reset Link"
                        )}
                    </Button>

                    <p className="text-center text-sm text-slate-500">
                        Remember your password?{" "}
                        <Link href="/login" className="text-primary font-semibold hover:underline">
                            Sign In
                        </Link>
                    </p>
                </form>
            </Card>
        </div>
    );
}
