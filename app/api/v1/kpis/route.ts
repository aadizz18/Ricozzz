import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const timeframe = searchParams.get("timeframe") || "30d";

    const multiplier = timeframe === "7d" ? 0.25 : timeframe === "90d" ? 2.8 : 1.0;

    const activeTalent = Math.round(142 * (timeframe === "7d" ? 0.95 : timeframe === "90d" ? 1.15 : 1.0));
    const onboardingTalent = Math.round(28 * (timeframe === "7d" ? 0.8 : timeframe === "90d" ? 1.2 : 1.0));
    const pausedTalent = 12;
    // FR-01 Computed selector: Active + Onboarding + Paused = True Total Headcount
    const trueTotalTalent = activeTalent + onboardingTalent + pausedTalent;

    const activeMandates = Math.round(34 * (timeframe === "7d" ? 0.9 : timeframe === "90d" ? 1.3 : 1.0));
    const totalValueUsd = Math.round(425000 * multiplier * 100) / 100;

    return NextResponse.json({
      status: "success",
      timeframe,
      metrics: {
        talent: {
          active: activeTalent,
          onboarding: onboardingTalent,
          paused: pausedTalent,
          true_total: trueTotalTalent,
          trend_pct: timeframe === "7d" ? 3.2 : timeframe === "90d" ? 14.8 : 8.4,
        },
        mandates: {
          active_count: activeMandates,
          total_value_usd: totalValueUsd,
          trend_pct: timeframe === "7d" ? 4.5 : timeframe === "90d" ? 18.2 : 12.1,
        },
        sla_compliance_pct: 96.8,
        system_p99_latency_min: 14.2,
      },
    });
  } catch (error: any) {
    console.error("V1 KPIs API error:", error);
    return NextResponse.json(
      { status: "error", message: error.message },
      { status: 500 }
    );
  }
}
