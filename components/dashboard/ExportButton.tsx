"use client";

/**
 * Export Button Component
 * ========================
 * Dropdown button for exporting portfolio data as Excel or PDF.
 */

import { useState } from "react";
import { Download, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";
import { usePortfolioStore } from "@/lib/store";
import { toast } from "sonner";

export function ExportButton() {
    const [isOpen, setIsOpen] = useState(false);
    const [isExporting, setIsExporting] = useState<string | null>(null);
    const { currentPortfolioId } = usePortfolioStore();

    const handleExport = async (format: "excel" | "pdf") => {
        if (!currentPortfolioId) {
            toast.error("No portfolio selected");
            return;
        }

        setIsExporting(format);
        try {
            if (format === "excel") {
                await api.exportExcel(currentPortfolioId);
                toast.success("Excel file downloaded successfully");
            } else {
                await api.exportPdf(currentPortfolioId);
                toast.success("PDF file downloaded successfully");
            }
        } catch (error) {
            toast.error(`Failed to export ${format.toUpperCase()}`);
            console.error("Export error:", error);
        } finally {
            setIsExporting(null);
            setIsOpen(false);
        }
    };

    return (
        <div className="relative">
            <Button
                variant="outline"
                size="sm"
                onClick={() => setIsOpen(!isOpen)}
                className="gap-2"
            >
                <Download className="h-4 w-4" />
                Export
            </Button>

            {isOpen && (
                <>
                    {/* Backdrop */}
                    <div 
                        className="fixed inset-0 z-40" 
                        onClick={() => setIsOpen(false)}
                    />
                    
                    {/* Dropdown */}
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-50">
                        <button
                            onClick={() => handleExport("excel")}
                            disabled={!!isExporting}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
                        >
                            {isExporting === "excel" ? (
                                <Loader2 className="h-4 w-4 animate-spin text-green-600" />
                            ) : (
                                <FileSpreadsheet className="h-4 w-4 text-green-600" />
                            )}
                            Export as Excel
                        </button>
                        <button
                            onClick={() => handleExport("pdf")}
                            disabled={!!isExporting}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
                        >
                            {isExporting === "pdf" ? (
                                <Loader2 className="h-4 w-4 animate-spin text-red-600" />
                            ) : (
                                <FileText className="h-4 w-4 text-red-600" />
                            )}
                            Export as PDF
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}
