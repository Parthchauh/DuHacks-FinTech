"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Loader2 } from "lucide-react";
import { usePortfolioStore } from "@/lib/store";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Script from "next/script";

// Extend window interface for Google GIS
declare global {
    interface Window {
        google: any;
    }
}

interface GoogleBtnProps {
    text?: string;
    onSuccess?: () => void;
}

export function GoogleBtn({ text = "Sign in with Google", onSuccess }: GoogleBtnProps) {
    const [isLoading, setIsLoading] = useState(false);
    const { googleLogin } = usePortfolioStore();
    const router = useRouter();

    const handleGoogleCallback = async (response: any) => {
        setIsLoading(true);
        try {
            const success = await googleLogin(response.credential);
            if (success) {
                toast.success("Successfully signed in with Google");
                if (onSuccess) onSuccess();
                router.push("/dashboard");
            } else {
                toast.error("Google authentication failed");
            }
        } catch (error) {
            toast.error("Something went wrong");
        } finally {
            setIsLoading(false);
        }
    };

    const initializeGoogle = () => {
        if (window.google && document.getElementById("googleSignInDiv")) {
            window.google.accounts.id.initialize({
                client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "",
                callback: handleGoogleCallback,
            });
            window.google.accounts.id.renderButton(
                document.getElementById("googleSignInDiv"),
                { theme: "outline", size: "large", width: "100%" }
            );
        }
    };

    // Handle case where script is already loaded (navigating between pages)
    useEffect(() => {
        const checkGoogle = setInterval(() => {
            if (window.google) {
                initializeGoogle();
                clearInterval(checkGoogle);
            }
        }, 100);

        return () => clearInterval(checkGoogle);
    }, []);

    return (
        <div className="w-full">
            <Script
                src="https://accounts.google.com/gsi/client"
                strategy="afterInteractive"
                onLoad={initializeGoogle}
            />

            {/* Google Sign-In Button Container */}
            <div id="googleSignInDiv" className="w-full h-[44px]"></div>
        </div>
    );
}
