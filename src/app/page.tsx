export const dynamic = "force-dynamic";
export const revalidate = 0;

import { MarketCharts } from "./market-charts";
import { DipDetector } from "./dip-detector";

export default function WorldFinancePage() {
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "America/Los_Angeles",
  });

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">World Finance</h1>
        <p className="text-gray-500 mt-1">{today}</p>
      </div>

      <DipDetector />
      <MarketCharts />

      <p className="text-xs text-gray-400 text-center pt-8">
        Not financial advice. Data from Yahoo Finance. Refreshes on every visit.
      </p>
    </div>
  );
}
