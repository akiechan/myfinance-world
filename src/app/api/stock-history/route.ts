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

    const result = await yf.historical(symbol, {
      period1: start.toISOString().split("T")[0],
      period2: new Date().toISOString().split("T")[0],
      interval: years > 2 ? ("1mo" as const) : ("1wk" as const),
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
