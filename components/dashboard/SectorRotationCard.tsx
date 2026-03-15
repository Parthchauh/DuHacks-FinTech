"use client";

/**
 * SectorRotationCard Component
 * ================================
 * Dashboard card showing sector momentum signals, RS rankings,
 * and rotation suggestions using Recharts bar charts.
 */

import { Card } from "@/components/ui/Card";
import { useEffect, useState } from "react";
import { usePortfolioStore } from "@/lib/store";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { TrendingUp, TrendingDown, Minus, ArrowRightLeft, ChevronDown, ChevronUp } from "lucide-react";

interface SectorRanking {
  sector: string;
  color: string;
  rs_1m: number;
  rs_3m: number;
  rs_6m: number;
  composite_rs: number;
  momentum: string;
  return_1m: number;
  return_3m: number;
  return_6m: number;
  rank: number;
  etf: string | null;
}

interface SectorSignalStock {
  ticker: string;
  name: string;
  rs_score: number;
  volume_avg: number;
}

interface SectorSignal {
  sector: string;
  color: string;
  composite_rs: number;
  momentum: string;
  signal: string;
  top_stocks?: SectorSignalStock[];
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const MomentumIcon = ({ momentum }: { momentum: string }) => {
  switch (momentum) {
    case "strong_up":
      return <TrendingUp className="h-4 w-4 text-emerald-600" />;
    case "up":
      return <TrendingUp className="h-4 w-4 text-green-500" />;
    case "down":
      return <TrendingDown className="h-4 w-4 text-orange-500" />;
    case "strong_down":
      return <TrendingDown className="h-4 w-4 text-red-600" />;
    default:
      return <Minus className="h-4 w-4 text-slate-400" />;
  }
};

const MomentumBadge = ({ momentum }: { momentum: string }) => {
  const styles: Record<string, string> = {
    strong_up: "bg-emerald-50 text-emerald-700 border-emerald-200",
    up: "bg-green-50 text-green-700 border-green-200",
    neutral: "bg-slate-50 text-slate-600 border-slate-200",
    down: "bg-orange-50 text-orange-700 border-orange-200",
    strong_down: "bg-red-50 text-red-700 border-red-200",
  };
  const labels: Record<string, string> = {
    strong_up: "Strong ↑",
    up: "Rising ↑",
    neutral: "Neutral",
    down: "Falling ↓",
    strong_down: "Weak ↓↓",
  };
  return (
    <span className={`text-[10px] sm:text-xs px-2 py-0.5 rounded-full border font-medium ${styles[momentum] || styles.neutral}`}>
      {labels[momentum] || "—"}
    </span>
  );
};

export function SectorRotationCard() {
  const [rankings, setRankings] = useState<SectorRanking[]>([]);
  const [signals, setSignals] = useState<{ overweight: SectorSignal[]; underweight: SectorSignal[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const [rankRes, sigRes] = await Promise.all([
          fetch(`${API_URL}/api/sector-rotation/rankings?top_n=9`),
          fetch(`${API_URL}/api/sector-rotation/signals?top_n=3`),
        ]);

        if (rankRes.ok) {
          const rankData = await rankRes.json();
          setRankings(rankData.rankings || []);
        }
        if (sigRes.ok) {
          const sigData = await sigRes.json();
          setSignals(sigData);
        }
      } catch (e) {
        setError("Could not load sector data");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <Card className="p-6 animate-pulse">
        <div className="h-6 bg-slate-200 rounded w-48 mb-4" />
        <div className="h-48 bg-slate-100 rounded" />
      </Card>
    );
  }

  if (error || rankings.length === 0) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-2">
          <ArrowRightLeft className="h-5 w-5 text-blue-600" />
          <h3 className="font-semibold text-slate-900">Sector Rotation</h3>
        </div>
        <p className="text-sm text-slate-500">{error || "No sector data available"}</p>
      </Card>
    );
  }

  // Chart data: composite RS by sector
  const chartData = rankings.map((r) => ({
    name: r.sector.split(" ")[0], // Abbreviate for chart
    fullName: r.sector,
    rs: Number((r.composite_rs * 100 - 100).toFixed(1)), // Show as % above/below market
    color: r.color,
    fill: r.composite_rs >= 1 ? r.color : "#94a3b8",
  }));

  return (
    <Card className="p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 shadow-md">
            <ArrowRightLeft className="h-4 w-4 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 text-sm sm:text-base">Sector Rotation</h3>
            <p className="text-[10px] sm:text-xs text-slate-400">Relative Strength vs NIFTY 50</p>
          </div>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-slate-400 hover:text-slate-600 transition-colors p-1"
        >
          {expanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
        </button>
      </div>

      {/* RS Bar Chart */}
      <div className="h-40 sm:h-48 mb-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 10, fill: "#94a3b8" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "#94a3b8" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${v > 0 ? "+" : ""}${v}%`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#0f172a",
                border: "none",
                borderRadius: "8px",
                padding: "8px 12px",
                fontSize: "12px",
              }}
              itemStyle={{ color: "#e2e8f0" }}
              labelStyle={{ color: "#94a3b8", marginBottom: 4 }}
              formatter={(value: number) => [`${value > 0 ? "+" : ""}${value}%`, "RS vs Market"]}
              labelFormatter={(label, payload) => {
                const item = payload?.[0]?.payload;
                return item?.fullName || label;
              }}
            />
            <Bar dataKey="rs" radius={[4, 4, 0, 0]} maxBarSize={32}>
              {chartData.map((entry, index) => (
                <Cell key={index} fill={entry.fill} opacity={0.85} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Signals Summary: Overweight / Underweight */}
      {signals && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-2">
          {/* Overweight */}
          <div className="bg-emerald-50/50 rounded-xl p-3 border border-emerald-100">
            <p className="text-[10px] sm:text-xs font-semibold text-emerald-700 mb-2 uppercase tracking-wider">
              ▲ Overweight
            </p>
            <div className="space-y-1.5">
              {signals.overweight.map((s) => (
                <div key={s.sector} className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                    <span className="text-xs font-medium text-slate-700 truncate max-w-[110px]">
                      {s.sector}
                    </span>
                  </div>
                  <MomentumBadge momentum={s.momentum} />
                </div>
              ))}
            </div>
          </div>

          {/* Underweight */}
          <div className="bg-rose-50/50 rounded-xl p-3 border border-rose-100">
            <p className="text-[10px] sm:text-xs font-semibold text-rose-700 mb-2 uppercase tracking-wider">
              ▼ Underweight
            </p>
            <div className="space-y-1.5">
              {signals.underweight.map((s) => (
                <div key={s.sector} className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                    <span className="text-xs font-medium text-slate-700 truncate max-w-[110px]">
                      {s.sector}
                    </span>
                  </div>
                  <MomentumBadge momentum={s.momentum} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Expanded: Full Rankings Table */}
      {expanded && (
        <div className="mt-4 border-t border-slate-100 pt-4">
          <h4 className="text-xs font-semibold text-slate-500 mb-3 uppercase tracking-wider">
            All Sectors — RS Rankings
          </h4>
          <div className="overflow-x-auto -mx-2">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-400 border-b border-slate-100">
                  <th className="text-left pb-2 pl-2">#</th>
                  <th className="text-left pb-2">Sector</th>
                  <th className="text-right pb-2">1M</th>
                  <th className="text-right pb-2">3M</th>
                  <th className="text-right pb-2">6M</th>
                  <th className="text-right pb-2">RS</th>
                  <th className="text-center pb-2 pr-2">Signal</th>
                </tr>
              </thead>
              <tbody>
                {rankings.map((r) => (
                  <tr key={r.sector} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                    <td className="py-2 pl-2 text-slate-400 font-mono">{r.rank}</td>
                    <td className="py-2">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: r.color }} />
                        <span className="font-medium text-slate-700 truncate max-w-[120px]">{r.sector}</span>
                      </div>
                    </td>
                    <td className={`py-2 text-right font-mono ${r.return_1m >= 0 ? "text-green-600" : "text-red-500"}`}>
                      {r.return_1m > 0 ? "+" : ""}{r.return_1m}%
                    </td>
                    <td className={`py-2 text-right font-mono ${r.return_3m >= 0 ? "text-green-600" : "text-red-500"}`}>
                      {r.return_3m > 0 ? "+" : ""}{r.return_3m}%
                    </td>
                    <td className={`py-2 text-right font-mono ${r.return_6m >= 0 ? "text-green-600" : "text-red-500"}`}>
                      {r.return_6m > 0 ? "+" : ""}{r.return_6m}%
                    </td>
                    <td className="py-2 text-right">
                      <span className={`font-bold ${r.composite_rs >= 1 ? "text-emerald-600" : "text-slate-500"}`}>
                        {r.composite_rs.toFixed(2)}
                      </span>
                    </td>
                    <td className="py-2 pr-2 text-center">
                      <MomentumIcon momentum={r.momentum} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Top Stock Picks per Overweight Sector */}
          {signals?.overweight && signals.overweight.some(s => s.top_stocks && s.top_stocks.length > 0) && (
            <div className="mt-4">
              <h4 className="text-xs font-semibold text-slate-500 mb-3 uppercase tracking-wider">
                Top Stock Picks
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {signals.overweight.map((s) => (
                  s.top_stocks && s.top_stocks.length > 0 && (
                    <div key={s.sector} className="bg-slate-50 rounded-lg p-3">
                      <div className="flex items-center gap-1.5 mb-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                        <span className="text-xs font-semibold text-slate-700">{s.sector}</span>
                      </div>
                      <div className="space-y-1">
                        {s.top_stocks.slice(0, 3).map((stock) => (
                          <div key={stock.ticker} className="flex justify-between items-center">
                            <span className="text-xs text-slate-600 font-mono">{stock.ticker}</span>
                            <span className={`text-[10px] font-semibold ${stock.rs_score >= 1 ? "text-emerald-600" : "text-slate-500"}`}>
                              RS {stock.rs_score.toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
