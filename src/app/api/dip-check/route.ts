import { NextResponse } from "next/server";

// Dip detection methods — multiple signals for confidence

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
  overallScore: number; // 0-100, higher = stronger dip signal
  verdict: string;
  action: string;
}

export async function GET() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const YahooFinance = require("yahoo-finance2").default;
    const yf = new YahooFinance({ suppressNotices: ["ripHistorical"] });

    const symbols = [
      // Market health
      "SPY", "QQQ", "VTI", "VXUS", "VWO",
      // Blue chips
      "AAPL", "MSFT", "GOOGL", "AMZN", "META", "BRK-B", "JPM", "V", "UNH",
      // AI Infrastructure
      "CLS", "VRT", "FIX", "ONTO",
      // Energy for AI
      "VST", "CEG", "UEC",
      // Robotics
      "SYM", "PRCT", "AXON",
      // Healthcare AI
      "VEEV", "NARI", "DOCS",
      // Financial Plumbing
      "TW", "KNSL",
      // Hard Assets
      "TROX", "CWEN",
      // Geographic
      "SE", "NU",
      // Wildcard
      "IONQ",
    ];
    const results: DipAnalysis[] = [];

    for (const symbol of symbols) {
      // Get 1 year of daily data
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

      const daily = await yf.historical(symbol, {
        period1: oneYearAgo.toISOString().split("T")[0],
        period2: new Date().toISOString().split("T")[0],
        interval: "1d" as const,
      });

      if (daily.length < 50) continue;

      const closes = daily.map((d: { date: Date; close: number; low: number; high: number }) => ({
        date: d.date.toISOString().split("T")[0],
        close: d.close,
        low: d.low,
        high: d.high,
      }));

      const current = closes[closes.length - 1];
      const prices = closes.map((c: { close: number }) => c.close);
      const signals: DipSignal[] = [];

      // === METHOD 1: Distance from 52-week high ===
      const high52w = Math.max(...prices);
      const fromHigh = ((current.close - high52w) / high52w) * 100;
      signals.push({
        name: "52-Week High Distance",
        triggered: fromHigh <= -5,
        severity: fromHigh <= -20 ? "strong" : fromHigh <= -10 ? "moderate" : "mild",
        detail: `${fromHigh.toFixed(1)}% from 52-week high ($${high52w.toFixed(2)})`,
      });

      // === METHOD 2: Below 50-day moving average ===
      const last50 = prices.slice(-50);
      const ma50 = last50.reduce((s: number, p: number) => s + p, 0) / 50;
      const vsMA50 = ((current.close - ma50) / ma50) * 100;
      signals.push({
        name: "50-Day Moving Average",
        triggered: vsMA50 < -2,
        severity: vsMA50 < -8 ? "strong" : vsMA50 < -5 ? "moderate" : "mild",
        detail: `${vsMA50 >= 0 ? "+" : ""}${vsMA50.toFixed(1)}% vs 50-day MA ($${ma50.toFixed(2)})`,
      });

      // === METHOD 3: Below 200-day moving average ===
      const last200 = prices.slice(-200);
      const ma200 = last200.length >= 200 ? last200.reduce((s: number, p: number) => s + p, 0) / 200 : null;
      if (ma200) {
        const vsMA200 = ((current.close - ma200) / ma200) * 100;
        signals.push({
          name: "200-Day Moving Average",
          triggered: vsMA200 < 0,
          severity: vsMA200 < -10 ? "strong" : vsMA200 < -5 ? "moderate" : "mild",
          detail: `${vsMA200 >= 0 ? "+" : ""}${vsMA200.toFixed(1)}% vs 200-day MA ($${ma200.toFixed(2)})`,
        });
      }

      // === METHOD 4: Recent drop (last 5 days) ===
      const fiveDaysAgo = prices[prices.length - 6] ?? prices[0];
      const recentDrop = ((current.close - fiveDaysAgo) / fiveDaysAgo) * 100;
      signals.push({
        name: "5-Day Momentum",
        triggered: recentDrop < -3,
        severity: recentDrop < -7 ? "strong" : recentDrop < -5 ? "moderate" : "mild",
        detail: `${recentDrop >= 0 ? "+" : ""}${recentDrop.toFixed(1)}% in last 5 trading days`,
      });

      // === METHOD 5: RSI (Relative Strength Index) ===
      // Simplified RSI calculation
      const gains: number[] = [];
      const losses: number[] = [];
      for (let i = prices.length - 14; i < prices.length; i++) {
        const change = prices[i] - prices[i - 1];
        if (change > 0) { gains.push(change); losses.push(0); }
        else { gains.push(0); losses.push(Math.abs(change)); }
      }
      const avgGain = gains.reduce((s, g) => s + g, 0) / 14;
      const avgLoss = losses.reduce((s, l) => s + l, 0) / 14;
      const rs = avgLoss > 0 ? avgGain / avgLoss : 100;
      const rsi = 100 - (100 / (1 + rs));
      signals.push({
        name: "RSI (14-day)",
        triggered: rsi < 30,
        severity: rsi < 20 ? "strong" : rsi < 30 ? "moderate" : "mild",
        detail: `RSI = ${rsi.toFixed(0)} (below 30 = oversold = potential buy)`,
      });

      // === METHOD 6: Price vs 1-year range position ===
      const low52w = Math.min(...prices);
      const rangePos = ((current.close - low52w) / (high52w - low52w)) * 100;
      signals.push({
        name: "52-Week Range Position",
        triggered: rangePos < 30,
        severity: rangePos < 15 ? "strong" : rangePos < 30 ? "moderate" : "mild",
        detail: `At ${rangePos.toFixed(0)}% of range ($${low52w.toFixed(0)}-$${high52w.toFixed(0)})`,
      });

      // Calculate overall score
      const triggeredCount = signals.filter((s) => s.triggered).length;
      const strongCount = signals.filter((s) => s.triggered && s.severity === "strong").length;
      const overallScore = Math.min(100, triggeredCount * 15 + strongCount * 10);

      let verdict, action;
      if (overallScore >= 60) {
        verdict = "Strong Dip — High Conviction Buy Zone";
        action = `Multiple indicators confirm ${symbol} is significantly below normal levels. If you believe in the long-term thesis, this is historically a good entry point.`;
      } else if (overallScore >= 35) {
        verdict = "Moderate Dip — Worth Watching";
        action = `${symbol} is pulling back but not yet in deep value territory. Consider a small position or wait for further confirmation.`;
      } else if (overallScore >= 15) {
        verdict = "Mild Pullback — Normal Volatility";
        action = `${symbol} has a minor dip. This is normal market movement, not necessarily a buying opportunity.`;
      } else {
        verdict = "No Dip — Trading Near Highs";
        action = `${symbol} is near its recent highs. Not an ideal time to add significantly. Dollar-cost averaging is fine.`;
      }

      results.push({
        symbol,
        currentPrice: Math.round(current.close * 100) / 100,
        signals,
        overallScore,
        verdict,
        action,
      });
    }

    return NextResponse.json({ results, timestamp: new Date().toISOString() });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed" }, { status: 500 });
  }
}
