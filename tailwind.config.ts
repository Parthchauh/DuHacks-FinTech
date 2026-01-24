/**
 * OptiWealth Tailwind Configuration
 * ===================================
 * Extended Tailwind with:
 * - Custom breakpoints for all device sizes (210px phones to 4K TVs)
 * - Design system colors from CSS variables
 * - Animation utilities for smooth transitions
 */

import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        // Custom breakpoints for full device range
        screens: {
            "3xs": "210px",   // Ultra-small phones
            "2xs": "280px",   // Very small phones
            xs: "320px",      // Small phones (iPhone SE)
            sm: "480px",      // Large phones
            md: "768px",      // Tablets
            lg: "1024px",     // Laptops
            xl: "1280px",     // Desktops
            "2xl": "1536px",  // Large desktops
            "3xl": "1920px",  // Full HD monitors
            "4xl": "2560px",  // 2K monitors
            "5xl": "3840px",  // 4K TVs
        },
        extend: {
            colors: {
                border: "hsl(var(--border))",
                input: "hsl(var(--input))",
                ring: "hsl(var(--ring))",
                background: "hsl(var(--background))",
                foreground: "hsl(var(--foreground))",
                primary: {
                    DEFAULT: "hsl(var(--primary))",
                    foreground: "hsl(var(--primary-foreground))",
                },
                secondary: {
                    DEFAULT: "hsl(var(--secondary))",
                    foreground: "hsl(var(--secondary-foreground))",
                },
                destructive: {
                    DEFAULT: "hsl(var(--destructive))",
                    foreground: "hsl(var(--destructive-foreground))",
                },
                muted: {
                    DEFAULT: "hsl(var(--muted))",
                    foreground: "hsl(var(--muted-foreground))",
                },
                accent: {
                    DEFAULT: "hsl(var(--accent))",
                    foreground: "hsl(var(--accent-foreground))",
                },
                popover: {
                    DEFAULT: "hsl(var(--popover))",
                    foreground: "hsl(var(--popover-foreground))",
                },
                card: {
                    DEFAULT: "hsl(var(--card))",
                    foreground: "hsl(var(--card-foreground))",
                },
            },
            borderRadius: {
                lg: "var(--radius)",
                md: "calc(var(--radius) - 2px)",
                sm: "calc(var(--radius) - 4px)",
            },
            // Smooth animation timings
            transitionTimingFunction: {
                "smooth": "cubic-bezier(0.25, 0.46, 0.45, 0.94)",
                "smooth-out": "cubic-bezier(0.22, 1, 0.36, 1)",
            },
            // Animation keyframes
            animation: {
                "fade-in": "fadeIn 0.5s ease-out forwards",
                "fade-up": "fadeUp 0.5s ease-out forwards",
                "scale-in": "scaleIn 0.3s ease-out forwards",
                "slide-up": "slideUp 0.4s ease-out forwards",
                "pulse-subtle": "pulseSubtle 2s ease-in-out infinite",
            },
            keyframes: {
                fadeIn: {
                    "0%": { opacity: "0" },
                    "100%": { opacity: "1" },
                },
                fadeUp: {
                    "0%": { opacity: "0", transform: "translateY(20px)" },
                    "100%": { opacity: "1", transform: "translateY(0)" },
                },
                scaleIn: {
                    "0%": { opacity: "0", transform: "scale(0.95)" },
                    "100%": { opacity: "1", transform: "scale(1)" },
                },
                slideUp: {
                    "0%": { transform: "translateY(100%)" },
                    "100%": { transform: "translateY(0)" },
                },
                pulseSubtle: {
                    "0%, 100%": { opacity: "1" },
                    "50%": { opacity: "0.7" },
                },
            },
            // Fluid spacing for responsive design
            spacing: {
                "safe-bottom": "env(safe-area-inset-bottom)",
                "safe-top": "env(safe-area-inset-top)",
            },
        },
    },
    plugins: [],
};

export default config;
