"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ArrowLeft, TrendingUp, Loader2 } from "lucide-react";
import { useState } from "react";
import { usePortfolioStore } from "@/lib/store";
import { useRouter } from "next/navigation";
import { loginUser } from "@/lib/auth";
import { toast } from "sonner";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const { setUser } = usePortfolioStore();
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        // Simulate API call
        setTimeout(() => {
            const result = loginUser(email, password);

            if (result.success && result.user) {
                toast.success("Welcome back!");
                setUser({
                    name: result.user.name,
                    email: result.user.email,
                    currency: "INR"
                });
                router.push("/dashboard");
            } else {
                toast.error(result.message || "Invalid credentials");
            }
            setIsLoading(false);
        }, 1500);
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-slate-50">
            {/* Background Decor */}
            <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-primary/5 blur-3xl animate-[float_10s_ease-in-out_infinite]" />
            <div className="absolute bottom-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-secondary/10 blur-3xl animate-[float_12s_ease-in-out_infinite_reverse]" />

            <div className="absolute top-8 left-8">
                <Link href="/" className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors">
                    <ArrowLeft className="h-4 w-4" /> Back to Home
                </Link>
            </div>

            <Card variant="glass-card" className="w-full max-w-md p-8 relative z-10">
                <div className="text-center mb-8">
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-tr from-primary to-secondary flex items-center justify-center text-white shadow-lg shadow-primary/30 mx-auto mb-4">
                        <TrendingUp className="h-7 w-7" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900">Welcome Back</h1>
                    <p className="text-slate-500 mt-2">Sign in to your OptiWealth account</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Email</label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="arjun@optiwealth.in"
                            className="w-full px-4 py-3 rounded-xl bg-white/50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-medium text-slate-900"
                        />
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <label className="text-sm font-medium text-slate-700">Password</label>
                            <Link href="#" className="text-xs text-primary hover:text-primary/80 font-medium">Forgot?</Link>
                        </div>
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            className="w-full px-4 py-3 rounded-xl bg-white/50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-medium text-slate-900"
                        />
                    </div>

                    <Button className="w-full text-lg font-semibold py-6" size="lg" disabled={isLoading}>
                        {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Sign In"}
                    </Button>

                    <p className="text-center text-sm text-slate-500 mt-6">
                        Don't have an account?{" "}
                        <Link href="/register" className="text-primary font-semibold hover:underline">
                            Sign Up
                        </Link>
                    </p>
                </form>
            </Card>
        </div>
    );
}
