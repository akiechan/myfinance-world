import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get("symbol") || "TSLA";
  const years = parseInt(searchParams.get("years") || "1");

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const YahooFinance = require("yahoo-finance2").default;
    const yf = new YahooFinance({ suppressNotices: ["ripHistorical"] });

    const start = new Date();
    start.setFullYear(start.getFullYear() - years);

    const forceDaily = searchParams.get("daily") === "true";
    // 1 year = daily (250 pts), 2-5 years = weekly, 5+ = monthly
    const interval = forceDaily ? "1d" as const : years <= 1 ? "1d" as const : years <= 5 ? "1wk" as const : "1mo" as const;

    const result = await yf.historical(symbol, {
      period1: start.toISOString().split("T")[0],
      period2: new Date().toISOString().split("T")[0],
      interval,
    });

    const data = result.map((r: { date: Date; close: number; high: number; low: number }) => ({
      date: r.date.toISOString().split("T")[0],
      close: Math.round(r.close * 100) / 100,
      high: Math.round(r.high * 100) / 100,
      low: Math.round(r.low * 100) / 100,
    }));

    return NextResponse.json({ symbol, data });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch" },
      { status: 500 }
    );
  }
}
