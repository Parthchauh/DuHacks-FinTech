/**
 * OptiWealth Root Layout
 * =======================
 * Main application layout wrapping all pages with:
 * - Lenis smooth scroll provider for buttery scrolling
 * - Page transition animations
 * - Toast notifications
 * - Global font configuration
 * - PWA support with manifest and service worker
 */

import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/Toaster";
import { SmoothScrollProvider } from "@/components/providers/SmoothScrollProvider";
import { PageTransition } from "@/components/providers/PageTransition";
import Script from "next/script";

const inter = Inter({ 
    subsets: ["latin"],
    display: "swap", // Prevent FOIT (Flash of Invisible Text)
});

export const metadata: Metadata = {
    title: "OptiWealth - Wealth, Optimized",
    description: "Next-gen portfolio optimization for Indian investors. Track, analyze, and rebalance your investments with AI-powered insights.",
    keywords: ["portfolio", "investment", "rebalancing", "Indian stocks", "mutual funds", "ETF"],
    authors: [{ name: "OptiWealth Team" }],
    manifest: "/manifest.json",
    appleWebApp: {
        capable: true,
        statusBarStyle: "default",
        title: "OptiWealth",
    },
};

// Viewport configuration for responsive design
export const viewport: Viewport = {
    width: "device-width",
    initialScale: 1,
    maximumScale: 5,
    userScalable: true,
    themeColor: "#3b82f6",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" className="scroll-smooth">
            <head>
                <link rel="apple-touch-icon" href="/icon-192.png" />
            </head>
            <body className={`${inter.className} antialiased`}>
                <SmoothScrollProvider>
                    <PageTransition>
                        {children}
                    </PageTransition>
                </SmoothScrollProvider>
                <Toaster position="top-center" richColors />
                
                {/* Service Worker Registration */}
                <Script id="sw-register" strategy="afterInteractive">
                    {`
                        if ('serviceWorker' in navigator) {
                            window.addEventListener('load', function() {
                                navigator.serviceWorker.register('/sw.js').then(
                                    function(registration) {
                                        console.log('[PWA] Service Worker registered');
                                    },
                                    function(err) {
                                        console.log('[PWA] Service Worker registration failed:', err);
                                    }
                                );
                            });
                        }
                    `}
                </Script>
            </body>
        </html>
    );
}
