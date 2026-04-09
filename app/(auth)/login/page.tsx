"use client";

/**
 * OptiWealth Login Page — Dark Vault Theme
 * ==========================================
 * Premium dark-themed login matching the Kinetic Vault design system:
 * - Dark background (#0a0e1a → #0d1320)
 * - Cyan/teal accent (#00e5ff → #06b6d4)
 * - Glassmorphism cards with subtle borders
 * - "OPTIWEALTH | THE VAULT" header
 * - "SECURED CONNECTION 🔒" badge
 * - Trust badges footer (AES-256, Real-Time, etc.)
 */

import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import { usePortfolioStore } from "@/lib/store";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api } from "@/lib/api";
import {
    TrendingUp,
    Loader2,
    Eye,
    EyeOff,
    ShieldCheck,
    Lock,
    RefreshCw,
    Shield,
    Zap,
    BarChart3,
    Globe,
} from "lucide-react";
import Swal from "sweetalert2";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [otp, setOtp] = useState("");

    // Email validation
    const showEmailError =
        email.includes("@") && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    // Captcha state
    const [showCaptcha, setShowCaptcha] = useState(false);
    const [captchaToken, setCaptchaToken] = useState("");
    const [captchaQuestion, setCaptchaQuestion] = useState("");
    const [captchaAnswer, setCaptchaAnswer] = useState("");

    const [isLoading, setIsLoading] = useState(false);
    const {
        login,
        verifyMfa,
        googleLogin,
        isAuthenticated,
        mfaRequired,
        error: storeError,
        resetError,
    } = usePortfolioStore();
    const router = useRouter();

    // Redirect if already authenticated
    useEffect(() => {
        if (isAuthenticated) {
            router.push("/dashboard");
        }
    }, [isAuthenticated, router]);

    // ── Google Sign-In ──
    const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

    const handleGoogleCredentialResponse = useCallback(
        async (response: any) => {
            setIsLoading(true);
            resetError();
            try {
                const success = await googleLogin(response.credential);
                if (success) {
                    toast.success("Google authentication successful!");
                    showDashboardLoader();
                }
            } catch {
                // Handled by store
            } finally {
                setIsLoading(false);
            }
        },
        [googleLogin, resetError]
    );

    useEffect(() => {
        if (!googleClientId) return;

        const script = document.createElement("script");
        script.src = "https://accounts.google.com/gsi/client";
        script.async = true;
        script.defer = true;
        script.onload = () => {
            window.google?.accounts.id.initialize({
                client_id: googleClientId,
                callback: handleGoogleCredentialResponse,
            });
            const el = document.getElementById("google-signin-login");
            if (el) {
                window.google?.accounts.id.renderButton(el, {
                    theme: "filled_black",
                    size: "large",
                    width: "100%",
                    text: "signin_with",
                    shape: "pill",
                });
            }
        };
        document.head.appendChild(script);
        return () => {
            document.head.removeChild(script);
        };
    }, [googleClientId, handleGoogleCredentialResponse]);

    useEffect(() => {
        if (storeError) {
            if (
                storeError.includes("Captcha") ||
                storeError.includes("Too many")
            ) {
                fetchCaptcha();
                setShowCaptcha(true);
            }
            toast.error(storeError);
        }
    }, [storeError]);

    const fetchCaptcha = async () => {
        try {
            const data = await api.getCaptcha();
            setCaptchaToken(data.token);
            setCaptchaQuestion(data.question);
            setCaptchaAnswer("");
        } catch {
            console.error("Failed to load captcha");
        }
    };

    const showDashboardLoader = () => {
        let timerInterval: ReturnType<typeof setInterval>;
        Swal.fire({
            title: "Decrypting Vault Access",
            html: `Initializing secure session in <b></b> ms...`,
            timer: 2000,
            timerProgressBar: true,
            backdrop: "rgba(10, 14, 26, 0.95)",
            background: "rgba(13, 19, 32, 0.95)",
            color: "#e2e8f0",
            customClass: {
                popup: "rounded-2xl border border-cyan-500/20 shadow-2xl shadow-cyan-500/10",
                title: "text-lg font-bold text-cyan-400 tracking-wider uppercase",
                htmlContainer: "text-slate-400",
                timerProgressBar: "bg-gradient-to-r from-cyan-500 to-teal-400",
            },
            allowOutsideClick: false,
            allowEscapeKey: false,
            didOpen: () => {
                Swal.showLoading();
                const timer = Swal.getPopup()?.querySelector("b");
                if (timer) {
                    timerInterval = setInterval(() => {
                        timer.textContent = `${Swal.getTimerLeft()}`;
                    }, 100);
                }
            },
            willClose: () => clearInterval(timerInterval),
        }).then((result) => {
            if (result.dismiss === Swal.DismissReason.timer) {
                router.push("/dashboard");
            }
        });
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        resetError();

        try {
            const success = await login(
                email,
                password,
                captchaToken,
                captchaAnswer
            );
            if (success) {
                showDashboardLoader();
            }
        } catch {
            // Handled by store
        } finally {
            setIsLoading(false);
        }
    };

    const handleMfaVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const success = await verifyMfa(otp);
            if (success) {
                showDashboardLoader();
            } else {
                toast.error("Invalid code");
            }
        } catch {
            toast.error("Verification failed");
        } finally {
            setIsLoading(false);
        }
    };

    // ══════════════════════════════════════════════════════════════════
    // MFA VERIFICATION VIEW
    // ══════════════════════════════════════════════════════════════════
    if (mfaRequired) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-[#0a0e1a]">
                {/* Background effects */}
                <div className="absolute inset-0">
                    <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-cyan-500/5 rounded-full blur-[120px]" />
                    <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-teal-500/5 rounded-full blur-[100px]" />
                </div>

                <div className="w-full max-w-md p-8 relative z-10 rounded-2xl border border-cyan-500/15 bg-[#0d1320]/80 backdrop-blur-xl shadow-2xl shadow-cyan-500/5">
                    <div className="text-center mb-8">
                        <div className="h-20 w-20 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mx-auto mb-4">
                            <ShieldCheck className="h-10 w-10 text-cyan-400 drop-shadow-[0_0_8px_rgba(0,229,255,0.4)]" />
                        </div>
                        <h1 className="text-2xl font-bold text-white tracking-wide">
                            SECURITY VERIFICATION
                        </h1>
                        <p className="text-slate-400 mt-2 text-sm tracking-wider uppercase">
                            Enter the 6-digit code sent to your email
                        </p>
                    </div>

                    <form onSubmit={handleMfaVerify} className="space-y-6">
                        <div className="relative group">
                            <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-teal-500 rounded-xl opacity-20 group-hover:opacity-40 transition duration-500 blur" />
                            <input
                                type="text"
                                required
                                value={otp}
                                onChange={(e) =>
                                    setOtp(
                                        e.target.value
                                            .replace(/\D/g, "")
                                            .slice(0, 6)
                                    )
                                }
                                placeholder="000000"
                                className="relative w-full px-4 py-5 text-center text-3xl tracking-[0.8em] font-bold rounded-xl bg-[#0a0e1a] border border-cyan-500/20 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 text-cyan-400 placeholder:text-slate-700 transition-all"
                                maxLength={6}
                                autoFocus
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-4 text-base font-bold tracking-widest uppercase rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 text-[#0a0e1a] shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-60"
                        >
                            {isLoading ? (
                                <Loader2 className="animate-spin mx-auto h-5 w-5" />
                            ) : (
                                "VERIFY & UNLOCK"
                            )}
                        </button>

                        <button
                            type="button"
                            onClick={() => window.location.reload()}
                            className="w-full text-sm font-medium text-slate-500 hover:text-cyan-400 transition-colors tracking-wider uppercase"
                        >
                            Back to Login
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    // ══════════════════════════════════════════════════════════════════
    // MAIN LOGIN VIEW — DARK VAULT THEME
    // ══════════════════════════════════════════════════════════════════
    return (
        <div className="min-h-screen flex flex-col bg-[#0a0e1a] text-white relative overflow-hidden">
            {/* ── Background Effects ────────────────────────────────── */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] bg-cyan-500/5 rounded-full blur-[140px]" />
                <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] bg-teal-500/5 rounded-full blur-[120px]" />
                {/* Grid */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(6,182,212,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(6,182,212,0.03)_1px,transparent_1px)] bg-[size:60px_60px]" />
            </div>

            {/* ── Top Navigation ────────────────────────────────────── */}
            <nav className="relative z-20 flex items-center justify-between px-6 sm:px-10 py-5">
                <Link href="/" className="flex items-center gap-3 group">
                    <div className="p-2 bg-gradient-to-br from-cyan-500 to-teal-500 rounded-lg shadow-lg shadow-cyan-500/20">
                        <TrendingUp className="h-5 w-5 text-[#0a0e1a]" />
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-lg font-bold tracking-widest text-white">
                            OPTIWEALTH
                        </span>
                        <span className="text-slate-600">|</span>
                        <span className="text-sm tracking-[0.3em] text-slate-400 uppercase">
                            The Vault
                        </span>
                    </div>
                </Link>
                <div className="flex items-center gap-2 text-xs tracking-widest text-slate-400 uppercase">
                    <span>Secured Connection</span>
                    <Lock className="h-3.5 w-3.5 text-cyan-400" />
                </div>
            </nav>

            {/* ── Main Content ──────────────────────────────────────── */}
            <main className="flex-1 flex items-center justify-center px-4 sm:px-6 py-8">
                <div className="w-full max-w-lg">
                    {/* Card */}
                    <div className="rounded-2xl border border-cyan-500/10 bg-[#0d1320]/60 backdrop-blur-xl p-8 sm:p-10 shadow-2xl shadow-cyan-500/5">
                        {/* Header */}
                        <div className="text-center mb-8">
                            <div className="inline-flex p-3.5 rounded-2xl bg-gradient-to-br from-cyan-500/10 to-teal-500/5 border border-cyan-500/20 mb-5">
                                <Lock className="h-7 w-7 text-cyan-400 drop-shadow-[0_0_6px_rgba(0,229,255,0.3)]" />
                            </div>
                            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                                Access Your Vault
                            </h1>
                            <p className="text-slate-400 mt-2 text-sm tracking-wide">
                                Sign in to your encrypted portfolio dashboard
                            </p>
                        </div>

                        <form onSubmit={handleLogin} className="space-y-5">
                            {/* Email */}
                            <div className="space-y-2">
                                <label className="text-xs font-semibold tracking-widest text-slate-400 uppercase ml-1">
                                    Email Address
                                </label>
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="name@company.com"
                                    className={`w-full px-4 py-3.5 rounded-xl bg-[#0a0e1a] border ${
                                        showEmailError
                                            ? "border-red-500/50 focus:ring-red-500/30"
                                            : "border-slate-700/50 focus:border-cyan-500/50 focus:ring-cyan-500/20"
                                    } focus:outline-none focus:ring-2 text-white placeholder:text-slate-600 text-sm transition-all`}
                                />
                                {showEmailError && (
                                    <p className="text-xs text-red-400 ml-1">
                                        Please enter a valid email address
                                    </p>
                                )}
                            </div>

                            {/* Password */}
                            <div className="space-y-2">
                                <div className="flex justify-between items-center ml-1">
                                    <label className="text-xs font-semibold tracking-widest text-slate-400 uppercase">
                                        Password
                                    </label>
                                    <Link
                                        href="/forgot-password"
                                        className="text-xs text-cyan-400 hover:text-cyan-300 font-medium tracking-wider transition-colors"
                                    >
                                        FORGOT?
                                    </Link>
                                </div>
                                <div className="relative">
                                    <input
                                        type={
                                            showPassword ? "text" : "password"
                                        }
                                        required
                                        value={password}
                                        onChange={(e) =>
                                            setPassword(e.target.value)
                                        }
                                        placeholder="••••••••"
                                        className="w-full px-4 py-3.5 pr-12 rounded-xl bg-[#0a0e1a] border border-slate-700/50 focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none text-white placeholder:text-slate-600 text-sm transition-all"
                                    />
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setShowPassword(!showPassword)
                                        }
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-cyan-400 transition-colors p-1"
                                    >
                                        {showPassword ? (
                                            <EyeOff className="h-4 w-4" />
                                        ) : (
                                            <Eye className="h-4 w-4" />
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Captcha */}
                            {showCaptcha && (
                                <div className="space-y-3 pt-2 p-4 bg-[#0a0e1a] rounded-xl border border-cyan-500/10 animate-in fade-in slide-in-from-top-4">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-semibold tracking-widest text-slate-400 uppercase">
                                            Security Check
                                        </label>
                                        <button
                                            type="button"
                                            onClick={fetchCaptcha}
                                            className="text-xs text-cyan-400 font-medium flex items-center gap-1 hover:text-cyan-300 tracking-wider"
                                        >
                                            <RefreshCw className="h-3 w-3" />{" "}
                                            REFRESH
                                        </button>
                                    </div>
                                    <div className="flex gap-3">
                                        <div className="flex-1 bg-[#0d1320] rounded-lg flex items-center justify-center font-mono font-bold text-lg text-cyan-400 border border-cyan-500/20 py-3">
                                            {captchaQuestion || "Loading..."}
                                        </div>
                                        <input
                                            type="text"
                                            required
                                            value={captchaAnswer}
                                            onChange={(e) =>
                                                setCaptchaAnswer(e.target.value)
                                            }
                                            placeholder="?"
                                            className="w-20 px-4 py-3 text-center rounded-lg bg-[#0d1320] border border-slate-700/50 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 font-bold text-white"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Submit */}
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full py-4 mt-2 text-sm font-bold tracking-[0.25em] uppercase rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 text-[#0a0e1a] shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-60"
                            >
                                {isLoading ? (
                                    <Loader2 className="animate-spin mx-auto h-5 w-5" />
                                ) : (
                                    "UNLOCK VAULT"
                                )}
                            </button>

                            {/* Divider */}
                            <div className="relative my-6">
                                <div className="absolute inset-0 flex items-center">
                                    <span className="w-full border-t border-slate-700/50" />
                                </div>
                                <div className="relative flex justify-center text-xs uppercase">
                                    <span className="bg-[#0d1320] px-3 text-slate-500 tracking-widest">
                                        or continue with
                                    </span>
                                </div>
                            </div>

                            {/* Google Sign-In */}
                            {googleClientId && (
                                <div
                                    id="google-signin-login"
                                    className="flex justify-center"
                                />
                            )}

                            {/* Register Link */}
                            <p className="text-center text-sm text-slate-500">
                                Don&apos;t have an account?{" "}
                                <Link
                                    href="/register"
                                    className="text-cyan-400 font-semibold hover:text-cyan-300 transition-colors tracking-wide"
                                >
                                    Initialize Vault →
                                </Link>
                            </p>
                        </form>
                    </div>
                </div>
            </main>

            {/* ── Trust Badges Footer ───────────────────────────────── */}
            <footer className="relative z-10 border-t border-slate-800/50 bg-[#0a0e1a]/80 backdrop-blur-sm">
                <div className="max-w-5xl mx-auto px-6 py-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        {[
                            {
                                icon: Shield,
                                title: "AES-256",
                                desc: "Bank-Grade Encryption",
                            },
                            {
                                icon: Zap,
                                title: "REAL-TIME",
                                desc: "Kinetic Data Feeds",
                            },
                            {
                                icon: BarChart3,
                                title: "AGILE REBALANCE",
                                desc: "AI-Driven Allocations",
                            },
                            {
                                icon: Globe,
                                title: "GLOBAL REACH",
                                desc: "Multi-Currency Vaults",
                            },
                        ].map((badge, i) => (
                            <div
                                key={i}
                                className="flex items-center gap-3 p-3 rounded-lg"
                            >
                                <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                                    <badge.icon className="h-4 w-4 text-cyan-400" />
                                </div>
                                <div>
                                    <p className="text-xs font-bold tracking-widest text-white">
                                        {badge.title}
                                    </p>
                                    <p className="text-[10px] text-slate-500 tracking-wider">
                                        {badge.desc}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-800/50">
                        <div className="flex gap-6 text-[10px] tracking-[0.3em] text-slate-600 uppercase">
                            <a href="#" className="hover:text-cyan-400 transition-colors">
                                Privacy
                            </a>
                            <a href="#" className="hover:text-cyan-400 transition-colors">
                                Security
                            </a>
                            <a href="#" className="hover:text-cyan-400 transition-colors">
                                Help
                            </a>
                        </div>
                        <p className="text-[10px] tracking-[0.2em] text-slate-700 uppercase">
                            © 2026 OptiWealth Kinetic Vault. All Assets
                            Secured.
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    );
}
