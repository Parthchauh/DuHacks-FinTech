"use client";

/**
 * OptiWealth Register Page — Dark Vault Theme
 * =============================================
 * Multi-step registration with:
 * - Client-side password validation (matches backend rules)
 * - Google Sign-In integration
 * - Specific error messages from backend
 * - Auto-login after registration
 */

import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { usePortfolioStore } from "@/lib/store";
import { toast } from "sonner";
import {
    TrendingUp,
    Loader2,
    Eye,
    EyeOff,
    Lock,
    Shield,
    Zap,
    BarChart3,
    Globe,
    User,
    Mail,
    KeyRound,
    CheckCircle2,
    Target,
    Gauge,
    ArrowRight,
    AlertCircle,
} from "lucide-react";
import Swal from "sweetalert2";

export default function RegisterPage() {
    const [step, setStep] = useState(1);
    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [riskProfile, setRiskProfile] = useState<
        "conservative" | "moderate" | "aggressive"
    >("moderate");
    const [isLoading, setIsLoading] = useState(false);

    const {
        register,
        googleLogin,
        isAuthenticated,
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

    // Show specific errors from store (backend propagated)
    useEffect(() => {
        if (storeError) {
            toast.error(storeError);
        }
    }, [storeError]);

    // ── Password Validation (matches backend rules exactly) ──
    const passwordChecks = [
        { label: "Min 8 characters", valid: password.length >= 8 },
        { label: "Uppercase letter", valid: /[A-Z]/.test(password) },
        { label: "Lowercase letter", valid: /[a-z]/.test(password) },
        { label: "Contains number", valid: /\d/.test(password) },
        {
            label: "Special character",
            valid: /[!@#$%^&*(),.?":{}|<>]/.test(password),
        },
    ];

    const allPasswordChecksPass = passwordChecks.every((c) => c.valid);
    const passwordScore = passwordChecks.filter((c) => c.valid).length;
    const passwordStrength =
        passwordScore <= 2 ? "weak" : passwordScore <= 4 ? "medium" : "strong";
    const passwordStrengthColor =
        passwordStrength === "weak"
            ? "bg-red-500"
            : passwordStrength === "medium"
            ? "bg-amber-500"
            : "bg-cyan-500";

    const passwordsMatch = password === confirmPassword && allPasswordChecksPass;
    const emailValid =
        email === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    const showEmailError =
        email.includes("@") && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    // Step 1 can proceed when all fields are valid
    const step1Valid =
        fullName.trim().length >= 2 &&
        emailValid &&
        email.length > 0 &&
        allPasswordChecksPass &&
        passwordsMatch;

    // ── Google Sign-In ──
    const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

    const handleGoogleCredentialResponse = useCallback(
        async (response: any) => {
            setIsLoading(true);
            resetError();
            try {
                const success = await googleLogin(response.credential);
                if (success) {
                    toast.success("Google account connected!");
                    showVaultLoader();
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
            const el = document.getElementById("google-signin-register");
            if (el) {
                window.google?.accounts.id.renderButton(el, {
                    theme: "filled_black",
                    size: "large",
                    width: "100%",
                    text: "signup_with",
                    shape: "pill",
                });
            }
        };
        document.head.appendChild(script);
        return () => {
            document.head.removeChild(script);
        };
    }, [googleClientId, handleGoogleCredentialResponse]);

    // ── Vault Loader ──
    const showVaultLoader = () => {
        let timerInterval: ReturnType<typeof setInterval>;
        Swal.fire({
            title: "Initializing Your Vault",
            html: "Generating encryption keys in <b></b> ms...",
            timer: 2500,
            timerProgressBar: true,
            backdrop: "rgba(10, 14, 26, 0.95)",
            background: "rgba(13, 19, 32, 0.95)",
            color: "#e2e8f0",
            customClass: {
                popup: "rounded-2xl border border-cyan-500/20 shadow-2xl shadow-cyan-500/10",
                title: "text-lg font-bold text-cyan-400 tracking-wider uppercase",
                htmlContainer: "text-slate-400",
                timerProgressBar:
                    "bg-gradient-to-r from-cyan-500 to-teal-400",
            },
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
                const timer = Swal.getPopup()?.querySelector("b");
                if (timer)
                    timerInterval = setInterval(
                        () => (timer.textContent = `${Swal.getTimerLeft()}`),
                        100
                    );
            },
            willClose: () => clearInterval(timerInterval),
        }).then((result) => {
            if (result.dismiss === Swal.DismissReason.timer)
                router.push("/dashboard");
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (step < 3) {
            setStep(step + 1);
            return;
        }

        // Client-side validation before submit
        if (!allPasswordChecksPass) {
            toast.error(
                "Password must include uppercase, lowercase, number, and special character"
            );
            return;
        }

        setIsLoading(true);
        resetError();
        try {
            const success = await register(fullName, email, password, riskProfile);
            if (success) {
                toast.success("Vault initialized!");
                showVaultLoader();
            }
        } catch {
            // Handled by store — specific error already shown via toast
        } finally {
            setIsLoading(false);
        }
    };

    const riskProfiles = [
        {
            id: "conservative" as const,
            title: "Conservative",
            roi: "+8.2%",
            desc: "Capital preservation, low volatility",
            color: "text-emerald-400",
            border: "border-emerald-500/30",
            bg: "bg-emerald-500/5",
        },
        {
            id: "moderate" as const,
            title: "Moderate",
            roi: "+14.7%",
            desc: "Balanced growth, steady returns",
            color: "text-cyan-400",
            border: "border-cyan-500/30",
            bg: "bg-cyan-500/5",
        },
        {
            id: "aggressive" as const,
            title: "Aggressive Growth",
            roi: "+142.4%",
            desc: "Maximum returns, higher risk",
            color: "text-amber-400",
            border: "border-amber-500/30",
            bg: "bg-amber-500/5",
        },
    ];

    // ══════════════════════════════════════════════════════════════════
    // RENDER
    // ══════════════════════════════════════════════════════════════════
    return (
        <div className="min-h-screen flex flex-col bg-[#0a0e1a] text-white relative overflow-hidden">
            {/* ── Background ────────────────────────────────────────── */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] bg-cyan-500/5 rounded-full blur-[140px]" />
                <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] bg-teal-500/5 rounded-full blur-[120px]" />
                <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(6,182,212,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(6,182,212,0.03)_1px,transparent_1px)] bg-[size:60px_60px]" />
            </div>

            {/* ── Header ────────────────────────────────────────────── */}
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

            {/* ── Error Banner ────────────────────────────────────── */}
            {storeError && (
                <div className="relative z-20 mx-auto max-w-xl w-full px-4">
                    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 mb-2">
                        <AlertCircle className="h-4 w-4 flex-shrink-0" />
                        <p className="text-sm">{storeError}</p>
                        <button
                            onClick={resetError}
                            className="ml-auto text-xs text-red-500 hover:text-red-400"
                        >
                            ✕
                        </button>
                    </div>
                </div>
            )}

            {/* ── Step Indicator ─────────────────────────────────────── */}
            <div className="relative z-10 flex items-center justify-center gap-4 sm:gap-8 py-4">
                {[
                    { num: 1, label: "Account" },
                    { num: 2, label: "Goals" },
                    { num: 3, label: "Risk" },
                ].map((s) => (
                    <div
                        key={s.num}
                        className="flex flex-col items-center gap-2"
                    >
                        <div
                            className={`h-10 w-10 rounded-xl flex items-center justify-center text-sm font-bold transition-all ${
                                step > s.num
                                    ? "bg-gradient-to-br from-cyan-500 to-teal-500 text-[#0a0e1a]"
                                    : step === s.num
                                    ? "border-2 border-cyan-400 text-cyan-400 shadow-lg shadow-cyan-500/20"
                                    : "border border-slate-700 text-slate-600"
                            }`}
                        >
                            {step > s.num ? (
                                <CheckCircle2 className="h-5 w-5" />
                            ) : (
                                s.num
                            )}
                        </div>
                        <span
                            className={`text-xs tracking-widest uppercase ${
                                step >= s.num
                                    ? "text-cyan-400"
                                    : "text-slate-600"
                            }`}
                        >
                            {s.label}
                        </span>
                    </div>
                ))}
            </div>

            {/* ── Main Content ──────────────────────────────────────── */}
            <main className="flex-1 flex items-center justify-center px-4 sm:px-6 py-6">
                <div className="w-full max-w-xl">
                    <div className="rounded-2xl border border-cyan-500/10 bg-[#0d1320]/60 backdrop-blur-xl p-8 sm:p-10 shadow-2xl shadow-cyan-500/5">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* ── STEP 1: Account Details ─────────── */}
                            {step === 1 && (
                                <>
                                    <div className="text-center mb-6">
                                        <div className="inline-flex p-3.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 mb-4">
                                            <KeyRound className="h-7 w-7 text-cyan-400 drop-shadow-[0_0_6px_rgba(0,229,255,0.3)]" />
                                        </div>
                                        <h2 className="text-2xl font-bold tracking-tight">
                                            Secure Your Vault
                                        </h2>
                                        <p className="text-slate-400 mt-1 text-sm">
                                            Create your encrypted identity to
                                            continue
                                        </p>
                                    </div>

                                    {/* Google Sign-In */}
                                    {googleClientId && (
                                        <div className="space-y-4">
                                            <div
                                                id="google-signin-register"
                                                className="flex justify-center"
                                            />
                                            <div className="relative">
                                                <div className="absolute inset-0 flex items-center">
                                                    <div className="w-full border-t border-slate-700/50" />
                                                </div>
                                                <div className="relative flex justify-center text-xs uppercase">
                                                    <span className="bg-[#0d1320] px-4 text-slate-500 tracking-widest">
                                                        or register with email
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="space-y-5">
                                        <div className="space-y-2">
                                            <label className="text-xs font-semibold tracking-widest text-slate-400 uppercase ml-1">
                                                Full Name
                                            </label>
                                            <div className="relative">
                                                <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600" />
                                                <input
                                                    type="text"
                                                    required
                                                    value={fullName}
                                                    onChange={(e) =>
                                                        setFullName(
                                                            e.target.value
                                                        )
                                                    }
                                                    placeholder="Alexander Pierce"
                                                    className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-[#0a0e1a] border border-slate-700/50 focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none text-white placeholder:text-slate-600 text-sm transition-all"
                                                />
                                            </div>
                                        </div>

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
                                                    onChange={(e) =>
                                                        setEmail(
                                                            e.target.value
                                                        )
                                                    }
                                                    placeholder="name@kinetic.finance"
                                                    className={`w-full pl-11 pr-4 py-3.5 rounded-xl bg-[#0a0e1a] border ${
                                                        showEmailError
                                                            ? "border-red-500/50"
                                                            : "border-slate-700/50 focus:border-cyan-500/50"
                                                    } focus:ring-2 focus:ring-cyan-500/20 focus:outline-none text-white placeholder:text-slate-600 text-sm transition-all`}
                                                />
                                            </div>
                                            {showEmailError && (
                                                <p className="text-xs text-red-400 ml-1">
                                                    Invalid email format
                                                </p>
                                            )}
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-xs font-semibold tracking-widest text-slate-400 uppercase ml-1">
                                                Password
                                            </label>
                                            <div className="relative">
                                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600" />
                                                <input
                                                    type={
                                                        showPassword
                                                            ? "text"
                                                            : "password"
                                                    }
                                                    required
                                                    value={password}
                                                    onChange={(e) =>
                                                        setPassword(
                                                            e.target.value
                                                        )
                                                    }
                                                    placeholder="••••••••••••"
                                                    className="w-full pl-11 pr-12 py-3.5 rounded-xl bg-[#0a0e1a] border border-slate-700/50 focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none text-white placeholder:text-slate-600 text-sm transition-all"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setShowPassword(
                                                            !showPassword
                                                        )
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

                                            {/* Password Strength Meter */}
                                            {password && (
                                                <div className="space-y-3 mt-3">
                                                    {/* Strength bar */}
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex-1 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                                                            <div
                                                                className={`h-full rounded-full transition-all duration-500 ${passwordStrengthColor}`}
                                                                style={{
                                                                    width: `${(passwordScore / 5) * 100}%`,
                                                                }}
                                                            />
                                                        </div>
                                                        <span
                                                            className={`text-[10px] tracking-widest uppercase font-bold ${
                                                                passwordStrength ===
                                                                "weak"
                                                                    ? "text-red-400"
                                                                    : passwordStrength ===
                                                                      "medium"
                                                                    ? "text-amber-400"
                                                                    : "text-cyan-400"
                                                            }`}
                                                        >
                                                            {passwordStrength}
                                                        </span>
                                                    </div>

                                                    {/* Individual checks */}
                                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-3 gap-y-1.5">
                                                        {passwordChecks.map(
                                                            (chk, i) => (
                                                                <div
                                                                    key={i}
                                                                    className={`flex items-center gap-1.5 text-[10px] tracking-wider ${
                                                                        chk.valid
                                                                            ? "text-cyan-400"
                                                                            : "text-slate-600"
                                                                    }`}
                                                                >
                                                                    <CheckCircle2 className="h-3 w-3 flex-shrink-0" />
                                                                    {chk.label}
                                                                </div>
                                                            )
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Confirm Password */}
                                        <div className="space-y-2">
                                            <label className="text-xs font-semibold tracking-widest text-slate-400 uppercase ml-1">
                                                Confirm Password
                                            </label>
                                            <div className="relative">
                                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600" />
                                                <input
                                                    type="password"
                                                    required
                                                    value={confirmPassword}
                                                    onChange={(e) =>
                                                        setConfirmPassword(
                                                            e.target.value
                                                        )
                                                    }
                                                    placeholder="••••••••••••"
                                                    className={`w-full pl-11 pr-4 py-3.5 rounded-xl bg-[#0a0e1a] border ${
                                                        confirmPassword &&
                                                        !passwordsMatch
                                                            ? "border-red-500/50"
                                                            : "border-slate-700/50 focus:border-cyan-500/50"
                                                    } focus:ring-2 focus:ring-cyan-500/20 focus:outline-none text-white placeholder:text-slate-600 text-sm transition-all`}
                                                />
                                            </div>
                                            {confirmPassword &&
                                                password !== confirmPassword && (
                                                    <p className="text-xs text-red-400 ml-1">
                                                        Passwords do not match
                                                    </p>
                                                )}
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* ── STEP 2: Investment Goals ────────── */}
                            {step === 2 && (
                                <>
                                    <div className="text-center mb-6">
                                        <div className="inline-flex p-3.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 mb-4">
                                            <Target className="h-7 w-7 text-cyan-400 drop-shadow-[0_0_6px_rgba(0,229,255,0.3)]" />
                                        </div>
                                        <h2 className="text-2xl font-bold tracking-tight">
                                            Set Your Objectives
                                        </h2>
                                        <p className="text-slate-400 mt-1 text-sm">
                                            Help us calibrate your portfolio
                                            engine
                                        </p>
                                    </div>

                                    <div className="space-y-4">
                                        {[
                                            {
                                                icon: "💰",
                                                title: "Wealth Building",
                                                desc: "Long-term growth through equity",
                                            },
                                            {
                                                icon: "🏠",
                                                title: "Real Estate Fund",
                                                desc: "Save for property purchase",
                                            },
                                            {
                                                icon: "📈",
                                                title: "Retirement Corpus",
                                                desc: "Financial freedom planning",
                                            },
                                            {
                                                icon: "🎓",
                                                title: "Education Fund",
                                                desc: "Higher education savings",
                                            },
                                        ].map((g, i) => (
                                            <div
                                                key={i}
                                                className="p-4 rounded-xl border border-slate-700/30 bg-[#0a0e1a] hover:border-cyan-500/30 hover:bg-cyan-500/5 transition-all cursor-pointer group"
                                            >
                                                <div className="flex items-center gap-4">
                                                    <span className="text-2xl">
                                                        {g.icon}
                                                    </span>
                                                    <div className="flex-1">
                                                        <p className="font-semibold text-white text-sm group-hover:text-cyan-400 transition-colors">
                                                            {g.title}
                                                        </p>
                                                        <p className="text-xs text-slate-500">
                                                            {g.desc}
                                                        </p>
                                                    </div>
                                                    <ArrowRight className="h-4 w-4 text-slate-600 group-hover:text-cyan-400 transition-colors" />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}

                            {/* ── STEP 3: Risk Profile ────────────── */}
                            {step === 3 && (
                                <>
                                    <div className="text-center mb-6">
                                        <div className="inline-flex p-3.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 mb-4">
                                            <Gauge className="h-7 w-7 text-cyan-400 drop-shadow-[0_0_6px_rgba(0,229,255,0.3)]" />
                                        </div>
                                        <h2 className="text-2xl font-bold tracking-tight">
                                            Risk Calibration
                                        </h2>
                                        <p className="text-slate-400 mt-1 text-sm">
                                            Select your risk tolerance for
                                            optimal allocation
                                        </p>
                                    </div>

                                    <div className="space-y-3">
                                        {riskProfiles.map((rp) => (
                                            <button
                                                type="button"
                                                key={rp.id}
                                                onClick={() =>
                                                    setRiskProfile(rp.id)
                                                }
                                                className={`w-full p-4 rounded-xl border text-left transition-all ${
                                                    riskProfile === rp.id
                                                        ? `${rp.border} ${rp.bg} shadow-lg`
                                                        : "border-slate-700/30 bg-[#0a0e1a] hover:border-slate-600"
                                                }`}
                                            >
                                                <div className="flex items-center justify-between mb-1">
                                                    <span
                                                        className={`font-bold text-sm ${
                                                            riskProfile ===
                                                            rp.id
                                                                ? rp.color
                                                                : "text-white"
                                                        }`}
                                                    >
                                                        {rp.title}
                                                    </span>
                                                    <span
                                                        className={`text-sm font-bold ${rp.color}`}
                                                    >
                                                        {rp.roi} / yr
                                                    </span>
                                                </div>
                                                <p className="text-xs text-slate-500">
                                                    {rp.desc}
                                                </p>

                                                {/* Risk bar */}
                                                <div className="mt-3 h-1 rounded-full bg-slate-800 overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full transition-all duration-500 ${
                                                            rp.id ===
                                                            "conservative"
                                                                ? "w-1/3 bg-emerald-500"
                                                                : rp.id ===
                                                                  "moderate"
                                                                ? "w-2/3 bg-cyan-500"
                                                                : "w-full bg-amber-500"
                                                        }`}
                                                    />
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </>
                            )}

                            {/* ── Navigation Buttons ──────────────── */}
                            <div className="flex gap-3 pt-2">
                                {step > 1 && (
                                    <button
                                        type="button"
                                        onClick={() => setStep(step - 1)}
                                        className="px-6 py-3.5 rounded-xl border border-slate-700/50 text-slate-400 hover:border-cyan-500/30 hover:text-cyan-400 transition-all text-sm font-semibold tracking-wider uppercase"
                                    >
                                        Back
                                    </button>
                                )}
                                <button
                                    type="submit"
                                    disabled={
                                        isLoading ||
                                        (step === 1 && !step1Valid)
                                    }
                                    className="flex-1 py-3.5 text-sm font-bold tracking-[0.25em] uppercase rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 text-[#0a0e1a] shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    {isLoading ? (
                                        <Loader2 className="animate-spin mx-auto h-5 w-5" />
                                    ) : step < 3 ? (
                                        "Continue"
                                    ) : (
                                        "Initialize Vault"
                                    )}
                                </button>
                            </div>

                            {/* Terms */}
                            {step === 3 && (
                                <p className="text-center text-[10px] text-slate-600 tracking-wider mt-4 leading-relaxed">
                                    By initializing, you agree to the{" "}
                                    <a
                                        href="#"
                                        className="text-cyan-500 underline underline-offset-2"
                                    >
                                        Vault Protocols
                                    </a>{" "}
                                    and{" "}
                                    <a
                                        href="#"
                                        className="text-cyan-500 underline underline-offset-2"
                                    >
                                        Asset Security Terms
                                    </a>
                                    .
                                </p>
                            )}

                            {/* Login link */}
                            <p className="text-center text-sm text-slate-500 mt-4">
                                Already have a vault?{" "}
                                <Link
                                    href="/login"
                                    className="text-cyan-400 font-semibold hover:text-cyan-300 transition-colors tracking-wide"
                                >
                                    Access Vault →
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
                            <a
                                href="#"
                                className="hover:text-cyan-400 transition-colors"
                            >
                                Privacy
                            </a>
                            <a
                                href="#"
                                className="hover:text-cyan-400 transition-colors"
                            >
                                Security
                            </a>
                            <a
                                href="#"
                                className="hover:text-cyan-400 transition-colors"
                            >
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
