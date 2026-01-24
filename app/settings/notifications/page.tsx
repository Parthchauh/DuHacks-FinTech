"use client";

/**
 * Notification Settings Component
 * =================================
 * Configure Telegram alerts and report preferences.
 * Allows users to set drift thresholds and test connections.
 */

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { TelegramIcon, SuccessIcon, WarningIcon } from '@/components/ui/icons';
import { toast } from 'sonner';
import { Bell, Send, Settings, CheckCircle, AlertCircle } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface NotificationSettings {
    telegram_chat_id: string | null;
    telegram_connected: boolean;
    drift_alert_enabled: boolean;
    drift_threshold: number;
    price_alert_enabled: boolean;
    rebalance_reminder_enabled: boolean;
    rebalance_frequency: string;
    service_available: boolean;
}

async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            ...(options.headers || {})
        }
    });
    if (!response.ok) throw await response.json();
    return response.json();
}

export default function NotificationSettingsCard() {
    const [settings, setSettings] = useState<NotificationSettings | null>(null);
    const [chatId, setChatId] = useState('');
    const [driftThreshold, setDriftThreshold] = useState(5);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isTesting, setIsTesting] = useState(false);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const data = await apiRequest<NotificationSettings>('/api/notifications/settings');
            setSettings(data);
            setChatId(data.telegram_chat_id || '');
            setDriftThreshold(data.drift_threshold);
        } catch (error) {
            toast.error('Failed to load notification settings', {
                description: 'Please try refreshing the page.',
                action: {
                    label: 'Retry',
                    onClick: fetchSettings
                }
            });
        } finally {
            setIsLoading(false);
        }
    };

    const saveSettings = async () => {
        setIsSaving(true);
        try {
            await apiRequest('/api/notifications/settings', {
                method: 'POST',
                body: JSON.stringify({
                    telegram_chat_id: chatId || null,
                    drift_alert_enabled: settings?.drift_alert_enabled ?? true,
                    drift_threshold: driftThreshold,
                    price_alert_enabled: settings?.price_alert_enabled ?? true,
                    rebalance_reminder_enabled: settings?.rebalance_reminder_enabled ?? true,
                    rebalance_frequency: settings?.rebalance_frequency || 'weekly'
                })
            });
            
            toast.success('Settings saved successfully!', {
                icon: <CheckCircle className="h-5 w-5 text-green-500" />
            });
            fetchSettings();
        } catch (error: any) {
            toast.error('Failed to save settings', {
                description: error.detail || 'Please check your input and try again.',
                icon: <AlertCircle className="h-5 w-5 text-red-500" />
            });
        } finally {
            setIsSaving(false);
        }
    };

    const testNotification = async () => {
        if (!chatId) {
            toast.error('Please enter your Telegram Chat ID first', {
                description: 'Send /start to @OptiWealthBot to get your Chat ID.'
            });
            return;
        }

        setIsTesting(true);
        try {
            await apiRequest('/api/notifications/test', {
                method: 'POST',
                body: JSON.stringify({ channel: 'telegram' })
            });
            
            toast.success('Test notification sent!', {
                description: 'Check your Telegram for the message.',
                icon: <Send className="h-5 w-5 text-blue-500" />
            });
        } catch (error: any) {
            toast.error('Failed to send test notification', {
                description: error.detail || 'Please verify your Chat ID is correct.',
                action: {
                    label: 'How to find Chat ID',
                    onClick: () => window.open('https://telegram.me/userinfobot', '_blank')
                }
            });
        } finally {
            setIsTesting(false);
        }
    };

    if (isLoading) {
        return (
            <Card variant="glass-card" className="p-6">
                <div className="animate-pulse space-y-4">
                    <div className="h-8 bg-slate-200 rounded w-1/3"></div>
                    <div className="h-4 bg-slate-200 rounded w-2/3"></div>
                    <div className="h-12 bg-slate-200 rounded"></div>
                </div>
            </Card>
        );
    }

    return (
        <Card variant="glass-card" className="p-6">
            <div className="flex items-center gap-3 mb-6">
                <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Bell className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                    <h2 className="text-lg font-semibold text-slate-900">Notification Settings</h2>
                    <p className="text-sm text-slate-500">Configure alerts and reminders</p>
                </div>
            </div>

            <div className="space-y-6">
                {/* Telegram Setup */}
                <div className="p-4 bg-slate-50 rounded-xl space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <TelegramIcon size={24} className="text-blue-500" />
                            <div>
                                <h3 className="font-medium text-slate-900">Telegram Alerts</h3>
                                <p className="text-xs text-slate-500">
                                    {settings?.telegram_connected ? 'Connected' : 'Not connected'}
                                </p>
                            </div>
                        </div>
                        {settings?.telegram_connected && (
                            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full flex items-center gap-1">
                                <CheckCircle className="h-3 w-3" /> Active
                            </span>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Telegram Chat ID
                        </label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={chatId}
                                onChange={(e) => setChatId(e.target.value)}
                                placeholder="e.g., 123456789"
                                className="flex-1 px-4 py-2 rounded-lg bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm"
                            />
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={testNotification}
                                disabled={isTesting || !chatId}
                            >
                                {isTesting ? 'Sending...' : 'Test'}
                            </Button>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                            Send /start to @userinfobot on Telegram to get your Chat ID
                        </p>
                    </div>
                </div>

                {/* Alert Preferences */}
                <div className="space-y-4">
                    <h3 className="font-medium text-slate-900 flex items-center gap-2">
                        <Settings className="h-4 w-4" /> Alert Preferences
                    </h3>

                    {/* Drift Threshold */}
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <div>
                            <p className="text-sm font-medium text-slate-900">Portfolio Drift Alert</p>
                            <p className="text-xs text-slate-500">Alert when allocation drifts from target</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <input
                                type="number"
                                value={driftThreshold}
                                onChange={(e) => setDriftThreshold(parseFloat(e.target.value) || 5)}
                                min="1"
                                max="20"
                                className="w-16 px-2 py-1 text-center rounded border border-slate-200 text-sm"
                            />
                            <span className="text-sm text-slate-500">%</span>
                        </div>
                    </div>

                    {/* Toggle Options */}
                    {[
                        { key: 'price_alert_enabled', label: 'Price Movement Alerts', desc: 'Notify on significant price changes' },
                        { key: 'rebalance_reminder_enabled', label: 'Rebalance Reminders', desc: 'Weekly reminder to review portfolio' }
                    ].map((option) => (
                        <div key={option.key} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                            <div>
                                <p className="text-sm font-medium text-slate-900">{option.label}</p>
                                <p className="text-xs text-slate-500">{option.desc}</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={settings?.[option.key as keyof NotificationSettings] as boolean}
                                    onChange={(e) => setSettings(prev => prev ? {...prev, [option.key]: e.target.checked} : null)}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-slate-200 peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                        </div>
                    ))}
                </div>

                {/* Save Button */}
                <Button 
                    className="w-full" 
                    onClick={saveSettings} 
                    disabled={isSaving}
                >
                    {isSaving ? 'Saving...' : 'Save Settings'}
                </Button>

                {/* Service Status */}
                {!settings?.service_available && (
                    <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                        <WarningIcon size={20} />
                        <div>
                            <p className="text-sm font-medium text-amber-800">Telegram Not Configured</p>
                            <p className="text-xs text-amber-700">
                                Add TELEGRAM_BOT_TOKEN to .env to enable Telegram notifications.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </Card>
    );
}
