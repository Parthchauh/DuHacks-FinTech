import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { Asset, calculateRebalancingTrades, calculatePortfolioTotal, Trade } from "./finance";

interface UserProfile {
    name: string;
    email: string;
    currency: string;
}

interface PortfolioState {
    user: UserProfile | null;
    holdings: Asset[];
    cash: number;
    trades: Trade[];
    isRebalancing: boolean;

    // Actions
    setUser: (user: UserProfile) => void;
    setHoldings: (assets: Asset[]) => void;
    generateRebalancingPlan: () => void;
    executeTrades: () => void;
    resetSimulation: () => void;
}

// Initial Data for Indian Market
const initialHoldings: Asset[] = [
    { ticker: "NIFTYBEES", name: "Nippon India Nifty 50 BeES", price: 245.50, balance: 1250000.00, allocation: 0, target: 50.0 },
    { ticker: "JUNIORBEES", name: "Nippon India Junior BeES", price: 540.20, balance: 500000.00, allocation: 0, target: 20.0 },
    { ticker: "GOLDBEES", name: "Nippon India Gold BeES", price: 58.15, balance: 500000.00, allocation: 0, target: 20.0 },
    { ticker: "RELIANCE", name: "Reliance Industries", price: 2950.00, balance: 125000.00, allocation: 0, target: 5.0 },
    { ticker: "INR", name: "Indian Rupee (Cash)", price: 1.00, balance: 125000.00, allocation: 0, target: 5.0 },
];

const initialTotal = 2500000; // 25 Lakhs

export const usePortfolioStore = create<PortfolioState>()(
    persist(
        (set, get) => ({
            user: null,
            holdings: initialHoldings.map(h => ({
                ...h,
                allocation: (h.balance / initialTotal) * 100
            })),
            cash: 125000.00,
            trades: [],
            isRebalancing: false,

            setUser: (user) => set({ user }),
            setHoldings: (assets) => set({ holdings: assets }),

            generateRebalancingPlan: () => {
                const { holdings } = get();
                const totalValue = calculatePortfolioTotal(holdings);
                const trades = calculateRebalancingTrades(holdings, totalValue);
                set({ trades });
            },

            executeTrades: () => {
                set({ isRebalancing: true });
                // Simulate API delay
                setTimeout(() => {
                    const { holdings, trades } = get();
                    const newHoldings = holdings.map(asset => {
                        const trade = trades.find(t => t.ticker === asset.ticker);
                        if (!trade) return asset;

                        const newBalance = trade.type === "BUY"
                            ? asset.balance + trade.amount
                            : asset.balance - trade.amount;

                        return {
                            ...asset,
                            balance: newBalance
                        };
                    });

                    const totalValue = calculatePortfolioTotal(newHoldings);
                    const recalibratedHoldings = newHoldings.map(h => ({
                        ...h,
                        allocation: (h.balance / totalValue) * 100
                    }));

                    set({
                        holdings: recalibratedHoldings,
                        trades: [],
                        isRebalancing: false
                    });
                }, 2000);
            },

            resetSimulation: () => {
                set({
                    holdings: initialHoldings.map(h => ({ ...h, allocation: (h.balance / initialTotal) * 100 })),
                    trades: []
                });
            }
        }),
        {
            name: 'optiwealth-storage',
            storage: createJSONStorage(() => localStorage),
        }
    )
);
