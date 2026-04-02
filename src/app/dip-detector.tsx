"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface DipSignal {
  name: string;
  triggered: boolean;
  severity: "strong" | "moderate" | "mild";
  detail: string;
}

interface DipAnalysis {
  symbol: string;
  currentPrice: number;
  signals: DipSignal[];
  overallScore: number;
  verdict: string;
  action: string;
}

const MARKET_SYMBOLS = ["SPY", "QQQ", "VTI", "VXUS", "VWO"];

const STOCK_INFO: Record<string, { name: string; tag: string }> = {
  // Blue chips
  AAPL: { name: "Apple", tag: "Blue Chip" }, MSFT: { name: "Microsoft", tag: "Blue Chip" },
  GOOGL: { name: "Alphabet", tag: "Blue Chip" }, AMZN: { name: "Amazon", tag: "Blue Chip" },
  META: { name: "Meta", tag: "Blue Chip" }, "BRK-B": { name: "Berkshire", tag: "Blue Chip" },
  JPM: { name: "JPMorgan", tag: "Blue Chip" }, V: { name: "Visa", tag: "Blue Chip" },
  UNH: { name: "UnitedHealth", tag: "Blue Chip" },
  // AI Infra
  CLS: { name: "Celestica", tag: "AI Infra" }, VRT: { name: "Vertiv", tag: "AI Infra" },
  FIX: { name: "Comfort Sys", tag: "AI Infra" }, ONTO: { name: "Onto Innovation", tag: "AI Infra" },
  // Energy
  VST: { name: "Vistra Energy", tag: "AI Energy" }, CEG: { name: "Constellation", tag: "AI Energy" },
  UEC: { name: "Uranium Energy", tag: "AI Energy" },
  // Robotics
  SYM: { name: "Symbotic", tag: "Robotics" }, PRCT: { name: "Procept Bio", tag: "Robotics" },
  AXON: { name: "Axon", tag: "Robotics" },
  // Healthcare
  VEEV: { name: "Veeva Systems", tag: "Healthcare" }, NARI: { name: "Inari Medical", tag: "Healthcare" },
  DOCS: { name: "Doximity", tag: "Healthcare" },
  // Finance
  TW: { name: "Tradeweb", tag: "Fintech" }, KNSL: { name: "Kinsale Cap", tag: "Fintech" },
  // Hard Assets
  TROX: { name: "Tronox", tag: "Real Assets" }, CWEN: { name: "Clearway Energy", tag: "Real Assets" },
  // Geo
  SE: { name: "Sea Limited", tag: "Global" }, NU: { name: "Nu Holdings", tag: "Global" },
  // Wildcard
  IONQ: { name: "IonQ", tag: "Quantum" },
  // Market
  SPY: { name: "S&P 500", tag: "Index" }, QQQ: { name: "Nasdaq 100", tag: "Index" },
  VTI: { name: "Total US", tag: "Index" }, VXUS: { name: "Total Intl", tag: "Index" },
  VWO: { name: "Emerging", tag: "Index" },
};

const TAG_COLORS: Record<string, string> = {
  "AI Infra": "bg-cyan-100 text-cyan-700", "AI Energy": "bg-orange-100 text-orange-700",
  "Robotics": "bg-purple-100 text-purple-700", "Healthcare": "bg-pink-100 text-pink-700",
  "Fintech": "bg-blue-100 text-blue-700", "Real Assets": "bg-amber-100 text-amber-700",
  "Global": "bg-green-100 text-green-700", "Quantum": "bg-red-100 text-red-700",
  "Blue Chip": "bg-gray-100 text-gray-700",
};

export function DipDetector() {
  const [data, setData] = useState<DipAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(0);

  useEffect(() => {
    const es = new EventSource("/api/dip-check");
    // Fallback: just fetch
    fetch("/api/dip-check")
      .then((r) => r.json())
      .then((json) => { setData(json.results ?? []); setLoading(false); })
      .catch(() => setLoading(false));
    return () => es.close();
  }, []);

  if (loading) {
    return (
      <Card><CardContent className="pt-6">
        <div className="text-center text-muted-foreground text-sm animate-pulse">
          Analyzing ~35 stocks across 6 indicators each... this takes ~20 seconds
        </div>
      </CardContent></Card>
    );
  }

  const marketData = data.filter((d) => MARKET_SYMBOLS.includes(d.symbol));
  const stockData = data.filter((d) => !MARKET_SYMBOLS.includes(d.symbol));

  // Only show stocks worth buying (score 20+)
  const worthBuying = stockData.filter((d) => d.overallScore >= 20).sort((a, b) => b.overallScore - a.overallScore);
  const notNow = stockData.filter((d) => d.overallScore < 20).sort((a, b) => b.overallScore - a.overallScore);

  // Market assessment
  const avgScore = marketData.length > 0 ? marketData.reduce((s, d) => s + d.overallScore, 0) / marketData.length : 0;
  let status: { label: string; bg: string };
  if (avgScore >= 55) status = { label: "Market Correction — Buy Zone", bg: "bg-green-50 border-green-400" };
  else if (avgScore >= 35) status = { label: "Market Dip — Getting Interesting", bg: "bg-amber-50 border-amber-400" };
  else if (avgScore >= 15) status = { label: "Mild Pullback", bg: "bg-blue-50 border-blue-300" };
  else status = { label: "Near Highs — Be Patient", bg: "bg-gray-50 border-gray-300" };

  return (
    <div className="space-y-4">
      {/* Market status */}
      <Card className={`border ${status.bg}`}>
        <CardHeader className="pb-2">
          <CardTitle>{status.label}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 gap-2">
            {marketData.map((d) => {
              const info = STOCK_INFO[d.symbol];
              const fromHigh = d.signals.find((s) => s.name === "52-Week High Distance");
              const sc = d.overallScore >= 50 ? "bg-green-500" : d.overallScore >= 30 ? "bg-amber-500" : d.overallScore >= 15 ? "bg-blue-400" : "bg-gray-300";
              return (
                <div key={d.symbol} className="p-2 rounded bg-white/70 border text-center">
                  <div className="text-[10px] text-muted-foreground">{info?.name}</div>
                  <div className="font-bold text-sm">${d.currentPrice}</div>
                  <div className="text-[10px] text-red-600">{fromHigh?.detail.split("(")[0]}</div>
                  <div className="w-full h-1.5 bg-gray-200 rounded-full mt-1">
                    <div className={`h-full rounded-full ${sc}`} style={{ width: `${d.overallScore}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Stocks worth buying — compact 5-per-row grid */}
      {worthBuying.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Stocks On Sale ({worthBuying.length})</CardTitle>
            <p className="text-xs text-muted-foreground">Score 20+ = dip indicators are firing. Higher = deeper discount.</p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
              {worthBuying.map((d) => {
                const info = STOCK_INFO[d.symbol] ?? { name: d.symbol, tag: "" };
                const sc = d.overallScore >= 50 ? "border-green-400 bg-green-50" : d.overallScore >= 30 ? "border-amber-300 bg-amber-50" : "border-blue-200 bg-blue-50";
                const barColor = d.overallScore >= 50 ? "bg-green-500" : d.overallScore >= 30 ? "bg-amber-500" : "bg-blue-400";
                const fromHigh = d.signals.find((s) => s.name === "52-Week High Distance");
                const rsi = d.signals.find((s) => s.name === "RSI (14-day)");
                return (
                  <div key={d.symbol} className={`p-2.5 rounded-lg border ${sc}`}>
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-sm">{d.symbol}</span>
                      <span className="text-xs font-medium">{d.overallScore}</span>
                    </div>
                    <div className="text-[10px] text-muted-foreground">{info.name}</div>
                    {info.tag && <span className={`text-[9px] px-1 py-0.5 rounded ${TAG_COLORS[info.tag] ?? "bg-gray-100 text-gray-600"}`}>{info.tag}</span>}
                    <div className="font-bold mt-1">${d.currentPrice}</div>
                    <div className="w-full h-1.5 bg-gray-200 rounded-full mt-1">
                      <div className={`h-full rounded-full ${barColor}`} style={{ width: `${d.overallScore}%` }} />
                    </div>
                    <div className="text-[9px] text-muted-foreground mt-1">
                      {fromHigh ? fromHigh.detail.split("(")[0].trim() : ""}
                    </div>
                    {rsi?.triggered && <div className="text-[9px] text-green-700">RSI oversold</div>}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Not worth buying now — collapsed summary */}
      {notNow.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Not On Sale Right Now ({notNow.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1.5">
              {notNow.map((d) => {
                const info = STOCK_INFO[d.symbol] ?? { name: d.symbol, tag: "" };
                return (
                  <span key={d.symbol} className="text-[10px] px-2 py-1 rounded bg-muted text-muted-foreground">
                    {d.symbol} ${d.currentPrice} <span className="opacity-50">({info.name})</span>
                  </span>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
