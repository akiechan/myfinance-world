import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get("symbol") || "TSLA";
  const years = parseInt(searchParams.get("years") || "1");

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const YahooFinance = require("yahoo-finance2").default;
    const yf = new YahooFinance({ suppressNotices: ["ripHistorical", "yahooSurvey"] });

    const start = new Date();
    start.setFullYear(start.getFullYear() - years);

    const forceDaily = searchParams.get("daily") === "true";

    if (forceDaily) {
      // Pure daily data
      const result = await yf.historical(symbol, {
        period1: start.toISOString().split("T")[0],
        period2: new Date().toISOString().split("T")[0],
        interval: "1d" as const,
      });
      const data = result.map((r: { date: Date; close: number; high: number; low: number }) => ({
        date: r.date.toISOString().split("T")[0],
        close: Math.round(r.close * 100) / 100,
        high: Math.round(r.high * 100) / 100,
        low: Math.round(r.low * 100) / 100,
      }));
      return NextResponse.json({ symbol, data });
    }

    // Weekly/monthly for the bulk, then stitch daily for last 7 days
    const interval = years > 5 ? "1mo" as const : "1wk" as const;

    const [bulk, recent] = await Promise.all([
      yf.historical(symbol, {
        period1: start.toISOString().split("T")[0],
        period2: new Date().toISOString().split("T")[0],
        interval,
      }),
      yf.historical(symbol, {
        period1: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        period2: new Date().toISOString().split("T")[0],
        interval: "1d" as const,
      }),
    ]);

    const fmt = (r: { date: Date; close: number; high: number; low: number }) => ({
      date: r.date.toISOString().split("T")[0],
      close: Math.round(r.close * 100) / 100,
      high: Math.round(r.high * 100) / 100,
      low: Math.round(r.low * 100) / 100,
    });

    // Take weekly data, remove last 7 days, then append daily for last 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const bulkData = bulk.map(fmt).filter((d: { date: string }) => d.date < sevenDaysAgo);
    const recentData = recent.map(fmt);

    // Deduplicate by date (in case of overlap)
    const seen = new Set(bulkData.map((d: { date: string }) => d.date));
    const merged = [...bulkData, ...recentData.filter((d: { date: string }) => !seen.has(d.date))];

    return NextResponse.json({ symbol, data: merged });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch" },
      { status: 500 }
    );
  }
}
