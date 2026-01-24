export interface Asset {
    ticker: string;
    name: string;
    price: number;
    balance: number;
    allocation: number; // Current %
    target: number;     // Target %
}

export interface Trade {
    ticker: string;
    type: "BUY" | "SELL";
    amount: number; // Dollar amount
    shares: number;
    reason: string;
}

export function calculatePortfolioTotal(assets: Asset[]): number {
    return assets.reduce((acc, asset) => acc + asset.balance, 0);
}

export function calculateRebalancingTrades(assets: Asset[], totalValue: number): Trade[] {
    const trades: Trade[] = [];

    assets.forEach((asset) => {
        const targetValue = totalValue * (asset.target / 100);
        const diff = targetValue - asset.balance;

        if (Math.abs(diff) < 1.00) return; // Ignore negligible differences

        if (diff > 0) {
            trades.push({
                ticker: asset.ticker,
                type: "BUY",
                amount: diff,
                shares: diff / asset.price,
                reason: "Underweight"
            });
        } else {
            trades.push({
                ticker: asset.ticker,
                type: "SELL",
                amount: Math.abs(diff),
                shares: Math.abs(diff) / asset.price,
                reason: "Overweight"
            });
        }
    });

    return trades.sort((a, b) => b.amount - a.amount); // Largest trades first
}

// Mock risk score calculation (Standard deviation proxy)
export function calculateRiskScore(assets: Asset[]): number {
    let weightedRisk = 0;
    assets.forEach(asset => {
        if (["NIFTYBEES", "JUNIORBEES"].includes(asset.ticker)) weightedRisk += (asset.balance * 0.8);
        if (["GOLDBEES"].includes(asset.ticker)) weightedRisk += (asset.balance * 0.4);
        if (["RELIANCE"].includes(asset.ticker)) weightedRisk += (asset.balance * 0.9);
    });

    const total = calculatePortfolioTotal(assets);
    const score = (weightedRisk / total) * 10;
    return Math.min(Math.max(score, 1), 10);
}
