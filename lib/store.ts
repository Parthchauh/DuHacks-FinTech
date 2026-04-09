/**
 * OptiWealth Frontend - Global State Management (Zustand)
 * =========================================================
 * Centralized state store using Zustand for predictable state management.
 * 
 * Architecture Pattern:
 * Uses Zustand's atomic store pattern with persistence middleware. All
 * portfolio-related state (user, portfolios, holdings, metrics) lives here,
 * providing a single source of truth across all components.
 * 
 * Why Zustand over Redux/Context?
 * - Minimal boilerplate (no reducers, actions, selectors)
 * - Built-in TypeScript support
 * - Persistence middleware for localStorage sync
 * - No provider wrapper needed (direct hook access)
 * - Optimized re-renders (only subscribed components update)
 * 
 * State Flow:
 * 1. Components call store actions (login, fetchPortfolios, etc.)
 * 2. Actions call API client and update state atomically
 * 3. Components automatically re-render when subscribed state changes
 * 4. Persist middleware syncs selected state to localStorage
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { api } from "./api";
import { parseGrowwPrice } from "./utils";

// Types
export interface Asset {
    id?: number;
    ticker: string;
    name: string;
    asset_type?: string;
    quantity: number;
    avg_buy_price: number;
    target_allocation: number;
    // Computed fields (from API)
    current_price?: number;
    current_value?: number;
    profit_loss?: number;
    profit_loss_percent?: number;
    actual_allocation?: number;
    drift?: number;
}

export interface Transaction {
    id: number;
    ticker: string;
    transaction_type: "BUY" | "SELL" | "DIVIDEND" | "DEPOSIT" | "WITHDRAWAL";
    quantity: number;
    price: number;
    total_amount: number;
    fees: number;
    notes?: string;
    portfolio_id: number;
    executed_at: string;
}

export interface Trade {
    ticker: string;
    name: string;
    trade_type: "BUY" | "SELL";
    current_allocation: number;
    target_allocation: number;
    current_value: number;
    target_value: number;
    trade_amount: number;
    shares: number;
    reason: string;
}

export interface OHLCVBar {
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

export interface PortfolioMetrics {
    total_value: number;
    total_invested: number;
    total_return: number;
    total_return_percent: number;
    daily_change: number;
    daily_change_percent: number;
    sharpe_ratio: number;
    volatility: number;
    beta: number;
    alpha: number;
    risk_score: number;
    risk_level: string;
    diversification_score: number;
    sector_concentration: Record<string, number>;
}

export interface UserProfile {
    id: number;
    email: string;
    full_name: string;
    currency: string;
    risk_profile: string;
}

export interface Portfolio {
    id: number;
    name: string;
    description?: string;
    is_default: boolean;
    holdings: Asset[];
    total_value?: number;
    total_invested?: number;
    total_profit_loss?: number;
    total_profit_loss_percent?: number;
}

interface PortfolioState {
    // User
    user: UserProfile | null;
    isAuthenticated: boolean;
    
    // Portfolio
    currentPortfolioId: number | null;
    portfolios: Portfolio[];
    holdings: Asset[];
    metrics: PortfolioMetrics | null;
    transactions: Transaction[];
    
    // Auth State (MFA)
    mfaRequired: boolean;
    mfaToken: string | null;
    
    // UI State
    isLoading: boolean;
    isRebalancing: boolean;
    trades: Trade[];
    error: string | null;
    notificationCount: number;
    
    // Chart State
    prices: Record<string, number>;
    priceHistory: Record<string, number[]>;
    ohlcvCache: Record<string, { data: OHLCVBar[]; fetchedAt: number }>;
    chartSymbol: string | null;
    
    // Actions
    setUser: (user: UserProfile | null) => void;
    setAuthenticated: (value: boolean) => void;
    
    // Auth Actions
    login: (email: string, password: string, captcha_token?: string, captcha_answer?: string) => Promise<boolean>;
    verifyMfa: (otp: string) => Promise<boolean>;
    googleLogin: (idToken: string) => Promise<boolean>;
    register: (name: string, email: string, password: string, riskProfile?: string) => Promise<boolean>;
    logout: () => void;
    deleteAccount: () => Promise<boolean>;
    fetchUser: () => Promise<void>;
    
    // Portfolio Actions
    fetchPortfolios: () => Promise<void>;
    fetchPortfolio: (portfolioId: number) => Promise<void>;
    setCurrentPortfolio: (portfolioId: number) => void;
    fetchTransactions: () => Promise<void>;
    
    // Holdings Actions
    addHolding: (holding: Omit<Asset, 'id'>) => Promise<boolean>;
    updateHolding: (holdingId: number, data: Partial<Asset>) => Promise<boolean>;
    removeHolding: (holdingId: number) => Promise<boolean>;
    
    // Analytics Actions
    fetchMetrics: () => Promise<void>;
    
    // Rebalancing Actions
    generateRebalancingPlan: () => Promise<void>;
    executeTrades: () => Promise<boolean>;
    
    // Chart Actions
    setPriceFromGroww: (rawString: string) => void;
    setOHLCVCache: (symbol: string, data: OHLCVBar[]) => void;
    getOHLCVCache: (symbol: string) => OHLCVBar[] | null;
    setChartSymbol: (symbol: string | null) => void;
    
    // Utility
    resetError: () => void;
    clearState: () => void;
}

export const usePortfolioStore = create<PortfolioState>()(
    persist(
        (set, get) => ({
            // Initial State
            user: null,
            isAuthenticated: false,
            currentPortfolioId: null,
            portfolios: [],
            holdings: [],
            metrics: null,
            transactions: [],
            mfaRequired: false,
            mfaToken: null,
            isLoading: false,
            isRebalancing: false,
            trades: [],
            error: null,
            notificationCount: 0,
            prices: {},
            priceHistory: {},
            ohlcvCache: {},
            chartSymbol: null,

            setUser: (user) => set({ user }),
            setAuthenticated: (value) => set({ isAuthenticated: value }),

            // Auth Actions
            login: async (email, password, captcha_token, captcha_answer) => {
                set({ isLoading: true, error: null });
                try {
                    const response = await api.login(email, password, captcha_token, captcha_answer);
                    
                    if (response.mfa_required) {
                        set({ 
                            mfaRequired: true, 
                            mfaToken: response.mfa_token,
                            isLoading: false,
                            error: null
                        });
                        return false; // Not fully authenticated yet
                    }
                    
                    const user = await api.getMe();
                    set({ 
                        user, 
                        isAuthenticated: true, 
                        isLoading: false,
                        mfaRequired: false,
                        mfaToken: null
                    });
                    
                    // Fetch portfolios after login
                    await get().fetchPortfolios();
                    return true;
                } catch (error: any) {
                    set({ error: error.detail || 'Login failed', isLoading: false });
                    return false;
                }
            },

            verifyMfa: async (otp) => {
                const { mfaToken } = get();
                if (!mfaToken) return false;
                
                set({ isLoading: true, error: null });
                try {
                    await api.verifyMfa(mfaToken, otp);
                    const user = await api.getMe();
                    set({ 
                        user, 
                        isAuthenticated: true, 
                        isLoading: false,
                        mfaRequired: false,
                        mfaToken: null
                    });
                    
                    await get().fetchPortfolios();
                    return true;
                } catch (error: any) {
                    set({ error: error.detail || 'Verification failed', isLoading: false });
                    return false;
                }
            },

            googleLogin: async (idToken) => {
                set({ isLoading: true, error: null });
                try {
                    await api.googleLogin(idToken);
                    const user = await api.getMe();
                    set({ 
                        user, 
                        isAuthenticated: true, 
                        isLoading: false,
                        mfaRequired: false,
                        mfaToken: null
                    });
                    
                    await get().fetchPortfolios();
                    return true;
                } catch (error: any) {
                    set({ error: error.detail || 'Google login failed', isLoading: false });
                    return false;
                }
            },

            register: async (name, email, password, riskProfile = 'moderate') => {
                set({ isLoading: true, error: null });
                try {
                    const response = await api.register({ email, password, full_name: name, risk_profile: riskProfile });
                    
                    // register-and-login returns tokens directly
                    if (response.access_token) {
                        const user = await api.getMe();
                        set({ 
                            user, 
                            isAuthenticated: true, 
                            isLoading: false,
                            mfaRequired: false,
                            mfaToken: null,
                            error: null
                        });
                        await get().fetchPortfolios();
                    } else {
                        set({ isLoading: false });
                    }
                    return true;
                } catch (error: any) {
                    const message = error?.detail || error?.message || 'Registration failed. Please try again.';
                    set({ error: message, isLoading: false });
                    return false;
                }
            },

            logout: () => {
                api.logout();
                set({
                    user: null,
                    isAuthenticated: false,
                    currentPortfolioId: null,
                    portfolios: [],
                    holdings: [],
                    metrics: null,
                    trades: [],
                    // ✅ Fix: clear MFA state on logout
                    mfaRequired: false,
                    mfaToken: null,
                    error: null,
                    notificationCount: 0,
                });
            },

            deleteAccount: async () => {
                set({ isLoading: true, error: null });
                try {
                    await api.deleteAccount();
                    get().logout(); // Logout after deletion
                    return true;
                } catch (error: any) {
                    set({ error: error.detail || 'Failed to delete account', isLoading: false });
                    return false;
                }
            },

            fetchUser: async () => {
                if (!api.isAuthenticated()) return;
                try {
                    const user = await api.getMe();
                    set({ user, isAuthenticated: true });
                } catch {
                    set({ isAuthenticated: false, user: null });
                }
            },

            // Portfolio Actions
            fetchPortfolios: async () => {
                set({ isLoading: true });
                try {
                    const portfolios = await api.getPortfolios();
                    set({ portfolios, isLoading: false });
                    
                    // Set default portfolio if none selected
                    // Set default portfolio if none selected OR if selected one doesn't exist in fetched list
                    const currentId = get().currentPortfolioId;
                    const isValidId = currentId && portfolios.some((p: any) => p.id === currentId);
                    
                    if (!isValidId && portfolios.length > 0) {
                        const defaultPortfolio = portfolios.find((p: any) => p.is_default) || portfolios[0];
                        await get().fetchPortfolio(defaultPortfolio.id);
                    } else if (isValidId) {
                        // Refresh the current valid portfolio to ensure data is sync
                        await get().fetchPortfolio(currentId);
                    }
                } catch (error: any) {
                    set({ error: error?.detail || error?.message || 'Failed to fetch portfolios', isLoading: false });
                }
            },

            fetchPortfolio: async (portfolioId) => {
                set({ isLoading: true });
                try {
                    const portfolio = await api.getPortfolio(portfolioId);
                    set({
                        currentPortfolioId: portfolioId,
                        holdings: portfolio.holdings || [],
                        isLoading: false,
                    });
                    
                    // Fetch metrics
                    await get().fetchMetrics();
                } catch (error: any) {
                    set({ error: error.detail, isLoading: false });
                }
            },

            setCurrentPortfolio: (portfolioId) => {
                set({ currentPortfolioId: portfolioId });
                get().fetchPortfolio(portfolioId);
            },

            fetchTransactions: async () => {
                const { currentPortfolioId } = get();
                if (!currentPortfolioId) return;
                
                try {
                    const transactions = await api.getTransactions(currentPortfolioId);
                    set({ transactions: transactions as Transaction[] });
                } catch (error: any) {
                    console.error('Failed to fetch transactions:', error);
                }
            },

            // Holdings Actions
            addHolding: async (holding) => {
                const { currentPortfolioId } = get();
                if (!currentPortfolioId) {
                    set({ error: 'No portfolio selected. Please select a portfolio first.' });
                    return false;
                }

                set({ isLoading: true, error: null });
                try {
                    const response = await api.addHolding(currentPortfolioId, {
                        ticker: holding.ticker.toUpperCase(),
                        name: holding.name,
                        asset_type: holding.asset_type || 'EQUITY',
                        quantity: Number(holding.quantity),
                        avg_buy_price: Number(holding.avg_buy_price),
                        target_allocation: Number(holding.target_allocation ?? 0),
                    });

                    // CRITICAL FIX: Backend wraps responses in { success, data, error }.
                    // HTTP status is always 201 even on failure — we MUST check response.success.
                    // Previously: store assumed success if no HTTP exception → silent failure.
                    if (response && typeof response === 'object' && 'success' in response) {
                        if (!response.success) {
                            const errorMsg = response.error || 'Failed to add holding';
                            set({ error: errorMsg, isLoading: false });
                            return false;
                        }
                    }

                    // Refresh portfolio and transactions after successful add
                    await Promise.all([
                        get().fetchPortfolio(currentPortfolioId),
                        get().fetchTransactions(),
                    ]);
                    set({ isLoading: false });
                    return true;
                } catch (error: any) {
                    const errorMsg = error?.detail || error?.message || 'Failed to add holding. Please check your inputs.';
                    set({ error: errorMsg, isLoading: false });
                    return false;
                }
            },

            updateHolding: async (holdingId, data) => {
                const { currentPortfolioId } = get();
                if (!currentPortfolioId) return false;
                
                try {
                    await api.updateHolding(currentPortfolioId, holdingId, data);
                    await get().fetchPortfolio(currentPortfolioId);
                    return true;
                } catch (error: any) {
                    set({ error: error.detail });
                    return false;
                }
            },

            removeHolding: async (holdingId) => {
                const { currentPortfolioId } = get();
                if (!currentPortfolioId) return false;
                
                try {
                    await api.deleteHolding(currentPortfolioId, holdingId);
                    await Promise.all([
                        get().fetchPortfolio(currentPortfolioId),
                        get().fetchTransactions()
                    ]);
                    return true;
                } catch (error: any) {
                    set({ error: error.detail });
                    return false;
                }
            },

            // Analytics Actions
            fetchMetrics: async () => {
                const { currentPortfolioId } = get();
                if (!currentPortfolioId) return;
                
                try {
                    const metrics = await api.getPortfolioMetrics(currentPortfolioId);
                    set({ metrics });
                } catch (error: any) {
                    // Metrics might fail if no holdings, that's okay
                    console.log('Could not fetch metrics:', error.detail);
                }
            },

            // Rebalancing Actions
            generateRebalancingPlan: async () => {
                const { currentPortfolioId } = get();
                if (!currentPortfolioId) return;
                
                try {
                    const plan = await api.getRebalancePlan(currentPortfolioId);
                    set({ trades: plan.trades });
                } catch (error: any) {
                    set({ error: error.detail });
                }
            },

            executeTrades: async () => {
                const { currentPortfolioId } = get();
                if (!currentPortfolioId) return false;
                
                set({ isRebalancing: true });
                try {
                    await api.executeRebalance(currentPortfolioId);
                    
                    // Refresh portfolio and transactions
                    await Promise.all([
                        get().fetchPortfolio(currentPortfolioId),
                        get().fetchTransactions()
                    ]);
                    set({ trades: [], isRebalancing: false });
                    return true;
                } catch (error: any) {
                    set({ error: error.detail, isRebalancing: false });
                    return false;
                }
            },

            // Chart Actions
            setPriceFromGroww: (rawString: string) => {
                const { symbol, price } = parseGrowwPrice(rawString);
                if (!symbol || isNaN(price)) return;
                const { prices, priceHistory } = get();
                const history = priceHistory[symbol] || [];
                const updatedHistory = [...history, price].slice(-10);
                set({
                    prices: { ...prices, [symbol]: price },
                    priceHistory: { ...priceHistory, [symbol]: updatedHistory },
                });
            },

            setOHLCVCache: (symbol: string, data: OHLCVBar[]) => {
                const { ohlcvCache } = get();
                set({
                    ohlcvCache: {
                        ...ohlcvCache,
                        [symbol]: { data, fetchedAt: Date.now() },
                    },
                });
            },

            getOHLCVCache: (symbol: string): OHLCVBar[] | null => {
                const entry = get().ohlcvCache[symbol];
                if (!entry) return null;
                const age = Date.now() - entry.fetchedAt;
                if (age > 5 * 60 * 1000) return null; // 5min TTL
                return entry.data;
            },

            setChartSymbol: (symbol: string | null) => set({ chartSymbol: symbol }),

            resetError: () => set({ error: null }),
            
            clearState: () => set({
                user: null,
                isAuthenticated: false,
                currentPortfolioId: null,
                portfolios: [],
                holdings: [],
                metrics: null,
                transactions: [],
                trades: [],
                error: null,
                prices: {},
                priceHistory: {},
                ohlcvCache: {},
                chartSymbol: null,
            }),
        }),
        {
            name: 'optiwealth-storage',
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({
                user: state.user,
                isAuthenticated: state.isAuthenticated,
                currentPortfolioId: state.currentPortfolioId,
            }),
        }
    )
);

// Helper function for formatting currency
export function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
    }).format(amount);
}
