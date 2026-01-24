"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { AnimatePresence, motion } from "framer-motion";
import { Search, X, Loader2, Plus } from "lucide-react";
import { api } from "@/lib/api";
import { usePortfolioStore } from "@/lib/store";
import { toast } from "sonner";

interface AddHoldingModalProps {
    isOpen: boolean;
    onClose: () => void;
}

interface StockResult {
    ticker: string;
    name: string;
    type: string;
    price: number;
}

export function AddHoldingModal({ isOpen, onClose }: AddHoldingModalProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<StockResult[]>([]);
    const [selectedStock, setSelectedStock] = useState<StockResult | null>(null);
    const [quantity, setQuantity] = useState("");
    const [buyPrice, setBuyPrice] = useState("");
    const [targetAllocation, setTargetAllocation] = useState("");
    const [isSearching, setIsSearching] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const { addHolding } = usePortfolioStore();

    // Search stocks
    useEffect(() => {
        if (searchQuery.length < 1) {
            setSearchResults([]);
            return;
        }

        const searchTimer = setTimeout(async () => {
            setIsSearching(true);
            try {
                const result = await api.searchStocks(searchQuery);
                setSearchResults(result.results || []);
            } catch {
                setSearchResults([]);
            }
            setIsSearching(false);
        }, 300);

        return () => clearTimeout(searchTimer);
    }, [searchQuery]);

    const handleSelectStock = (stock: StockResult) => {
        setSelectedStock(stock);
        setBuyPrice(stock.price.toString());
        setSearchQuery("");
        setSearchResults([]);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedStock) return;

        setIsSubmitting(true);
        try {
            const success = await addHolding({
                ticker: selectedStock.ticker,
                name: selectedStock.name,
                asset_type: selectedStock.type,
                quantity: parseFloat(quantity),
                avg_buy_price: parseFloat(buyPrice),
                target_allocation: parseFloat(targetAllocation) || 0,
            });

            if (success) {
                toast.success(`Added ${selectedStock.ticker} to portfolio`);
                handleReset();
                onClose();
            } else {
                toast.error("Failed to add holding");
            }
        } catch (error: any) {
            toast.error(error.message || "Failed to add holding");
        }
        setIsSubmitting(false);
    };

    const handleReset = () => {
        setSelectedStock(null);
        setSearchQuery("");
        setQuantity("");
        setBuyPrice("");
        setTargetAllocation("");
    };

    if (!isOpen) return null;

    const totalValue = selectedStock && quantity && buyPrice 
        ? parseFloat(quantity) * parseFloat(buyPrice) 
        : 0;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4"
            >
                <Card className="w-full max-w-lg overflow-hidden shadow-2xl relative bg-white">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-4 right-4 z-10"
                        onClick={onClose}
                    >
                        <X className="h-5 w-5" />
                    </Button>

                    <div className="p-6">
                        <h2 className="text-2xl font-bold text-slate-900 mb-2">Add Holding</h2>
                        <p className="text-slate-500 mb-6">Search for a stock or ETF to add to your portfolio.</p>

                        <form onSubmit={handleSubmit} className="space-y-5">
                            {/* Stock Search */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700">Stock / ETF</label>
                                {selectedStock ? (
                                    <div className="flex items-center justify-between p-3 bg-primary/5 border border-primary/20 rounded-xl">
                                        <div>
                                            <p className="font-semibold text-slate-900">{selectedStock.ticker}</p>
                                            <p className="text-sm text-slate-500">{selectedStock.name}</p>
                                        </div>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={handleReset}
                                        >
                                            Change
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                        <input
                                            type="text"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            placeholder="Search RELIANCE, NIFTYBEES, TCS..."
                                            className="w-full pl-10 pr-10 py-3 rounded-xl bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-slate-900"
                                        />
                                        {isSearching && (
                                            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 animate-spin" />
                                        )}

                                        {/* Search Results Dropdown */}
                                        {searchResults.length > 0 && (
                                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-10 max-h-60 overflow-y-auto">
                                                {searchResults.map((stock) => (
                                                    <button
                                                        key={stock.ticker}
                                                        type="button"
                                                        onClick={() => handleSelectStock(stock)}
                                                        className="w-full px-4 py-3 text-left hover:bg-slate-50 flex items-center justify-between border-b border-slate-100 last:border-0"
                                                    >
                                                        <div>
                                                            <p className="font-semibold text-slate-900">{stock.ticker}</p>
                                                            <p className="text-sm text-slate-500">{stock.name}</p>
                                                        </div>
                                                        <span className="text-sm font-medium text-slate-600">
                                                            ₹{stock.price.toLocaleString()}
                                                        </span>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Quantity and Price */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-700">Quantity</label>
                                    <input
                                        type="number"
                                        required
                                        min="0.0001"
                                        step="any"
                                        value={quantity}
                                        onChange={(e) => setQuantity(e.target.value)}
                                        placeholder="100"
                                        className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-slate-900"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-700">Avg. Buy Price (₹)</label>
                                    <input
                                        type="number"
                                        required
                                        min="0.01"
                                        step="any"
                                        value={buyPrice}
                                        onChange={(e) => setBuyPrice(e.target.value)}
                                        placeholder="2500"
                                        className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-slate-900"
                                    />
                                </div>
                            </div>

                            {/* Target Allocation */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700">Target Allocation (%)</label>
                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={targetAllocation}
                                    onChange={(e) => setTargetAllocation(e.target.value)}
                                    placeholder="20"
                                    className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-slate-900"
                                />
                                <p className="text-xs text-slate-400">Optional: Set your target portfolio weight for this asset</p>
                            </div>

                            {/* Total Value Preview */}
                            {totalValue > 0 && (
                                <div className="bg-slate-50 rounded-xl p-4 flex items-center justify-between">
                                    <span className="text-slate-600">Total Investment</span>
                                    <span className="text-xl font-bold text-slate-900">
                                        ₹{totalValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                                    </span>
                                </div>
                            )}

                            {/* Actions */}
                            <div className="flex gap-3 pt-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="flex-1"
                                    onClick={onClose}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    className="flex-1"
                                    disabled={!selectedStock || !quantity || !buyPrice || isSubmitting}
                                >
                                    {isSubmitting ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <>
                                            <Plus className="h-4 w-4 mr-2" /> Add to Portfolio
                                        </>
                                    )}
                                </Button>
                            </div>
                        </form>
                    </div>
                </Card>
            </motion.div>
        </AnimatePresence>
    );
}
