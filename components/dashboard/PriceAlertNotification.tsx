"use client";

/**
 * PriceAlertNotification Component
 * ==================================
 * Real-time notification component for price changes and drift alerts.
 * Shows toast notifications when portfolio value or allocation drifts significantly.
 */

import { useEffect, useState, useCallback } from "react";
import { Bell, TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { usePortfolioStore } from "@/lib/store";

interface PriceAlert {
    id: string;
    type: "price_up" | "price_down" | "drift_warning";
    ticker: string;
    message: string;
    timestamp: Date;
    value?: number;
}

export function PriceAlertNotification() {
    const { holdings, metrics, currentPortfolioId, isAuthenticated } = usePortfolioStore();
    const [lastCheckedValue, setLastCheckedValue] = useState<number | null>(null);
    const [alerts, setAlerts] = useState<PriceAlert[]>([]);

    // Check for significant portfolio value changes
    const checkPriceAlerts = useCallback(() => {
        if (!metrics || !isAuthenticated) return;

        const currentValue = metrics.total_value || 0;
        
        // Only check if we have a previous value
        if (lastCheckedValue !== null && currentValue !== lastCheckedValue) {
            const changePercent = ((currentValue - lastCheckedValue) / lastCheckedValue) * 100;
            
            // Alert if change is > 2%
            if (Math.abs(changePercent) >= 2) {
                const isUp = changePercent > 0;
                const alert: PriceAlert = {
                    id: `price_${Date.now()}`,
                    type: isUp ? "price_up" : "price_down",
                    ticker: "Portfolio",
                    message: `Your portfolio ${isUp ? "increased" : "decreased"} by ${Math.abs(changePercent).toFixed(1)}%`,
                    timestamp: new Date(),
                    value: changePercent
                };
                
                setAlerts(prev => [alert, ...prev.slice(0, 9)]); // Keep last 10
                
                if (isUp) {
                    toast.success(alert.message, {
                        icon: <TrendingUp className="h-4 w-4 text-green-500" />,
                        duration: 5000
                    });
                } else {
                    toast.error(alert.message, {
                        icon: <TrendingDown className="h-4 w-4 text-red-500" />,
                        duration: 5000
                    });
                }
            }
        }
        
        setLastCheckedValue(currentValue);
    }, [metrics, lastCheckedValue, isAuthenticated]);

    // Check for drift alerts
    const checkDriftAlerts = useCallback(() => {
        if (!holdings || holdings.length === 0) return;

        const driftThreshold = 5; // 5% drift threshold
        
        holdings.forEach(holding => {
            const drift = Math.abs((holding.actual_allocation || 0) - holding.target_allocation);
            
            if (drift >= driftThreshold && holding.target_allocation > 0) {
                // Create unique key to avoid duplicate alerts
                const alertKey = `drift_${holding.ticker}_${Math.floor(drift)}`;
                
                // Check if we already showed this alert recently
                const existingAlert = alerts.find(a => a.id === alertKey);
                if (!existingAlert) {
                    const alert: PriceAlert = {
                        id: alertKey,
                        type: "drift_warning",
                        ticker: holding.ticker,
                        message: `${holding.ticker} has drifted ${drift.toFixed(1)}% from target`,
                        timestamp: new Date(),
                        value: drift
                    };
                    
                    setAlerts(prev => [alert, ...prev.slice(0, 9)]);
                    
                    toast.warning(alert.message, {
                        icon: <AlertTriangle className="h-4 w-4 text-amber-500" />,
                        duration: 5000
                    });
                }
            }
        });
    }, [holdings, alerts]);

    // Run checks when data changes
    useEffect(() => {
        if (isAuthenticated && currentPortfolioId) {
            checkPriceAlerts();
            checkDriftAlerts();
        }
    }, [isAuthenticated, currentPortfolioId, metrics?.total_value, checkPriceAlerts, checkDriftAlerts]);

    // This component doesn't render anything visible - it just manages notifications
    return null;
}

// Alert history component for settings/notifications page
export function AlertHistory() {
    const [alerts] = useState<PriceAlert[]>([]);

    if (alerts.length === 0) {
        return (
            <div className="text-center py-8 text-slate-500">
                <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No recent alerts</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {alerts.map((alert) => (
                <div 
                    key={alert.id}
                    className="flex items-start gap-3 p-3 rounded-lg bg-slate-50"
                >
                    {alert.type === "price_up" && <TrendingUp className="h-5 w-5 text-green-500" />}
                    {alert.type === "price_down" && <TrendingDown className="h-5 w-5 text-red-500" />}
                    {alert.type === "drift_warning" && <AlertTriangle className="h-5 w-5 text-amber-500" />}
                    
                    <div className="flex-1">
                        <p className="text-sm font-medium text-slate-900">{alert.ticker}</p>
                        <p className="text-sm text-slate-600">{alert.message}</p>
                        <p className="text-xs text-slate-400 mt-1">
                            {alert.timestamp.toLocaleTimeString()}
                        </p>
                    </div>
                </div>
            ))}
        </div>
    );
}
