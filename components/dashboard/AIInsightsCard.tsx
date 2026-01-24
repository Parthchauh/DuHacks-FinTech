"use client";

/**
 * AI Insights Card Component
 * ============================
 * Displays AI-powered portfolio suggestions and recommendations.
 */

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { usePortfolioStore } from "@/lib/store";
import { 
    Sparkles, 
    TrendingUp, 
    TrendingDown, 
    RefreshCw, 
    Loader2,
    CheckCircle,
    AlertCircle,
    ArrowRight
} from "lucide-react";

interface Suggestion {
    type: "rebalance" | "add" | "reduce" | "hold" | "review" | "optimize";
    ticker: string | null;
    action: string;
    reason: string;
}

interface AIAnalysis {
    overall_health: "good" | "moderate" | "needs_attention";
    suggestions: Suggestion[];
    summary: string;
}

export function AIInsightsCard() {
    const { currentPortfolioId } = usePortfolioStore();
    const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const fetchAnalysis = async () => {
        if (!currentPortfolioId) return;

        setIsLoading(true);
        try {
            const response = await fetch(
                `http://localhost:8000/api/ai/analyze/${currentPortfolioId}`,
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem("access_token")}`,
                    },
                }
            );
            if (response.ok) {
                const data = await response.json();
                setAnalysis(data.analysis);
            }
        } catch (error) {
            console.error("Failed to fetch AI analysis:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchAnalysis();
    }, [currentPortfolioId]);

    const getHealthColor = (health: string) => {
        switch (health) {
            case "good": return "text-green-600 bg-green-50";
            case "moderate": return "text-amber-600 bg-amber-50";
            case "needs_attention": return "text-red-600 bg-red-50";
            default: return "text-slate-600 bg-slate-50";
        }
    };

    const getHealthIcon = (health: string) => {
        switch (health) {
            case "good": return <CheckCircle className="h-5 w-5" />;
            case "moderate": return <AlertCircle className="h-5 w-5" />;
            case "needs_attention": return <AlertCircle className="h-5 w-5" />;
            default: return <Sparkles className="h-5 w-5" />;
        }
    };

    const getSuggestionIcon = (type: string) => {
        switch (type) {
            case "add": return <TrendingUp className="h-4 w-4 text-green-500" />;
            case "reduce": return <TrendingDown className="h-4 w-4 text-red-500" />;
            default: return <ArrowRight className="h-4 w-4 text-blue-500" />;
        }
    };

    return (
        <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-purple-100 rounded-lg">
                        <Sparkles className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-slate-900">AI Insights</h3>
                        <p className="text-xs text-slate-500">Smart portfolio analysis</p>
                    </div>
                </div>
                <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={fetchAnalysis}
                    disabled={isLoading}
                >
                    <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                </Button>
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
                </div>
            ) : analysis ? (
                <>
                    {/* Health Status */}
                    <div className={`flex items-center gap-2 p-3 rounded-lg mb-4 ${getHealthColor(analysis.overall_health)}`}>
                        {getHealthIcon(analysis.overall_health)}
                        <span className="font-medium capitalize">{analysis.overall_health.replace("_", " ")}</span>
                    </div>

                    {/* Summary */}
                    <p className="text-sm text-slate-600 mb-4">{analysis.summary}</p>

                    {/* Suggestions */}
                    {analysis.suggestions.length > 0 && (
                        <div className="space-y-3">
                            <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                                Recommendations
                            </h4>
                            {analysis.suggestions.slice(0, 4).map((suggestion, i) => (
                                <div 
                                    key={i}
                                    className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg"
                                >
                                    <div className="mt-0.5">
                                        {getSuggestionIcon(suggestion.type)}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            {suggestion.ticker && (
                                                <span className="px-2 py-0.5 bg-white rounded text-xs font-medium text-slate-700 border">
                                                    {suggestion.ticker}
                                                </span>
                                            )}
                                            <span className="text-sm font-medium text-slate-800">
                                                {suggestion.action}
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-500 mt-1">
                                            {suggestion.reason}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            ) : (
                <div className="text-center py-8 text-slate-400">
                    <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No analysis available</p>
                    <Button variant="outline" size="sm" className="mt-3" onClick={fetchAnalysis}>
                        Generate Analysis
                    </Button>
                </div>
            )}
        </Card>
    );
}
