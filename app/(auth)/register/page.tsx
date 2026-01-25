"use client";

/**
 * Registration Page with Enhanced Security
 * =========================================
 * Features:
 * - Real-time password strength meter with progress bar
 * - Confirm password validation
 * - Email format validation (shows after @ is typed)
 * - Responsive design for all screen sizes
 */

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { GoogleBtn } from "@/components/GoogleBtn";
import { Card } from "@/components/ui/Card";
import { ArrowLeft, TrendingUp, Loader2, Eye, EyeOff, Check, X } from "lucide-react";
import { AnimatedLoader } from "@/components/ui/AnimatedLoader";


import { useState, useMemo } from "react";
import { usePortfolioStore } from "@/lib/store";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

// Password strength calculation
function calculatePasswordStrength(password: string): {
    score: number;
    label: string;
    color: string;
    bgColor: string;
} {
    const checks = [
        password.length >= 8,
        /[A-Z]/.test(password),
        /[a-z]/.test(password),
        /\d/.test(password),
        /[!@#$%^&*(),.?":{}|<>]/.test(password),
    ];

    const passedCount = checks.filter(Boolean).length;
    let score = (passedCount / checks.length) * 100;
    
    // Bonus for length
    if (password.length >= 12) score = Math.min(100, score + 10);
    if (password.length >= 16) score = Math.min(100, score + 10);

    let label = "Weak";
    let color = "text-red-500";
    let bgColor = "bg-red-500";
    
    if (score >= 80) {
        label = "Strong";
        color = "text-green-500";
        bgColor = "bg-green-500";
    } else if (score >= 60) {
        label = "Good";
        color = "text-yellow-500";
        bgColor = "bg-yellow-500";
    } else if (score >= 40) {
        label = "Fair";
        color = "text-orange-500";
        bgColor = "bg-orange-500";
    }

    return { score, label, color, bgColor };
}

export default function RegisterPage() {
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [acceptedTerms, setAcceptedTerms] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const { register } = usePortfolioStore();
    const router = useRouter();

    // Calculate password strength in real-time
    const passwordStrength = useMemo(() => calculatePasswordStrength(password), [password]);
    
    // Validation states
    const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;
    // Email validation - only show error after @ is typed
    const showEmailError = email.includes("@") && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    
    const isFormValid = 
        firstName.trim() && 
        lastName.trim() && 
        isEmailValid && 
        passwordStrength.score >= 60 && 
        passwordsMatch && 
        acceptedTerms;

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!isFormValid) {
            if (!passwordsMatch) {
                toast.error("Passwords do not match");
                return;
            }
            if (passwordStrength.score < 60) {
                toast.error("Password is too weak. Please make it stronger.");
                return;
            }
            return;
        }

        setIsLoading(true);

        try {
            const fullName = `${firstName.trim()} ${lastName.trim()}`;
            const success = await register(fullName, email.trim().toLowerCase(), password);
            
            if (success) {
                toast.success("Account created! Please check your email.");
                setTimeout(() => router.push("/login"), 1500);
            } else {
                const error = usePortfolioStore.getState().error;
                toast.error(error || "Unable to create account. Please try again or contact support.");
            }
        } catch (err: any) {
            // Generic error message to prevent enumeration
            const storeError = usePortfolioStore.getState().error;
            toast.error(storeError || "Unable to create account. Please try again or contact support.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-slate-50">
            {/* Background Decor */}
            <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-secondary/5 blur-3xl animate-[float_10s_ease-in-out_infinite]" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-primary/10 blur-3xl animate-[float_12s_ease-in-out_infinite_reverse]" />

            <div className="absolute top-4 left-4 sm:top-8 sm:left-8">
                <Link href="/" className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors">
                    <ArrowLeft className="h-4 w-4" /> Back to Home
                </Link>
            </div>

            <Card variant="glass-card" className="w-full max-w-md p-6 sm:p-8 relative z-10">
                <div className="text-center mb-6 sm:mb-8">
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-tr from-primary to-secondary flex items-center justify-center text-white shadow-lg shadow-primary/30 mx-auto mb-4">
                        <TrendingUp className="h-7 w-7" />
                    </div>
                    <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Create Account</h1>
                    <p className="text-sm sm:text-base text-slate-500 mt-2">Join OptiWealth to start optimizing</p>
                </div>

                <form onSubmit={handleRegister} className="space-y-4">
                    {/* Name Fields */}
                    <div className="grid grid-cols-1 xs:grid-cols-2 gap-3 sm:gap-4">
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-slate-700">First Name</label>
                            <input
                                type="text"
                                required
                                value={firstName}
                                onChange={(e) => setFirstName(e.target.value)}
                                placeholder="Arjun"
                                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl bg-white/50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-medium text-slate-900 text-sm sm:text-base"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-slate-700">Last Name</label>
                            <input
                                type="text"
                                required
                                value={lastName}
                                onChange={(e) => setLastName(e.target.value)}
                                placeholder="Kumar"
                                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl bg-white/50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-medium text-slate-900 text-sm sm:text-base"
                            />
                        </div>
                    </div>

                    {/* Email Field */}
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-slate-700">Email</label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="arjun@example.com"
                            className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl bg-white/50 border ${
                                showEmailError ? 'border-red-300 focus:ring-red-500/50' : 'border-slate-200 focus:ring-primary/50'
                            } focus:outline-none focus:ring-2 transition-all font-medium text-slate-900 text-sm sm:text-base`}
                        />
                        {showEmailError && (
                            <p className="text-xs text-red-500 mt-1">Please enter a valid email address</p>
                        )}
                    </div>

                    {/* Password Field with Strength Meter */}
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-slate-700">Password</label>
                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 pr-12 rounded-xl bg-white/50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-medium text-slate-900 text-sm sm:text-base"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                            </button>
                        </div>
                        
                        {/* Password Strength Meter - New Compact Design */}
                        {password.length > 0 && (
                            <div className="mt-2 space-y-1.5">
                                {/* Progress Bar with Gradient */}
                                <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                    <div 
                                        className={`h-full transition-all duration-500 ease-out ${passwordStrength.bgColor}`}
                                        style={{ 
                                            width: `${passwordStrength.score}%`,
                                            background: passwordStrength.score >= 80 
                                                ? 'linear-gradient(90deg, #22c55e, #16a34a)' 
                                                : passwordStrength.score >= 60 
                                                    ? 'linear-gradient(90deg, #eab308, #ca8a04)'
                                                    : passwordStrength.score >= 40
                                                        ? 'linear-gradient(90deg, #f97316, #ea580c)'
                                                        : 'linear-gradient(90deg, #ef4444, #dc2626)'
                                        }}
                                    />
                                </div>
                                {/* Single Line Rule */}
                                <p className={`text-xs ${passwordStrength.color}`}>
                                    <span className="font-medium">{passwordStrength.label}</span>
                                    <span className="text-slate-400 ml-1">
                                        — Use 8+ chars with uppercase, lowercase, number & special character
                                    </span>
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Confirm Password Field */}
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-slate-700">Confirm Password</label>
                        <div className="relative">
                            <input
                                type={showConfirmPassword ? "text" : "password"}
                                required
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="••••••••"
                                className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 pr-12 rounded-xl bg-white/50 border ${
                                    confirmPassword && !passwordsMatch ? 'border-red-300 focus:ring-red-500/50' : 'border-slate-200 focus:ring-primary/50'
                                } focus:outline-none focus:ring-2 transition-all font-medium text-slate-900 text-sm sm:text-base`}
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
                            <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                                <X className="h-3 w-3" /> Passwords do not match
                            </p>
                        )}
                        {passwordsMatch && (
                            <p className="text-xs text-green-500 mt-1 flex items-center gap-1">
                                <Check className="h-3 w-3" /> Passwords match
                            </p>
                        )}
                    </div>

                    {/* Terms Checkbox */}
                    <div className="flex items-start gap-2">
                        <input 
                            type="checkbox" 
                            id="terms" 
                            checked={acceptedTerms}
                            onChange={(e) => setAcceptedTerms(e.target.checked)}
                            className="mt-1 rounded border-slate-300 text-primary focus:ring-primary" 
                        />
                        <label htmlFor="terms" className="text-xs sm:text-sm text-slate-600">
                            I agree to the <a href="#" className="text-primary hover:underline">Terms of Service</a> and <a href="#" className="text-primary hover:underline">Privacy Policy</a>
                        </label>
                    </div>

                    {/* Submit Button */}
                    <Button 
                        className="w-full h-12 text-base sm:text-lg font-bold shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:scale-[1.01] active:scale-[0.99] transition-all bg-gradient-to-r from-primary to-blue-600 rounded-xl"
                        disabled={isLoading || !isFormValid}
                    >
                        {isLoading ? <AnimatedLoader size="sm" /> : "Create Account"}
                    </Button>

                    <div className="relative my-4 sm:my-6">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-slate-200" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-white/50 backdrop-blur-sm px-2 text-slate-500">Or continue with</span>
                        </div>
                    </div>

                    <GoogleBtn text="Sign up with Google" onSuccess={() => router.push('/dashboard')} />

                    <p className="text-center text-sm text-slate-500 mt-6 font-medium">
                        Already have an account?{" "}
                        <Link href="/login" className="text-primary font-semibold hover:underline">
                            Sign In
                        </Link>
                    </p>
                </form>
            </Card>
        </div>
    );
}
