"use client";

/**
 * Import Button Component
 * ========================
 * File upload component for importing holdings from broker exports.
 * Supports CSV and Excel files from Zerodha, Angel One, Upstox, Groww.
 */

import { useState, useRef } from "react";
import { Upload, FileSpreadsheet, X, Check, AlertTriangle, Loader2, Download } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { usePortfolioStore } from "@/lib/store";
import { toast } from "sonner";

interface PreviewData {
    columns: string[];
    sample_data: Record<string, any>[];
    detected_mappings: {
        ticker: string | null;
        price: string | null;
        quantity: string | null;
        name: string | null;
    };
    detected_broker: string;
    total_rows: number;
}

interface UploadResult {
    import_id: string;
    filename: string;
    validation: {
        valid: boolean;
        mime_type: string;
        size_bytes: number;
        virus_scan: {
            safe: boolean;
            skipped?: boolean;
            reason?: string;
        };
    };
    preview: PreviewData;
}

export function ImportButton() {
    const [isOpen, setIsOpen] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [isConfirming, setIsConfirming] = useState(false);
    const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
    const [dragActive, setDragActive] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { currentPortfolioId, fetchPortfolios } = usePortfolioStore();

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        
        const files = e.dataTransfer.files;
        if (files && files[0]) {
            handleFile(files[0]);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files[0]) {
            handleFile(files[0]);
        }
    };

    const handleFile = async (file: File) => {
        // Validate file type
        const validTypes = ['.csv', '.xlsx', '.xls'];
        const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
        
        if (!validTypes.includes(ext)) {
            toast.error("Invalid file type. Please upload CSV or Excel files.");
            return;
        }

        // Validate file size (15 MB)
        if (file.size > 15 * 1024 * 1024) {
            toast.error("File too large. Maximum size is 15 MB.");
            return;
        }

        setIsUploading(true);
        
        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch("http://localhost:8000/api/import/upload?skip_virus_scan=false", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("access_token")}`,
                },
                body: formData,
            });

            if (response.ok) {
                const result = await response.json();
                setUploadResult(result);
                toast.success("File uploaded and scanned successfully");
            } else {
                const error = await response.json();
                toast.error(error.detail || "Upload failed");
            }
        } catch (error) {
            toast.error("Failed to upload file");
            console.error("Upload error:", error);
        } finally {
            setIsUploading(false);
        }
    };

    const confirmImport = async () => {
        if (!uploadResult || !currentPortfolioId) return;

        setIsConfirming(true);

        try {
            const response = await fetch("http://localhost:8000/api/import/confirm", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${localStorage.getItem("access_token")}`,
                },
                body: JSON.stringify({
                    import_id: uploadResult.import_id,
                    portfolio_id: currentPortfolioId,
                }),
            });

            if (response.ok) {
                const result = await response.json();
                toast.success(`Imported ${result.holdings_created} new + ${result.holdings_updated} updated holdings`);
                setIsOpen(false);
                setUploadResult(null);
                fetchPortfolios?.();
            } else {
                const error = await response.json();
                toast.error(error.detail || "Import failed");
            }
        } catch (error) {
            toast.error("Import failed");
            console.error("Import error:", error);
        } finally {
            setIsConfirming(false);
        }
    };

    const cancelImport = () => {
        if (uploadResult) {
            fetch(`http://localhost:8000/api/import/cancel/${uploadResult.import_id}`, {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("access_token")}`,
                },
            });
        }
        setUploadResult(null);
        setIsOpen(false);
    };

    const getBrokerName = (broker: string) => {
        const names: Record<string, string> = {
            zerodha: "Zerodha Kite",
            angelone: "Angel One",
            upstox: "Upstox",
            groww: "Groww",
            generic: "Generic",
        };
        return names[broker] || broker;
    };

    return (
        <>
            <Button variant="outline" size="sm" onClick={() => setIsOpen(true)} className="gap-2">
                <Upload className="h-4 w-4" />
                Import
            </Button>

            {/* Modal */}
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    {/* Backdrop */}
                    <div className="absolute inset-0 bg-black/50" onClick={cancelImport} />
                    
                    {/* Modal Content */}
                    <Card className="relative z-10 w-full max-w-2xl mx-4 max-h-[90vh] overflow-auto">
                        <div className="p-6">
                            {/* Header */}
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-blue-100 rounded-lg">
                                        <FileSpreadsheet className="h-5 w-5 text-blue-600" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-semibold text-slate-900">Import Holdings</h2>
                                        <p className="text-sm text-slate-500">Upload broker export (CSV/Excel)</p>
                                    </div>
                                </div>
                                <button onClick={cancelImport} className="p-2 hover:bg-slate-100 rounded-lg">
                                    <X className="h-5 w-5 text-slate-400" />
                                </button>
                            </div>

                            {!uploadResult ? (
                                /* Upload Zone */
                                <div
                                    onDragEnter={handleDrag}
                                    onDragLeave={handleDrag}
                                    onDragOver={handleDrag}
                                    onDrop={handleDrop}
                                    className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors ${
                                        dragActive 
                                            ? "border-blue-500 bg-blue-50" 
                                            : "border-slate-300 hover:border-slate-400"
                                    }`}
                                >
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept=".csv,.xlsx,.xls"
                                        onChange={handleFileSelect}
                                        className="hidden"
                                    />

                                    {isUploading ? (
                                        <div className="flex flex-col items-center">
                                            <Loader2 className="h-12 w-12 text-blue-500 animate-spin mb-4" />
                                            <p className="text-sm text-slate-600">Uploading and scanning...</p>
                                        </div>
                                    ) : (
                                        <>
                                            <Upload className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                                            <p className="text-slate-600 mb-2">
                                                Drag & drop your file here, or{" "}
                                                <button 
                                                    onClick={() => fileInputRef.current?.click()}
                                                    className="text-blue-600 hover:underline font-medium"
                                                >
                                                    browse
                                                </button>
                                            </p>
                                            <p className="text-xs text-slate-400">
                                                Supports Zerodha, Angel One, Upstox, Groww exports (CSV, Excel)
                                            </p>
                                        </>
                                    )}
                                </div>
                            ) : (
                                /* Preview */
                                <div className="space-y-4">
                                    {/* Security Scan Result */}
                                    <div className={`flex items-center gap-3 p-3 rounded-lg ${
                                        uploadResult.validation.virus_scan?.safe 
                                            ? "bg-green-50" 
                                            : "bg-red-50"
                                    }`}>
                                        <Check className="h-5 w-5 text-green-600" />
                                        <div>
                                            <p className="text-sm font-medium text-green-800">File scanned - No threats detected</p>
                                            <p className="text-xs text-green-600">
                                                {uploadResult.validation.mime_type} • {Math.round(uploadResult.validation.size_bytes / 1024)} KB
                                            </p>
                                        </div>
                                    </div>

                                    {/* Detected Broker */}
                                    <div className="flex items-center gap-2 text-sm">
                                        <span className="text-slate-500">Detected format:</span>
                                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-md font-medium">
                                            {getBrokerName(uploadResult.preview.detected_broker)}
                                        </span>
                                        <span className="text-slate-400">
                                            ({uploadResult.preview.total_rows} rows)
                                        </span>
                                    </div>

                                    {/* Column Mappings */}
                                    <div className="bg-slate-50 rounded-lg p-4">
                                        <h4 className="text-sm font-medium text-slate-700 mb-3">Detected Columns</h4>
                                        <div className="grid grid-cols-2 gap-3 text-sm">
                                            <div className="flex items-center justify-between">
                                                <span className="text-slate-500">Ticker:</span>
                                                <span className="font-mono bg-white px-2 py-0.5 rounded border text-xs">
                                                    {uploadResult.preview.detected_mappings.ticker || "Not found"}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-slate-500">Price:</span>
                                                <span className="font-mono bg-white px-2 py-0.5 rounded border text-xs">
                                                    {uploadResult.preview.detected_mappings.price || "Not found"}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-slate-500">Quantity:</span>
                                                <span className="font-mono bg-white px-2 py-0.5 rounded border text-xs">
                                                    {uploadResult.preview.detected_mappings.quantity || "Not found"}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-slate-500">Name:</span>
                                                <span className="font-mono bg-white px-2 py-0.5 rounded border text-xs">
                                                    {uploadResult.preview.detected_mappings.name || "Auto"}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Sample Data */}
                                    <div className="overflow-x-auto">
                                        <h4 className="text-sm font-medium text-slate-700 mb-2">Preview (first 5 rows)</h4>
                                        <table className="w-full text-xs">
                                            <thead>
                                                <tr className="bg-slate-100">
                                                    {uploadResult.preview.columns.slice(0, 5).map((col) => (
                                                        <th key={col} className="px-3 py-2 text-left font-medium text-slate-600">
                                                            {col}
                                                        </th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {uploadResult.preview.sample_data.slice(0, 3).map((row, i) => (
                                                    <tr key={i} className="border-b border-slate-100">
                                                        {uploadResult.preview.columns.slice(0, 5).map((col) => (
                                                            <td key={col} className="px-3 py-2 text-slate-700">
                                                                {String(row[col] ?? "")}
                                                            </td>
                                                        ))}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex justify-end gap-3 pt-4 border-t">
                                        <Button variant="outline" onClick={cancelImport}>
                                            Cancel
                                        </Button>
                                        <Button onClick={confirmImport} disabled={isConfirming}>
                                            {isConfirming ? (
                                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                            ) : (
                                                <Download className="h-4 w-4 mr-2" />
                                            )}
                                            Import to Portfolio
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {/* Help Text */}
                            {!uploadResult && (
                                <div className="mt-6 p-4 bg-amber-50 rounded-lg">
                                    <div className="flex items-start gap-2">
                                        <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
                                        <div className="text-sm">
                                            <p className="font-medium text-amber-800">How to export from your broker:</p>
                                            <ul className="mt-1 text-amber-700 space-y-0.5">
                                                <li>• <strong>Zerodha:</strong> Console → Holdings → Download</li>
                                                <li>• <strong>Angel One:</strong> Portfolio → Download CSV</li>
                                                <li>• <strong>Upstox:</strong> Holdings → Export</li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </Card>
                </div>
            )}
        </>
    );
}
