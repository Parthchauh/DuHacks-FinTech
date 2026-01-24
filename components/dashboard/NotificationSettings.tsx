"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Bell, Mail, Clock, CheckCircle2, Loader2 } from "lucide-react";

export function NotificationSettings() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [enabled, setEnabled] = useState(false);
    const [frequency, setFrequency] = useState("weekly"); // weekly, daily

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const user = await api.getMe();
            if (user.email_preferences) {
                // Parse JSON string if it comes as string, or use as object
                const prefs = typeof user.email_preferences === 'string' 
                    ? JSON.parse(user.email_preferences) 
                    : user.email_preferences;
                
                setEnabled(prefs.enabled ?? false);
                setFrequency(prefs.frequency || "weekly");
            }
        } catch (error) {
            console.error("Failed to fetch notification settings", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const prefs = {
                enabled,
                frequency,
                updated_at: new Date().toISOString()
            };
            
            await api.updateMe({ email_preferences: prefs });
            toast.success("Notification preferences updated!");
        } catch (error: any) {
            toast.error(error.detail || "Failed to save preferences");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <Card className="p-6 flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </Card>
        );
    }

    return (
        <Card className="p-6">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                    <Bell className="h-5 w-5" />
                </div>
                <div>
                    <h3 className="font-semibold text-slate-900">Email Notifications</h3>
                    <p className="text-sm text-slate-500">Manage your report delivery schedule</p>
                </div>
            </div>

            <div className="space-y-6">
                {/* Enable Toggle */}
                <div className="flex items-center justify-between p-4 border border-slate-100 rounded-lg bg-slate-50/50">
                    <div className="flex items-center gap-3">
                        <Mail className="h-5 w-5 text-slate-400" />
                        <div>
                            <span className="font-medium text-slate-900 block">Portfolio Reports</span>
                            <span className="text-sm text-slate-500">Receive performance summaries via email</span>
                        </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                            type="checkbox" 
                            className="sr-only peer" 
                            checked={enabled}
                            onChange={(e) => setEnabled(e.target.checked)}
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                    </label>
                </div>

                {/* Frequency Settings - Only show if enabled */}
                <div className={`space-y-4 transition-all duration-200 ${enabled ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                    <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Report Frequency
                    </label>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div 
                            onClick={() => setFrequency("weekly")}
                            className={`
                                cursor-pointer p-4 rounded-lg border-2 text-center transition-all
                                ${frequency === "weekly" 
                                    ? "border-purple-600 bg-purple-50 text-purple-700" 
                                    : "border-slate-100 hover:border-slate-200 text-slate-600"
                                }
                            `}
                        >
                            <span className="block font-semibold mb-1">Weekly</span>
                            <span className="text-xs opacity-80">Every Monday morning</span>
                        </div>

                        <div 
                            onClick={() => setFrequency("daily")}
                            className={`
                                cursor-pointer p-4 rounded-lg border-2 text-center transition-all
                                ${frequency === "daily" 
                                    ? "border-purple-600 bg-purple-50 text-purple-700" 
                                    : "border-slate-100 hover:border-slate-200 text-slate-600"
                                }
                            `}
                        >
                            <span className="block font-semibold mb-1">Daily</span>
                            <span className="text-xs opacity-80">Every market close</span>
                        </div>
                    </div>
                </div>

                <div className="pt-2 flex justify-end">
                    <Button onClick={handleSave} disabled={saving} className="bg-purple-600 hover:bg-purple-700 text-white">
                        {saving ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <CheckCircle2 className="h-4 w-4 mr-2" />
                                Save Preferences
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </Card>
    );
}
