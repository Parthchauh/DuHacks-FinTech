/**
 * OptiWealth Frontend - API Client
 * ==================================
 * Centralized HTTP client for communicating with the FastAPI backend.
 * Handles JWT token management, automatic token refresh on 401 errors,
 * and provides type-safe methods for all API endpoints.
 * 
 * Architecture Pattern:
 * Uses a singleton ApiClient class to maintain authentication state
 * across the application. Tokens are persisted to localStorage for
 * session continuity across page reloads.
 * 
 * Token Flow:
 * 1. Login → Receive access_token (30min) + refresh_token (7 days)
 * 2. Each request → Attach access_token in Authorization header
 * 3. On 401 → Automatically try refresh_token to get new access_token
 * 4. If refresh fails → Clear tokens and require re-login
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface ApiError {
    detail: string;
    status: number;
}

class ApiClient {
    private baseUrl: string;
    private accessToken: string | null = null;
    private refreshToken: string | null = null;

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl;
        
        /**
         * Hydrate tokens from localStorage on client-side initialization.
         * The typeof check prevents SSR errors since localStorage is browser-only.
         */
        if (typeof window !== 'undefined') {
            this.accessToken = localStorage.getItem('access_token');
            this.refreshToken = localStorage.getItem('refresh_token');
        }
    }

    /**
     * Persist JWT tokens to both memory and localStorage.
     * localStorage provides persistence across browser sessions,
     * while memory access avoids localStorage reads on every request.
     */
    setTokens(accessToken: string, refreshToken: string) {
        this.accessToken = accessToken;
        this.refreshToken = refreshToken;
        if (typeof window !== 'undefined') {
            localStorage.setItem('access_token', accessToken);
            localStorage.setItem('refresh_token', refreshToken);
        }
    }

    /**
     * Clear all authentication state on logout or session expiry.
     * Ensures both memory and localStorage are cleaned.
     */
    clearTokens() {
        this.accessToken = null;
        this.refreshToken = null;
        if (typeof window !== 'undefined') {
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
        }
    }

    isAuthenticated(): boolean {
        return !!this.accessToken;
    }

    /**
     * Core request method with automatic token refresh.
     * 
     * Flow:
     * 1. Attach Authorization header if token exists
     * 2. Make request to backend
     * 3. If 401 and refresh_token exists → attempt token refresh
     * 4. If refresh succeeds → retry original request with new token
     * 5. If refresh fails → clear tokens (user must re-login)
     * 
     * This pattern provides seamless UX - users aren't logged out
     * unexpectedly as long as their refresh token is valid.
     */
    private async request<T>(
        endpoint: string,
        options: RequestInit = {}
    ): Promise<T> {
        const url = `${this.baseUrl}${endpoint}`;
        
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            ...(options.headers as Record<string, string> || {}),
        };

        if (this.accessToken) {
            headers['Authorization'] = `Bearer ${this.accessToken}`;
        }

        const response = await fetch(url, {
            ...options,
            headers,
        });

        // Handle 401 with automatic token refresh
        if (response.status === 401 && this.refreshToken) {
            const refreshed = await this.tryRefreshToken();
            if (refreshed) {
                headers['Authorization'] = `Bearer ${this.accessToken}`;
                const retryResponse = await fetch(url, { ...options, headers });
                if (!retryResponse.ok) {
                    throw await this.handleError(retryResponse);
                }
                return retryResponse.json();
            }
        }

        if (!response.ok) {
            throw await this.handleError(response);
        }

        // Handle 204 No Content (e.g., DELETE operations)
        if (response.status === 204) {
            return {} as T;
        }

        return response.json();
    }

    /**
     * Attempt to refresh the access token using the refresh token.
     * Returns true if successful, false if refresh failed.
     */
    private async tryRefreshToken(): Promise<boolean> {
        try {
            const response = await fetch(`${this.baseUrl}/api/auth/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refresh_token: this.refreshToken }),
            });

            if (response.ok) {
                const data = await response.json();
                this.setTokens(data.access_token, data.refresh_token);
                return true;
            }
        } catch {
            // Refresh failed - network error or server down
        }
        this.clearTokens();
        return false;
    }

    /**
     * Extract error message from API response.
     * FastAPI returns errors in {detail: string} format.
     */
    private async handleError(response: Response): Promise<ApiError> {
        try {
            const data = await response.json();
            return { detail: data.detail || 'An error occurred', status: response.status };
        } catch {
            return { detail: 'An error occurred', status: response.status };
        }
    }

    // =========================================================================
    // AUTHENTICATION ENDPOINTS
    // =========================================================================

    /**
     * Register a new user account.
     * Backend creates user + default portfolio + sends welcome email.
     */
    async register(data: { email: string; password: string; full_name: string }) {
        const response = await this.request<{
            access_token?: string;
            refresh_token?: string;
            token_type?: string;
            mfa_required?: boolean;
            message?: string;
        }>('/api/auth/register-and-login', {
            method: 'POST',
            body: JSON.stringify(data),
        });
        
        if (response.access_token && response.refresh_token) {
            this.setTokens(response.access_token, response.refresh_token);
        }
        
        return response;
    }

    async validatePassword(password: string) {
        return this.request<{
            is_valid: boolean;
            message: string;
            score: number;
            strength: string;
        }>('/api/auth/validate-password', {
            method: 'POST',
            body: JSON.stringify({ password }),
        });
    }

    /**
     * Authenticate user and receive JWT tokens.
     * Tokens are automatically stored for subsequent requests.
     */
    async getCaptcha() {
        return this.request<{ token: string; question: string }>('/api/auth/captcha');
    }

    async verifyMfa(mfa_token: string, otp: string) {
        const response = await this.request<{
            access_token: string;
            refresh_token: string;
            token_type: string;
        }>('/api/auth/verify-mfa', {
            method: 'POST',
            body: JSON.stringify({ mfa_token, otp }),
        });
        this.setTokens(response.access_token, response.refresh_token);
        return response;
    }

    /**
     * Authenticate user and receive JWT tokens.
     * Tokens are automatically stored for subsequent requests.
     * Supports MFA: May return mfa_required=true instead of tokens.
     */
    async login(email: string, password: string, captcha_token?: string, captcha_answer?: string) {
        const response = await this.request<{
            access_token?: string;
            refresh_token?: string;
            token_type?: string;
            mfa_required?: boolean;
            mfa_token?: string;
            message?: string;
        }>('/api/auth/login/json', {
            method: 'POST',
            body: JSON.stringify({ email, password, captcha_token, captcha_answer }),
        });
        
        if (response.access_token && response.refresh_token) {
            this.setTokens(response.access_token, response.refresh_token);
        }
        
        return response;
    }

    /**
     * Authenticate with Google ID Token.
     * Used by Google Sign-In button to exchange Google credential for app tokens.
     */
    async googleLogin(id_token: string) {
        const response = await this.request<{
            access_token: string;
            refresh_token: string;
            token_type: string;
            mfa_required: boolean;
        }>('/api/auth/google', {
            method: 'POST',
            body: JSON.stringify({ id_token }),
        });

        if (response.access_token && response.refresh_token) {
            this.setTokens(response.access_token, response.refresh_token);
        }

        return response;
    }

    async setupTotp() {
        return this.request<{
            secret: string;
            uri: string;
            backup_codes: string[];
        }>('/api/auth/mfa/setup-totp', {
            method: 'POST'
        });
    }

    async confirmTotp(code: string) {
        return this.request<{ message: string }>('/api/auth/mfa/confirm-totp', {
            method: 'POST',
            body: JSON.stringify({ code })
        });
    }

    async getMfaStatus() {
        return this.request<{
            method: string;
            totp_enabled: boolean;
            has_backup_codes: boolean;
        }>('/api/auth/mfa/status');
    }

    async disableMfa() {
        return this.request<{ message: string }>('/api/auth/mfa/disable', {
            method: 'POST'
        });
    }

    async logout() {
        this.clearTokens();
    }

    async getMe() {
        return this.request<any>('/api/auth/me');
    }

    async updateMe(data: { 
        full_name?: string; 
        currency?: string; 
        risk_profile?: string;
        email_preferences?: Record<string, any>;
    }) {
        return this.request<any>('/api/auth/me', {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    async deleteAccount() {
        return this.request<void>('/api/auth/me', {
            method: 'DELETE',
        });
    }

    // =========================================================================
    // PORTFOLIO ENDPOINTS
    // =========================================================================

    async getPortfolios() {
        return this.request<any[]>('/api/portfolios/');
    }

    /**
     * Get portfolio with all holdings enriched with current prices.
     * Backend fetches real-time prices and calculates P&L, drift.
     */
    async getPortfolio(portfolioId: number) {
        return this.request<any>(`/api/portfolios/${portfolioId}`);
    }

    async createPortfolio(data: { name: string; description?: string }) {
        return this.request<any>('/api/portfolios/', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async updatePortfolio(portfolioId: number, data: { name?: string; description?: string }) {
        return this.request<any>(`/api/portfolios/${portfolioId}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    async deletePortfolio(portfolioId: number) {
        return this.request<void>(`/api/portfolios/${portfolioId}`, {
            method: 'DELETE',
        });
    }

    async importPortfolio(portfolioId: number, file: File) {
        const formData = new FormData();
        formData.append('file', file);
        
        // Custom request for FormData
        const url = `${this.baseUrl}/api/portfolios/${portfolioId}/import`;
        const headers: Record<string, string> = {};
        
        if (this.accessToken) {
            headers['Authorization'] = `Bearer ${this.accessToken}`;
        }
        
        const response = await fetch(url, {
            method: 'POST',
            headers,
            body: formData,
        });

        if (!response.ok) {
            throw await this.handleError(response);
        }

        return response.json();
    }

    // =========================================================================
    // HOLDINGS ENDPOINTS
    // =========================================================================

    /**
     * Add a new holding to portfolio.
     * target_allocation is used for rebalancing calculations.
     */
    async addHolding(portfolioId: number, data: {
        ticker: string;
        name: string;
        asset_type?: string;
        quantity: number;
        avg_buy_price: number;
        target_allocation?: number;
    }) {
        return this.request<any>(`/api/portfolios/${portfolioId}/holdings`, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async updateHolding(portfolioId: number, holdingId: number, data: {
        quantity?: number;
        avg_buy_price?: number;
        target_allocation?: number;
    }) {
        return this.request<any>(`/api/portfolios/${portfolioId}/holdings/${holdingId}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    async deleteHolding(portfolioId: number, holdingId: number) {
        return this.request<void>(`/api/portfolios/${portfolioId}/holdings/${holdingId}`, {
            method: 'DELETE',
        });
    }

    async getTransactions(portfolioId: number) {
        return this.request<any[]>(`/api/portfolios/${portfolioId}/transactions`);
    }

    // =========================================================================
    // ANALYTICS ENDPOINTS - Quantitative Finance Calculations
    // =========================================================================

    /**
     * Get comprehensive portfolio metrics including:
     * - Sharpe ratio (risk-adjusted return)
     * - Volatility (annualized standard deviation)
     * - Beta (market sensitivity)
     * - Alpha (excess return over benchmark)
     * - Risk score (1-10 composite)
     * - Diversification score (based on correlations)
     */
    async getPortfolioMetrics(portfolioId: number) {
        return this.request<any>(`/api/analytics/portfolio/${portfolioId}/metrics`);
    }

    /**
     * Get historical portfolio value based on actual transactions.
     * Returns monthly portfolio value snapshots for charting.
     */
    async getPortfolioHistory(portfolioId: number, period: string = "1Y") {
        return this.request<{ history: Array<{ date: string; value: number }>; period: string }>(
            `/api/analytics/portfolio/${portfolioId}/history?period=${period}`
        );
    }

    /**
     * Get correlation matrix for portfolio assets.
     * Used for diversification analysis - lower correlations = better diversification.
     */
    async getCorrelationMatrix(portfolioId: number) {
        return this.request<any>(`/api/analytics/portfolio/${portfolioId}/correlation`);
    }

    /**
     * Calculate the efficient frontier using Modern Portfolio Theory.
     * Returns optimal risk-return tradeoff curve and max Sharpe portfolio.
     */
    async getEfficientFrontier(portfolioId: number) {
        return this.request<any>(`/api/analytics/portfolio/${portfolioId}/efficient-frontier`);
    }

    /**
     * Run Monte Carlo simulation for portfolio value projection.
     * Uses Geometric Brownian Motion with 1000 simulations by default.
     * Returns percentile bands (5th to 95th) and Value at Risk.
     */
    async runMonteCarlo(portfolioId: number, days: number = 252, simulations: number = 1000) {
        return this.request<any>(
            `/api/analytics/portfolio/${portfolioId}/monte-carlo?days=${days}&simulations=${simulations}`
        );
    }

    /**
     * Generate rebalancing trades to align holdings with targets.
     * If optimize=true, uses MPT to suggest optimal allocations.
     */
    async getRebalancePlan(portfolioId: number, optimize: boolean = false) {
        return this.request<any>(
            `/api/analytics/portfolio/${portfolioId}/rebalance-plan?optimize=${optimize}`,
            { method: 'POST' }
        );
    }

    /**
     * Execute the rebalancing trades and update holdings.
     * Creates transaction records for audit trail.
     */
    async executeRebalance(portfolioId: number) {
        return this.request<any>(`/api/analytics/portfolio/${portfolioId}/execute-rebalance`, {
            method: 'POST',
        });
    }

    // =========================================================================
    // STOCK DATA ENDPOINTS
    // =========================================================================

    /**
     * Search for stocks by ticker or name.
     * Uses Alpha Vantage with fallback to local Indian stock database.
     */
    async searchStocks(query: string) {
        return this.request<{ results: any[] }>(`/api/analytics/stocks/search?query=${encodeURIComponent(query)}`);
    }

    async getStockQuote(ticker: string) {
        return this.request<any>(`/api/analytics/stocks/${ticker}/quote`);
    }

    async getStockHistory(ticker: string, days: number = 365) {
        return this.request<any>(`/api/analytics/stocks/${ticker}/history?days=${days}`);
    }

    /**
     * Compare portfolio performance against benchmark index.
     * key: ^NSEI (NIFTY 50), ^BSESN (SENSEX)
     */
    async getPortfolioBenchmark(portfolioId: number, benchmark: string = "^NSEI", period: string = "1Y") {
        return this.request<any>(
            `/api/analytics/portfolio/${portfolioId}/benchmark?benchmark=${encodeURIComponent(benchmark)}&period=${period}`
        );
    }

    // =========================================================================
    // EXPORT ENDPOINTS
    // =========================================================================

    /**
     * Get URL for Excel export download.
     * Returns the direct URL to trigger file download.
     */
    getExportExcelUrl(portfolioId: number): string {
        return `${this.baseUrl}/api/export/excel/${portfolioId}`;
    }

    /**
     * Get URL for PDF export download.
     * Returns the direct URL to trigger file download.
     */
    getExportPdfUrl(portfolioId: number): string {
        return `${this.baseUrl}/api/export/pdf/${portfolioId}`;
    }

    /**
     * Download file with authentication.
     * Creates a temporary link to download the file.
     */
    async downloadFile(url: string, filename: string) {
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${this.accessToken}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Download failed');
        }
        
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(downloadUrl);
    }

    async exportExcel(portfolioId: number) {
        const url = this.getExportExcelUrl(portfolioId);
        await this.downloadFile(url, `OptiWealth_Portfolio_${portfolioId}.xlsx`);
    }

    async exportPdf(portfolioId: number) {
        const url = this.getExportPdfUrl(portfolioId);
        await this.downloadFile(url, `OptiWealth_Portfolio_${portfolioId}.pdf`);
    }
}

// Singleton instance for use across the application
export const api = new ApiClient(API_BASE_URL);
export type { ApiError };
