import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "OptiWealth - Wealth, Optimized",
    description: "Next-gen portfolio optimization for Indian investors.",
};

import { Toaster } from "@/components/ui/Toaster";

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body className={inter.className}>
                {children}
                <Toaster position="top-center" richColors />
            </body>
        </html>
    );
}
