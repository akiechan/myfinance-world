"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, Legend, LineChart, Line,
} from "recharts";

const TS = { backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "8px", fontSize: "12px", color: "#111" };
const IS = { color: "#333" };

interface PricePoint { date: string; close: number; high: number; low: number }

const MARKET_INDICES = [
  { symbol: "SPY", name: "S&P 500", color: "#2563eb" },
  { symbol: "QQQ", name: "Nasdaq 100", color: "#7c3aed" },
  { symbol: "VTI", name: "Total US", color: "#0891b2" },
  { symbol: "VXUS", name: "Total Intl", color: "#d97706" },
  { symbol: "VWO", name: "Emerging", color: "#dc2626" },
];

const ALL_STOCKS = [
  { symbol: "TSLA", name: "Tesla" }, { symbol: "NVDA", name: "Nvidia" }, { symbol: "HEI", name: "Heico" },
  { symbol: "SFY", name: "SoFi 500" }, { symbol: "VOO", name: "S&P 500 ETF" }, { symbol: "IVW", name: "S&P Growth" },
  { symbol: "VEA", name: "Developed Intl" }, { symbol: "VIG", name: "Dividend" }, { symbol: "SGOV", name: "Treasury" },
  { symbol: "AAPL", name: "Apple" }, { symbol: "MSFT", name: "Microsoft" }, { symbol: "GOOGL", name: "Google" },
  { symbol: "AMZN", name: "Amazon" }, { symbol: "META", name: "Meta" }, { symbol: "JPM", name: "JPMorgan" },
  { symbol: "BRK-B", name: "Berkshire" }, { symbol: "V", name: "Visa" }, { symbol: "UNH", name: "UnitedHealth" },
  { symbol: "CLS", name: "Celestica" }, { symbol: "VRT", name: "Vertiv" }, { symbol: "FIX", name: "Comfort Sys" },
  { symbol: "ONTO", name: "Onto Innov" }, { symbol: "VST", name: "Vistra" }, { symbol: "CEG", name: "Constellation" },
  { symbol: "UEC", name: "Uranium" }, { symbol: "SYM", name: "Symbotic" }, { symbol: "PRCT", name: "Procept Bio" },
  { symbol: "AXON", name: "Axon" }, { symbol: "VEEV", name: "Veeva" }, { symbol: "DOCS", name: "Doximity" },
  { symbol: "NARI", name: "Inari Med" }, { symbol: "TW", name: "Tradeweb" }, { symbol: "KNSL", name: "Kinsale" },
  { symbol: "TROX", name: "Tronox" }, { symbol: "CWEN", name: "Clearway" }, { symbol: "SE", name: "Sea Ltd" },
  { symbol: "NU", name: "Nu Holdings" }, { symbol: "IONQ", name: "IonQ" },
];

const UNIQUE_STOCKS = ALL_STOCKS.filter((s, i) => ALL_STOCKS.findIndex((x) => x.symbol === s.symbol) === i);

function getAnalysis(points: PricePoint[]) {
  if (points.length < 10) return null;
  const latest = points[points.length - 1];
  const prices = points.map((p) => p.close);
  const max = Math.max(...prices);
  const min = Math.min(...prices);
  const fromATH = ((latest.close - max) / max) * 100;
  const rangePos = ((latest.close - min) / (max - min)) * 100;
  const totalReturn = ((latest.close - points[0].close) / points[0].close) * 100;
  return { latest: latest.close, max, min, fromATH, rangePos, totalReturn, start: points[0].close };
}

// Calculate dip percentile: what % of days were cheaper than today
function getDipPercentile(points: PricePoint[]) {
  if (points.length < 60) return null;
  const prices = points.map((p) => p.close);
  const current = prices[prices.length - 1];
  const high = Math.max(...prices);
  const currentDip = ((current - high) / high) * 100;

  let worseDays = 0;
  for (let i = 0; i < prices.length; i++) {
    const rollingHigh = Math.max(...prices.slice(Math.max(0, i - 252), i + 1));
    const dayDip = ((prices[i] - rollingHigh) / rollingHigh) * 100;
    if (dayDip <= currentDip) worseDays++;
  }
  return Math.round((1 - worseDays / prices.length) * 100);
}

export function MarketCharts() {
  const [data, setData] = useState<Record<string, PricePoint[]>>({});
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(0);
  const [timeRange, setTimeRange] = useState<1 | 5>(1);

  useEffect(() => {
    async function fetchAll() {
      setLoading(true);
      const allSymbols = [...MARKET_INDICES, ...UNIQUE_STOCKS].filter((s, i, arr) => arr.findIndex((x) => x.symbol === s.symbol) === i);
      const results: Record<string, PricePoint[]> = {};
      let count = 0;
      for (const item of allSymbols) {
        try {
          const res = await fetch(`/api/stock-history?symbol=${item.symbol}&years=${timeRange}`);
          const json = await res.json();
          if (json.data) results[item.symbol] = json.data;
        } catch { /* skip */ }
        count++;
        setLoaded(count);
      }
      setData(results);
      setLoading(false);
    }
    fetchAll();
  }, [timeRange]);

  if (loading) {
    return <Card><CardContent className="pt-6">
      <div className="text-center text-muted-foreground text-sm animate-pulse">Loading {timeRange}Y data... ({loaded} symbols)</div>
    </CardContent></Card>;
  }

  const spyPoints = data["SPY"];
  const spyA = spyPoints ? getAnalysis(spyPoints) : null;
  const dipPercentile = spyPoints ? getDipPercentile(spyPoints) : null;

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button onClick={() => setTimeRange(1)} className={`px-4 py-2 rounded-lg text-sm font-medium ${timeRange === 1 ? "bg-blue-600 text-white" : "bg-muted text-muted-foreground"}`}>1 Year</button>
        <button onClick={() => setTimeRange(5)} className={`px-4 py-2 rounded-lg text-sm font-medium ${timeRange === 5 ? "bg-blue-600 text-white" : "bg-muted text-muted-foreground"}`}>5 Years</button>
      </div>

      {/* S&P 500 Dip Meter */}
      {spyA && (
        <Card className={spyA.fromATH <= -20 ? "border-red-400 bg-red-50" : spyA.fromATH <= -10 ? "border-green-400 bg-green-50" : spyA.fromATH <= -5 ? "border-amber-400 bg-amber-50" : "border-gray-200"}>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-4">
                <div className={`text-5xl font-black ${spyA.fromATH <= -20 ? "text-red-600" : spyA.fromATH <= -10 ? "text-green-600" : spyA.fromATH <= -5 ? "text-amber-500" : "text-gray-400"}`}>
                  {spyA.fromATH.toFixed(1)}%
                </div>
                <div>
                  <div className="text-lg font-bold">
                    {spyA.fromATH <= -20 ? "Bear Market" :
                     spyA.fromATH <= -10 ? "Correction" :
                     spyA.fromATH <= -5 ? "Dip" :
                     "Near Highs"} — {spyA.fromATH <= -10 ? "Buy Zone" : spyA.fromATH <= -5 ? "Getting Interesting" : "Be Patient"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {spyA.fromATH <= -20 ? "Happens ~6% of trading days. Rare buying opportunity." :
                     spyA.fromATH <= -10 ? "Happens ~26% of trading days. Historically great to buy." :
                     spyA.fromATH <= -5 ? "Happens ~37% of trading days. Moderate pullback." :
                     "Happens ~63% of trading days. Normal conditions."}
                    {" "}Last major dips: Apr 8 &apos;25 (-13.7%), Nov 20 &apos;25 (-5.1%)
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold">${spyA.latest.toFixed(0)}</div>
                <div className="text-xs text-muted-foreground">High: ${spyA.max.toFixed(0)}</div>
              </div>
            </div>
            {dipPercentile !== null && (() => {
              // Confidence score: how confident are we this IS or IS NOT a dip?
              // 50% = we have no idea. Further from 50 = more confident.
              const isDip = dipPercentile >= 50;
              const confidence = Math.abs(dipPercentile - 50) * 2; // 0-100 scale
              const confLabel = confidence >= 70 ? "Very High" : confidence >= 50 ? "High" : confidence >= 30 ? "Moderate" : "Low";
              const confColor = confidence >= 70 ? "text-green-600" : confidence >= 50 ? "text-blue-600" : confidence >= 30 ? "text-amber-600" : "text-gray-500";

              return (
                <div className="p-3 rounded-lg bg-white/60 border">
                  <div className="grid grid-cols-3 gap-4 items-center">
                    {/* Left: verdict */}
                    <div>
                      <div className="text-xs text-muted-foreground">Dip Day?</div>
                      <div className={`text-lg font-bold ${isDip ? "text-green-600" : "text-gray-500"}`}>
                        {dipPercentile >= 80 ? "YES" : dipPercentile >= 65 ? "Likely" : dipPercentile >= 50 ? "Maybe" : dipPercentile >= 35 ? "Probably Not" : "NO"}
                      </div>
                    </div>
                    {/* Center: percentile */}
                    <div className="text-center">
                      <div className="text-xs text-muted-foreground">Cheaper Than</div>
                      <div className="text-3xl font-bold">{dipPercentile}%</div>
                      <div className="text-[10px] text-muted-foreground">of all trading days</div>
                    </div>
                    {/* Right: confidence */}
                    <div className="text-right">
                      <div className="text-xs text-muted-foreground">Confidence</div>
                      <div className={`text-lg font-bold ${confColor}`}>{confidence}%</div>
                      <div className={`text-[10px] ${confColor}`}>{confLabel}</div>
                    </div>
                  </div>
                  {/* Bar */}
                  <div className="w-full h-3 bg-gray-200 rounded-full mt-3 overflow-hidden relative">
                    <div className={`h-full rounded-full ${dipPercentile >= 70 ? "bg-green-500" : dipPercentile >= 50 ? "bg-amber-500" : "bg-gray-400"}`}
                      style={{ width: `${dipPercentile}%` }} />
                    {/* 50% marker */}
                    <div className="absolute top-0 h-full w-0.5 bg-black/20" style={{ left: "50%" }} />
                  </div>
                  <div className="flex justify-between text-[9px] text-muted-foreground mt-0.5">
                    <span>Not a dip (0%)</span>
                    <span>Neutral (50%)</span>
                    <span>Strong dip (100%)</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-2">
                    {isDip
                      ? `Today is cheaper than ${dipPercentile}% of trading days in the past ${timeRange} year${timeRange > 1 ? "s" : ""}. Confidence ${confidence}% that this is a real dip — ${confidence >= 50 ? "multiple indicators agree the market is discounted." : "some indicators suggest a pullback but it's not deep enough to be certain."}`
                      : `Today is NOT in dip territory — the market is near its recent highs. Only ${dipPercentile}% of days were more expensive. Confidence ${confidence}% this is NOT a buying opportunity — ${confidence >= 50 ? "wait for a pullback." : "it's borderline, keep watching."}`
                    }
                  </p>
                </div>
              );
            })()}
          </CardContent>
        </Card>
      )}

      {/* Combined Market Indices chart — with $ in tooltip */}
      {(() => {
        const allHave = MARKET_INDICES.every((s) => data[s.symbol]?.length > 5);
        if (!allHave) return null;
        const dates = data[MARKET_INDICES[0].symbol].map((p) => p.date);
        const normalized = dates.map((date, i) => {
          const row: Record<string, string | number> = { date };
          MARKET_INDICES.forEach((s) => {
            const pts = data[s.symbol];
            if (pts?.[i] && pts[0]) {
              row[s.symbol] = Math.round(((pts[i].close - pts[0].close) / pts[0].close) * 10000) / 100;
              row[s.symbol + "_price"] = Math.round(pts[i].close * 100) / 100;
            }
          });
          return row;
        });
        return (
          <Card>
            <CardHeader className="pb-1"><CardTitle>Market Indices — {timeRange}Y Return</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={normalized}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" className="text-[9px]" interval={Math.floor(dates.length / 6)}
                    tickFormatter={(d: string) => { const [y, m] = d.split("-"); return `${["","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][parseInt(m)]}'${y.slice(2)}`; }} />
                  <YAxis className="text-[9px]" tickFormatter={(v: number) => `${v >= 0 ? "+" : ""}${v}%`} width={45} />
                  <Tooltip contentStyle={TS} itemStyle={IS}
                    formatter={(value, name, entry) => {
                      const sym = MARKET_INDICES.find((s) => s.name === String(name))?.symbol ?? "";
                      const priceKey = sym + "_price";
                      const price = (entry?.payload as Record<string, number>)?.[priceKey];
                      const pctStr = `${Number(value) >= 0 ? "+" : ""}${Number(value).toFixed(1)}%`;
                      return [price ? `${pctStr} ($${price.toFixed(2)})` : pctStr, String(name)];
                    }}
                    labelFormatter={(label) => String(label)}
                  />
                  <Legend wrapperStyle={{ fontSize: "10px" }} />
                  <ReferenceLine y={0} stroke="#94a3b8" />
                  {MARKET_INDICES.map((s) => <Area key={s.symbol} type="monotone" dataKey={s.symbol} name={s.name} stroke={s.color} fill="none" strokeWidth={2} />)}
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        );
      })()}

      {/* All stocks — 5 per row, double-click to expand */}
      <StockGrid data={data} timeRange={timeRange} />
    </div>
  );
}

function StockGrid({ data, timeRange }: { data: Record<string, PricePoint[]>; timeRange: number }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <>
      {/* Expanded overlay */}
      {expanded && data[expanded] && (() => {
        const points = data[expanded];
        const a = getAnalysis(points);
        const item = UNIQUE_STOCKS.find((s) => s.symbol === expanded);
        if (!a || !item) return null;
        const lineColor = a.rangePos <= 30 ? "#16a34a" : a.rangePos <= 50 ? "#2563eb" : a.rangePos <= 75 ? "#d97706" : "#dc2626";

        return (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setExpanded(null)}>
            <Card className="w-full max-w-4xl max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{expanded} — {item.name} ({timeRange}Y)</CardTitle>
                  <button onClick={() => setExpanded(null)} className="text-muted-foreground hover:text-foreground text-lg px-2">x</button>
                </div>
                <div className="flex gap-4 text-sm">
                  <span className="font-bold text-lg">${a.latest.toFixed(2)}</span>
                  <span className={a.fromATH > -5 ? "text-green-600" : a.fromATH > -15 ? "text-amber-600" : "text-red-600"}>
                    {a.fromATH.toFixed(1)}% from peak (${a.max.toFixed(2)})
                  </span>
                  <span className={a.totalReturn >= 0 ? "text-green-600" : "text-red-600"}>
                    {a.totalReturn >= 0 ? "+" : ""}{a.totalReturn.toFixed(1)}% ({timeRange}Y return)
                  </span>
                  <span className="text-muted-foreground">Low: ${a.min.toFixed(2)}</span>
                </div>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <AreaChart data={points} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
                    <defs>
                      <linearGradient id="expandGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={lineColor} stopOpacity={0.2} />
                        <stop offset="95%" stopColor={lineColor} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" className="text-xs" interval={Math.floor(points.length / 10)}
                      tickFormatter={(d: string) => { const [y, m, day] = d.split("-"); return `${["","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][parseInt(m)]} ${parseInt(day)}, '${y.slice(2)}`; }} />
                    <YAxis className="text-xs" domain={["auto", "auto"]} width={55}
                      tickFormatter={(v: number) => `$${v >= 1000 ? (v/1000).toFixed(1)+"k" : v.toFixed(0)}`} />
                    <Tooltip contentStyle={TS} itemStyle={IS}
                      formatter={(value) => [`$${Number(value).toFixed(2)}`, expanded]}
                      labelFormatter={(label) => String(label)} />
                    <ReferenceLine y={a.start} stroke="#94a3b8" strokeDasharray="3 3"
                      label={{ value: `$${a.start.toFixed(0)} (${timeRange}yr ago)`, fontSize: 10, fill: "#94a3b8" }} />
                    <Area type="monotone" dataKey="close" stroke={lineColor} fill="url(#expandGrad)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        );
      })()}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle>All Stocks ({UNIQUE_STOCKS.filter((s) => data[s.symbol]?.length > 5).length})</CardTitle>
          <p className="text-xs text-muted-foreground">Green = buy zone. Blue = fair. Amber = hold. Red = expensive. <strong>Double-click any stock to expand.</strong></p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
            {UNIQUE_STOCKS.map((item) => {
              const points = data[item.symbol];
              if (!points || points.length < 5) return null;
              const a = getAnalysis(points);
              if (!a) return null;

              const border = a.rangePos <= 30 ? "border-green-400 bg-green-50" :
                             a.rangePos <= 50 ? "border-blue-300 bg-blue-50" :
                             a.rangePos <= 75 ? "border-amber-200" :
                             "border-red-200 bg-red-50";
              const label = a.rangePos <= 30 ? "BUY" : a.rangePos <= 50 ? "FAIR" : a.rangePos <= 75 ? "HOLD" : "HIGH";
              const labelColor = a.rangePos <= 30 ? "bg-green-600 text-white" :
                                 a.rangePos <= 50 ? "bg-blue-500 text-white" :
                                 a.rangePos <= 75 ? "bg-amber-500 text-white" :
                                 "bg-red-500 text-white";
              const lineColor = a.rangePos <= 30 ? "#16a34a" : a.rangePos <= 50 ? "#2563eb" : a.rangePos <= 75 ? "#d97706" : "#dc2626";
              const spark = points.slice(-20).map((p, i) => ({ i, v: p.close }));

              return (
                <div key={item.symbol}
                  className={`p-2 rounded-lg border cursor-pointer transition-shadow hover:shadow-md ${border}`}
                  onDoubleClick={() => setExpanded(item.symbol)}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-xs">{item.symbol}</span>
                    <span className="font-bold text-sm">${a.latest.toFixed(a.latest >= 100 ? 0 : 2)}</span>
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <span className="text-[10px] text-muted-foreground truncate">{item.name}</span>
                    <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-bold ${labelColor}`}>{label}</span>
                  </div>
                  <div className="h-8 mt-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={spark}>
                        <Line type="monotone" dataKey="v" stroke={lineColor} strokeWidth={1.5} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <span className={`text-[10px] ${a.fromATH > -5 ? "text-muted-foreground" : a.fromATH > -15 ? "text-amber-600" : "text-red-600"}`}>
                      {a.fromATH.toFixed(0)}% from peak
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {a.totalReturn >= 0 ? "+" : ""}{a.totalReturn.toFixed(0)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
