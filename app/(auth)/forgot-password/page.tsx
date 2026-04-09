"use client";

/**
 * Forgot Password Page — Dark Vault Theme
 * ==========================================
 * Email submission → backend password reset email
 * Generic success prevents email enumeration attacks
 */

import Link from "next/link";
import { useState } from "react";
import { TrendingUp, Lock, Mail, ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const isEmailValid = email === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            await fetch(
                `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/auth/forgot-password`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email: email.toLowerCase().trim() }),
                }
            );
        } catch {
            // Fall through — show success regardless to prevent enumeration
        } finally {
            setSubmitted(true);
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col bg-[#0a0e1a] text-white relative overflow-hidden">
            {/* Background */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] bg-cyan-500/5 rounded-full blur-[140px]" />
                <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] bg-teal-500/5 rounded-full blur-[120px]" />
                <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(6,182,212,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(6,182,212,0.03)_1px,transparent_1px)] bg-[size:60px_60px]" />
            </div>

            {/* Nav */}
            <nav className="relative z-20 flex items-center justify-between px-6 sm:px-10 py-5">
                <Link href="/" className="flex items-center gap-3 group">
                    <div className="p-2 bg-gradient-to-br from-cyan-500 to-teal-500 rounded-lg shadow-lg shadow-cyan-500/20">
                        <TrendingUp className="h-5 w-5 text-[#0a0e1a]" />
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-lg font-bold tracking-widest text-white">OPTIWEALTH</span>
                        <span className="text-slate-600">|</span>
                        <span className="text-sm tracking-[0.3em] text-slate-400 uppercase">The Vault</span>
                    </div>
                </Link>
                <div className="flex items-center gap-2 text-xs tracking-widest text-slate-400 uppercase">
                    <span>Secured Connection</span>
                    <Lock className="h-3.5 w-3.5 text-cyan-400" />
                </div>
            </nav>

            <main className="flex-1 flex items-center justify-center px-4 sm:px-6 py-8">
                <div className="w-full max-w-md">
                    <div className="rounded-2xl border border-cyan-500/10 bg-[#0d1320]/60 backdrop-blur-xl p-8 sm:p-10 shadow-2xl shadow-cyan-500/5">
                        {submitted ? (
                            <div className="text-center space-y-5">
                                <div className="inline-flex p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 mb-2">
                                    <CheckCircle2 className="h-8 w-8 text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.4)]" />
                                </div>
                                <h1 className="text-2xl font-bold text-white">Check Your Email</h1>
                                <p className="text-slate-400 text-sm leading-relaxed">
                                    If <strong className="text-slate-200">{email}</strong> is registered, we&apos;ve sent a secure reset link. The link expires in 1 hour.
                                </p>
                                <Link
                                    href="/login"
                                    className="inline-flex items-center gap-2 mt-2 text-sm font-semibold text-cyan-400 hover:text-cyan-300 transition-colors"
                                >
                                    <ArrowLeft className="h-4 w-4" /> Back to Login
                                </Link>
                            </div>
                        ) : (
                            <>
                                <div className="text-center mb-8">
                                    <div className="inline-flex p-3.5 rounded-2xl bg-gradient-to-br from-cyan-500/10 to-teal-500/5 border border-cyan-500/20 mb-5">
                                        <Lock className="h-7 w-7 text-cyan-400 drop-shadow-[0_0_6px_rgba(0,229,255,0.3)]" />
                                    </div>
                                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                                        Recover Vault Access
                                    </h1>
                                    <p className="text-slate-400 mt-2 text-sm">
                                        Enter your email to receive a secure reset link.
                                    </p>
                                </div>

                                <form onSubmit={handleSubmit} className="space-y-5">
                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold tracking-widest text-slate-400 uppercase ml-1">
                                            Email Address
                                        </label>
                                        <div className="relative">
                                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600" />
                                            <input
                                                type="email"
                                                required
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                placeholder="name@company.com"
                                                autoComplete="email"
                                                className={`w-full pl-11 pr-4 py-3.5 rounded-xl bg-[#0a0e1a] border ${
                                                    email && !isEmailValid
                                                        ? "border-red-500/50"
                                                        : "border-slate-700/50 focus:border-cyan-500/50"
                                                } focus:ring-2 focus:ring-cyan-500/20 focus:outline-none text-white placeholder:text-slate-600 text-sm transition-all`}
                                            />
                                        </div>
                                        {email && !isEmailValid && (
                                            <p className="text-xs text-red-400 ml-1">Please enter a valid email address</p>
                                        )}
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={isLoading || (email.length > 0 && !isEmailValid)}
                                        className="w-full py-4 mt-2 text-sm font-bold tracking-[0.25em] uppercase rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 text-[#0a0e1a] shadow-lg shadow-cyan-500/25 hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-60"
                                    >
                                        {isLoading ? (
                                            <Loader2 className="animate-spin mx-auto h-5 w-5" />
                                        ) : (
                                            "Send Reset Link"
                                        )}
                                    </button>

                                    <Link
                                        href="/login"
                                        className="flex items-center justify-center gap-2 text-sm text-slate-500 hover:text-cyan-400 transition-colors mt-2"
                                    >
                                        <ArrowLeft className="h-4 w-4" />
                                        Back to Login
                                    </Link>
                                </form>
                            </>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
