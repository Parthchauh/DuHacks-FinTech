"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { UploadCloud, FileSpreadsheet, AlertCircle, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { usePortfolioStore } from "@/lib/store";

interface ImportZoneProps {
    onSuccess?: () => void;
}

export function ImportZone({ onSuccess }: ImportZoneProps) {
    const { currentPortfolioId, fetchPortfolio, fetchTransactions } = usePortfolioStore();
    const [isUploading, setIsUploading] = useState(false);
    const [uploadResult, setUploadResult] = useState<any>(null);

    const onDrop = useCallback(async (acceptedFiles: File[]) => {
        if (acceptedFiles.length === 0) return;
        if (!currentPortfolioId) {
            toast.error("Please select a portfolio first");
            return;
        }

        const file = acceptedFiles[0];
        setIsUploading(true);
        setUploadResult(null);

        try {
            const result = await api.importPortfolio(currentPortfolioId, file);
            setUploadResult(result);
            toast.success("Import successful!");
            
            // Refresh data
            await Promise.all([
                fetchPortfolio(currentPortfolioId),
                fetchTransactions()
            ]);
            
            if (onSuccess) onSuccess();
        } catch (error: any) {
            toast.error(error.detail || "Import failed");
            setUploadResult({ error: error.detail || "Import failed" });
        } finally {
            setIsUploading(false);
        }
    }, [currentPortfolioId, fetchPortfolio, fetchTransactions, onSuccess]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'text/csv': ['.csv'],
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
            'application/vnd.ms-excel': ['.xls']
        },
        maxFiles: 1,
        multiple: false
    });

    return (
        <div className="space-y-4">
            <div 
                {...getRootProps()} 
                className={`
                    border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200
                    ${isDragActive 
                        ? "border-primary bg-primary/5" 
                        : "border-slate-200 hover:border-primary/50 hover:bg-slate-50"
                    }
                    ${isUploading ? "pointer-events-none opacity-50" : ""}
                `}
            >
                <input {...getInputProps()} />
                
                <div className="flex flex-col items-center justify-center gap-3">
                    <div className="p-3 bg-blue-50 rounded-full text-primary">
                        {isUploading ? (
                            <Loader2 className="h-6 w-6 animate-spin" />
                        ) : (
                            <UploadCloud className="h-6 w-6" />
                        )}
                    </div>
                    
                    <div className="space-y-1">
                        <p className="text-sm font-medium text-slate-900">
                            {isDragActive ? "Drop the file here" : "Click or drag file to upload"}
                        </p>
                        <p className="text-xs text-slate-500">
                            Supports Zerodha, Groww, Angel One CSV/Excel exports
                        </p>
                    </div>
                </div>
            </div>

            {/* Results Summary */}
            {uploadResult && !uploadResult.error && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                        <h4 className="text-sm font-medium text-green-900">Import Complete</h4>
                        <p className="text-sm text-green-700 mt-1">
                            {uploadResult.message}
                        </p>
                        {uploadResult.metadata && (
                            <div className="mt-2 text-xs text-green-800 bg-green-100/50 p-2 rounded">
                                Detected Broker: <span className="font-semibold uppercase">{uploadResult.metadata.detected_broker}</span>
                            </div>
                        )}
                    </div>
                </div>
            )}
            
            {uploadResult && uploadResult.error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                    <div>
                        <h4 className="text-sm font-medium text-red-900">Import Failed</h4>
                        <p className="text-sm text-red-700 mt-1">
                            {uploadResult.error}
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
