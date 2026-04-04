import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get("symbol") || "SPY";

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const YahooFinance = require("yahoo-finance2").default;
    const yf = new YahooFinance({ suppressNotices: ["ripHistorical", "yahooSurvey"] });

    const quote = await yf.quote(symbol);

    return NextResponse.json({
      symbol: quote.symbol,
      price: quote.regularMarketPrice,
      previousClose: quote.regularMarketPreviousClose,
      dayChange: Math.round((quote.regularMarketChangePercent ?? 0) * 100) / 100,
      marketState: quote.marketState, // PRE, REGULAR, POST, CLOSED
      high52w: quote.fiftyTwoWeekHigh,
      low52w: quote.fiftyTwoWeekLow,
      timestamp: Date.now(),
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed" }, { status: 500 });
  }
}
