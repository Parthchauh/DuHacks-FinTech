"use client";

/**
 * Sessions Page - Active Session Management
 * ==========================================
 * View and manage active login sessions across devices.
 */

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { 
    Monitor, 
    Smartphone, 
    Globe, 
    Trash2, 
    LogOut, 
    Shield, 
    Loader2,
    CheckCircle2
} from "lucide-react";
import { toast } from "sonner";

interface Session {
    id: number;
    device_name: string;
    ip_address: string;
    location: string;
    created_at: string;
    last_active: string;
    is_current: boolean;
}

export default function SessionsPage() {
    const [sessions, setSessions] = useState<Session[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [revokingId, setRevokingId] = useState<number | null>(null);

    const fetchSessions = async () => {
        try {
            const response = await fetch("http://localhost:8000/api/user/sessions", {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("access_token")}`,
                },
            });
            if (response.ok) {
                const data = await response.json();
                setSessions(data.sessions || []);
            }
        } catch (error) {
            toast.error("Failed to load sessions");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchSessions();
    }, []);

    const revokeSession = async (sessionId: number) => {
        setRevokingId(sessionId);
        try {
            const response = await fetch(`http://localhost:8000/api/user/sessions/${sessionId}`, {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("access_token")}`,
                },
            });
            if (response.ok) {
                toast.success("Session revoked");
                fetchSessions();
            } else {
                toast.error("Failed to revoke session");
            }
        } catch (error) {
            toast.error("Failed to revoke session");
        } finally {
            setRevokingId(null);
        }
    };

    const revokeAllSessions = async () => {
        try {
            const response = await fetch("http://localhost:8000/api/user/sessions", {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("access_token")}`,
                },
            });
            if (response.ok) {
                toast.success("All other sessions revoked");
                fetchSessions();
            }
        } catch (error) {
            toast.error("Failed to revoke sessions");
        }
    };

    const getDeviceIcon = (deviceName: string) => {
        if (deviceName.toLowerCase().includes("mobile") || deviceName.toLowerCase().includes("iphone") || deviceName.toLowerCase().includes("android")) {
            return <Smartphone className="h-5 w-5 text-slate-600" />;
        }
        return <Monitor className="h-5 w-5 text-slate-600" />;
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto p-6">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                        <Shield className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Active Sessions</h1>
                        <p className="text-sm text-slate-500">Manage your logged-in devices</p>
                    </div>
                </div>

                {sessions.length > 1 && (
                    <Button variant="outline" onClick={revokeAllSessions} className="text-red-600 border-red-200 hover:bg-red-50">
                        <LogOut className="h-4 w-4 mr-2" />
                        Logout All Others
                    </Button>
                )}
            </div>

            <div className="space-y-4">
                {sessions.map((session) => (
                    <Card key={session.id} className={`p-4 ${session.is_current ? 'border-blue-200 bg-blue-50/50' : ''}`}>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-slate-100 rounded-lg">
                                    {getDeviceIcon(session.device_name)}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-medium text-slate-900">{session.device_name}</h3>
                                        {session.is_current && (
                                            <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full flex items-center gap-1">
                                                <CheckCircle2 className="h-3 w-3" />
                                                Current
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-4 mt-1 text-sm text-slate-500">
                                        <span className="flex items-center gap-1">
                                            <Globe className="h-3 w-3" />
                                            {session.ip_address}
                                        </span>
                                        <span>Last active: {formatDate(session.last_active)}</span>
                                    </div>
                                </div>
                            </div>

                            {!session.is_current && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => revokeSession(session.id)}
                                    disabled={revokingId === session.id}
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                    {revokingId === session.id ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Trash2 className="h-4 w-4" />
                                    )}
                                </Button>
                            )}
                        </div>
                    </Card>
                ))}

                {sessions.length === 0 && (
                    <Card className="p-8 text-center">
                        <Shield className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                        <p className="text-slate-500">No active sessions found</p>
                    </Card>
                )}
            </div>
        </div>
    );
}
