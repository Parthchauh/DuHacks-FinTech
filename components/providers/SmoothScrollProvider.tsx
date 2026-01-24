/**
 * Lenis Smooth Scroll Provider
 * =============================
 * Implements butter-smooth scrolling using Lenis library from Studio Freight.
 * 
 * Why Lenis over native scroll?
 * - Native smooth-scroll is jerky and has fixed easing
 * - Lenis provides customizable lerp (linear interpolation) for buttery smoothness
 * - Works consistently across all browsers including Safari
 * - Lightweight (~3kb) with no layout shifts
 * 
 * Configuration:
 * - lerp: 0.1 = smooth but responsive (lower = smoother but laggy)
 * - duration: Total scroll animation time
 * - smoothWheel: Smooths mouse wheel input
 */

"use client";

import { useEffect, useRef } from "react";
import Lenis from "@studio-freight/lenis";

export function SmoothScrollProvider({ children }: { children: React.ReactNode }) {
    const lenisRef = useRef<Lenis | null>(null);

    useEffect(() => {
        // Initialize Lenis with optimized settings for buttery smooth feel
        const lenis = new Lenis({
            duration: 1.2,              // Animation duration
            easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // Easing function
            orientation: "vertical",    // Scroll direction
            gestureOrientation: "vertical",
            smoothWheel: true,          // Smooth mouse wheel
            wheelMultiplier: 1,         // Scroll speed multiplier
            touchMultiplier: 2,         // Touch sensitivity
            infinite: false,            // No infinite scroll
        });

        lenisRef.current = lenis;

        // RAF loop for smooth updates
        function raf(time: number) {
            lenis.raf(time);
            requestAnimationFrame(raf);
        }

        requestAnimationFrame(raf);

        // Cleanup on unmount
        return () => {
            lenis.destroy();
        };
    }, []);

    return <>{children}</>;
}
