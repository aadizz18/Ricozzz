import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const todayStr = new Date().toISOString().split("T")[0];

    const digest = {
      digestDate: todayStr,
      executiveSummary:
        "Daily Operations Pulse (18:00 UTC): Platform health is stable with 96.8% SLA compliance. Critical attention is required on 1 active P0 outage ticket (REF-2026-002: CDN asset access) and 1 high-risk retainer scope creep alert (Vance Global Capital at 84% hours consumed on Day 12). Talent capacity across Creative Delivery remains congested at 92%.",
      metricsOverview: {
        criticalSlaBreaches: 1,
        atRiskClients: 1,
        unassignedTasks: 0,
        activeMandates: 34,
        grossRetainerValueUsd: 425000,
        platformTakeRatePct: 15.0,
        averageShadowScore: 81.2,
      },
      topOperationalRisks: [
        {
          area: "Support & Infrastructure",
          riskLevel: "HIGH" as const,
          mitigation:
            "Activate emergency War Room (REF-2026-002); reroute CDN traffic to secondary AWS S3 asset mirror.",
        },
        {
          area: "Client Retainer Margin",
          riskLevel: "HIGH" as const,
          mitigation:
            "Trigger Scope Creep Shield for Vance Global Capital; propose $4,500 retainer add-on block before sprint 3.",
        },
        {
          area: "Creative Vendor Compliance",
          riskLevel: "MEDIUM" as const,
          mitigation:
            "Dispatch self-healing magic-link renewal for Starlight Visual Studios insurance certificate expiring in 10 days.",
        },
        {
          area: "Specialist Team Capacity",
          riskLevel: "MEDIUM" as const,
          mitigation:
            "Engage Context-Switch Shield for Elena Ramos (4 critical tracks); reassign tsk-501 to auxiliary coordinator.",
        },
      ],
      playbooksTriggeredToday: [
        "PLAYBOOK_WAR_ROOM_SPINUP",
        "PLAYBOOK_VENDOR_COMPLIANCE",
        "PLAYBOOK_ZERO_TOUCH_KICKOFF",
      ],
      p99LatencyMin: 14.2,
    };

    return NextResponse.json(digest);
  } catch (error: any) {
    console.error("Daily digest API error:", error);
    return NextResponse.json(
      { error: "Failed to generate daily digest", details: error.message },
      { status: 500 }
    );
  }
}
