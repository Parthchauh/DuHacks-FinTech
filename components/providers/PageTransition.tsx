/**
 * Page Transition Wrapper
 * ========================
 * Provides smooth fade + slide animations between page navigations.
 * Uses Framer Motion for hardware-accelerated CSS transforms.
 * 
 * Animation Strategy:
 * - Initial: Fade in + slight slide up (creates sense of entering)
 * - Exit: Fade out + slide down (creates sense of leaving)
 * - Duration kept short (0.3s) to feel snappy, not sluggish
 */

"use client";

import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";

const pageVariants = {
    initial: {
        opacity: 0,
        y: 20,
        scale: 0.98,
    },
    animate: {
        opacity: 1,
        y: 0,
        scale: 1,
    },
    exit: {
        opacity: 0,
        y: -10,
        scale: 0.99,
    },
};

const pageTransition = {
    type: "tween",
    ease: [0.25, 0.46, 0.45, 0.94], // Custom cubic-bezier for smooth feel
    duration: 0.3,
};

export function PageTransition({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    return (
        <AnimatePresence mode="wait">
            <motion.div
                key={pathname}
                initial="initial"
                animate="animate"
                exit="exit"
                variants={pageVariants}
                transition={pageTransition}
            >
                {children}
            </motion.div>
        </AnimatePresence>
    );
}
