"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ArrowLeft, TrendingUp, Loader2, RefreshCw, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { AnimatedLoader } from "@/components/ui/AnimatedLoader";

// ... (other imports)


import { useState, useEffect } from "react";
import { usePortfolioStore } from "@/lib/store";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api } from "@/lib/api";
import Swal from 'sweetalert2';

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [otp, setOtp] = useState("");
    
    // Email validation
    const showEmailError = email.includes("@") && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    
    // Captcha State
    const [showCaptcha, setShowCaptcha] = useState(false);
    const [captchaToken, setCaptchaToken] = useState("");
    const [captchaQuestion, setCaptchaQuestion] = useState("");
    const [captchaAnswer, setCaptchaAnswer] = useState("");

    const [isLoading, setIsLoading] = useState(false);
    const { login, verifyMfa, mfaRequired, error: storeError, resetError } = usePortfolioStore();
    const router = useRouter();

    useEffect(() => {
        if (storeError) {
            if (storeError.includes("Captcha") || storeError.includes("Too many")) {
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
        } catch (err) {
            console.error("Failed to load captcha");
        }
    };

    const showDashboardLoader = () => {
        let timerInterval: any;
        Swal.fire({
            title: "Verifying Authentication",
            html: `Redirection to dashboard in <b></b> milliseconds.`,
            timer: 2000,
            timerProgressBar: true,
            backdrop: `
                rgba(255,255,255,0.95)
                backdrop-filter: blur(20px)
            `,
            background: 'rgba(255, 255, 255, 0.9)',
            customClass: {
                popup: 'rounded-2xl border border-white/20 shadow-xl font-sans',
                title: 'text-xl font-bold text-slate-800',
                htmlContainer: 'text-slate-600',
                timerProgressBar: 'bg-primary'
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
            willClose: () => {
                clearInterval(timerInterval);
            }
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
            const success = await login(email, password, captchaToken, captchaAnswer);
            
            if (success) {
                // Determine if we need MFA or if direct login
                // Login action in store handles mfaRequired state automatically
                // If success returns true, it means we are FULLY authenticated (no MFA needed)
                // If MFA is needed, success returns false but mfaRequired becomes true
                
                // NOTE: Store login returns TRUE only if fully authenticated.
                // It returns FALSE if MFA is required (but sets mfaRequired: true)
                // So if success is true here, we go straight to dashboard
                showDashboardLoader();
            }
        } catch (error: any) {
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
        } catch (error) {
            toast.error("Verification failed");
        } finally {
            setIsLoading(false);
        }
    };

    if (mfaRequired) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100">
                 <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-primary/5 blur-3xl animate-[float_10s_ease-in-out_infinite]" />
                 
                 <Card variant="glass-card" className="w-full max-w-md p-8 relative z-10 border-white/50 shadow-2xl backdrop-blur-xl">
                    <div className="text-center mb-8">
                        <div className="h-20 w-20 rounded-full bg-green-50 flex items-center justify-center text-green-600 mx-auto mb-4 animate-in zoom-in duration-500">
                            <ShieldCheck className="h-10 w-10 drop-shadow-sm" />
                        </div>
                        <h1 className="text-2xl font-bold text-slate-900">Security Check</h1>
                        <p className="text-slate-500 mt-2 font-medium">Enter the 6-digit code sent to your email</p>
                    </div>

                    <form onSubmit={handleMfaVerify} className="space-y-6">
                        <div className="relative group">
                            <div className="absolute -inset-0.5 bg-gradient-to-r from-primary to-secondary rounded-xl opacity-20 group-hover:opacity-40 transition duration-500 blur"></div>
                            <input
                                type="text"
                                required
                                value={otp}
                                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                placeholder="123456"
                                className="relative w-full px-4 py-5 text-center text-3xl tracking-[0.8em] font-bold rounded-xl bg-white/80 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/50 text-slate-800 placeholder:text-slate-300 transition-all shadow-inner"
                                maxLength={6}
                                autoFocus
                            />
                        </div>

                        <Button className="w-full py-7 text-lg font-bold shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all duration-300" disabled={isLoading}>
                            {isLoading ? <Loader2 className="animate-spin mr-2" /> : "Verify & Login"}
                        </Button>
                        
                        <button 
                            type="button" 
                            onClick={() => window.location.reload()} 
                            className="w-full text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors"
                        >
                            Back to Login
                        </button>
                    </form>
                 </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-50 via-slate-100 to-slate-200">
            {/* Background Decor */}
            <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] rounded-full bg-primary/10 blur-[100px] animate-[pulse_8s_ease-in-out_infinite]" />
            <div className="absolute bottom-[-10%] left-[-5%] w-[40%] h-[40%] rounded-full bg-secondary/10 blur-[100px] animate-[pulse_10s_ease-in-out_infinite]" />

            <div className="absolute top-8 left-8 z-20">
                <Link href="/" className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors font-medium group">
                    <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" /> Back to Home
                </Link>
            </div>

            <Card className="w-full max-w-md p-8 relative z-10 border-0 shadow-2xl bg-white/70 backdrop-blur-md ring-1 ring-white/50">
                <div className="text-center mb-8">
                    <div className="inline-flex p-3 rounded-2xl bg-gradient-to-tr from-primary to-blue-600 shadow-lg shadow-primary/30 mb-6 transform hover:scale-105 transition-transform duration-300">
                        <TrendingUp className="h-8 w-8 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700">Welcome Back</h1>
                    <p className="text-slate-500 mt-2 font-medium">Access your intelligent portfolio dashboard</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-5">
                    <div className="space-y-2 group">
                        <label className="text-sm font-semibold text-slate-700 ml-1">Email Address</label>
                        <div className="relative">
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="name@company.com"
                                className={`w-full px-5 py-3.5 rounded-xl bg-slate-50/50 border ${
                                    showEmailError ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:border-primary focus:ring-primary/20'
                                } focus:outline-none focus:ring-4 transition-all duration-300 font-medium text-slate-900 placeholder:text-slate-400`}
                            />
                        </div>
                        {showEmailError && (
                            <p className="text-xs text-red-500 font-medium ml-1">Please enter a valid email address</p>
                        )}
                    </div>

                    <div className="space-y-2 group">
                        <div className="flex justify-between items-center ml-1">
                            <label className="text-sm font-semibold text-slate-700">Password</label>
                            <Link href="/forgot-password" className="text-xs text-primary hover:text-primary/80 font-semibold hover:underline">
                                Forgot Password?
                            </Link>
                        </div>
                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full px-5 py-3.5 pr-12 rounded-xl bg-slate-50/50 border border-slate-200 focus:border-primary focus:ring-4 focus:ring-primary/20 focus:outline-none transition-all duration-300 font-medium text-slate-900 placeholder:text-slate-400"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
                            >
                                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                            </button>
                        </div>
                    </div>

                    {showCaptcha && (
                        <div className="space-y-3 pt-2 animate-in fade-in slide-in-from-top-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-semibold text-slate-700">Security Check</label>
                                <button type="button" onClick={fetchCaptcha} className="text-xs text-primary font-medium flex items-center gap-1 hover:underline">
                                    <RefreshCw className="h-3 w-3" /> Refresh Challenge
                                </button>
                            </div>
                            <div className="flex gap-3">
                                <div className="flex-1 bg-white rounded-lg flex items-center justify-center font-mono font-bold text-lg text-slate-600 border border-slate-200 shadow-sm">
                                    {captchaQuestion || "Loading..."}
                                </div>
                                <input
                                    type="text"
                                    required
                                    value={captchaAnswer}
                                    onChange={(e) => setCaptchaAnswer(e.target.value)}
                                    placeholder="?"
                                    className="w-20 px-4 py-3 text-center rounded-lg bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/50 font-bold text-slate-900"
                                />
                            </div>
                        </div>
                    )}

                    <Button 
                        className="w-full text-lg font-bold py-7 mt-4 shadow-xl shadow-primary/20 hover:shadow-primary/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 bg-gradient-to-r from-primary to-blue-600" 
                        size="lg" 
                        disabled={isLoading}
                    >
                        {isLoading ? <AnimatedLoader size="sm" /> : "Sign In"}
                    </Button>

                    <p className="text-center text-sm text-slate-500 mt-8 font-medium">
                        Don't have an account?{" "}
                        <Link href="/register" className="text-primary font-bold hover:underline transition-all">
                            Create Account
                        </Link>
                    </p>
                </form>
            </Card>
        </div>
    );
}
