"use client";

/**
 * Tax Summary Card Component
 * ===========================
 * Displays capital gains and tax-loss harvesting opportunities.
 */

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { usePortfolioStore } from "@/lib/store";
import { Calculator, TrendingDown, AlertTriangle, Loader2 } from "lucide-react";

interface TaxData {
    capital_gains: {
        short_term_gains: number;
        long_term_gains: number;
        stcg_tax_estimate: number;
        ltcg_tax_estimate: number;
    };
    harvest_opportunities: {
        opportunities: Array<{
            ticker: string;
            unrealized_loss: number;
            potential_tax_savings: number;
        }>;
        total_harvestable_loss: number;
        potential_tax_savings: number;
    };
}

export function TaxSummaryCard() {
    const { currentPortfolioId } = usePortfolioStore();
    const [taxData, setTaxData] = useState<TaxData | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const fetchTaxData = async () => {
            if (!currentPortfolioId) return;

            setIsLoading(true);
            try {
                const response = await fetch(
                    `http://localhost:8000/api/tax/summary/${currentPortfolioId}`,
                    {
                        headers: {
                            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
                        },
                    }
                );
                if (response.ok) {
                    const data = await response.json();
                    setTaxData(data);
                }
            } catch (error) {
                console.error("Failed to fetch tax data:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchTaxData();
    }, [currentPortfolioId]);

    if (isLoading) {
        return (
            <Card className="p-6">
                <div className="flex items-center justify-center h-40">
                    <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                </div>
            </Card>
        );
    }

    if (!taxData) {
        return null;
    }

    const { capital_gains, harvest_opportunities } = taxData;
    const totalGains = capital_gains.short_term_gains + capital_gains.long_term_gains;
    const totalTax = capital_gains.stcg_tax_estimate + capital_gains.ltcg_tax_estimate;
    const hasHarvestOpportunities = harvest_opportunities.opportunities.length > 0;

    return (
        <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-purple-100 rounded-lg">
                    <Calculator className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                    <h3 className="font-semibold text-slate-900">Tax Summary</h3>
                    <p className="text-xs text-slate-500">Capital gains & harvesting</p>
                </div>
            </div>

            {/* Capital Gains */}
            <div className="space-y-3 mb-4">
                <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">Short-term Gains</span>
                    <span className={`text-sm font-medium ${capital_gains.short_term_gains >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ₹{Math.abs(capital_gains.short_term_gains).toLocaleString("en-IN")}
                    </span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">Long-term Gains</span>
                    <span className={`text-sm font-medium ${capital_gains.long_term_gains >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ₹{Math.abs(capital_gains.long_term_gains).toLocaleString("en-IN")}
                    </span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                    <span className="text-sm font-medium text-slate-700">Est. Tax Liability</span>
                    <span className="text-sm font-bold text-purple-600">
                        ₹{totalTax.toLocaleString("en-IN")}
                    </span>
                </div>
            </div>

            {/* Tax-Loss Harvesting */}
            {hasHarvestOpportunities && (
                <div className="bg-amber-50 rounded-lg p-3 border border-amber-100">
                    <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                        <span className="text-sm font-medium text-amber-800">Harvest Opportunity</span>
                    </div>
                    <p className="text-xs text-amber-700 mb-2">
                        You have unrealized losses of ₹{harvest_opportunities.total_harvestable_loss.toLocaleString("en-IN")} 
                        that could save ₹{harvest_opportunities.potential_tax_savings.toLocaleString("en-IN")} in taxes.
                    </p>
                    <div className="flex flex-wrap gap-1">
                        {harvest_opportunities.opportunities.slice(0, 3).map((opp) => (
                            <span 
                                key={opp.ticker}
                                className="px-2 py-0.5 bg-amber-100 rounded text-xs text-amber-800"
                            >
                                {opp.ticker}
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </Card>
    );
}
