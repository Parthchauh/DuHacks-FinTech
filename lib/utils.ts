import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number) {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0
    }).format(amount);
}

export function formatCompactCurrency(amount: number) {
    if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)}Cr`;
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)}L`;
    return formatCurrency(amount);
}

/**
 * Parse a Groww feed price string into symbol + numeric price.
 * Input:  "RELIANCE: Rs.1304.70"
 * Output: { symbol: "RELIANCE", price: 1304.70 }
 */
export function parseGrowwPrice(raw: string): { symbol: string; price: number } {
    const [symbolPart, pricePart] = raw.split(":");
    const symbol = symbolPart.trim();
    const price = parseFloat(pricePart.replace("Rs.", "").trim());
    return { symbol, price };
}
