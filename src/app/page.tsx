import { MarketCharts } from "./market-charts";
import { DipDetector } from "./dip-detector";

export default function WorldFinancePage() {
  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">World Finance</h1>
        <p className="text-gray-500 mt-1">
          Market analysis, dip detection, and price history. Updated live from Yahoo Finance.
        </p>
      </div>

      <DipDetector />
      <MarketCharts />

      <p className="text-xs text-gray-400 text-center pt-8">
        Not financial advice. Data from Yahoo Finance. Dip detection uses 6 technical indicators.
      </p>
    </div>
  );
}
