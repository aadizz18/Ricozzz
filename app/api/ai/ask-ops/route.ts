import { NextRequest, NextResponse } from "next/server";
import { V4_SEED_CLIENTS, V4_SEED_TASKS, V4_SEED_VENDORS, V4_SEED_TICKETS, V4_SEED_USERS } from "@/lib/demo/v4SeedData";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const queryText = (body.query || body.question || "").trim().toLowerCase();

    let targetCollection = "clients_mandates";
    let explanation = "";
    let pipeline: any[] = [];
    let results: any[] = [];

    if (queryText.includes("burned") || queryText.includes("80%") || queryText.includes("day 15") || queryText.includes("scope creep")) {
      targetCollection = "clients_mandates";
      explanation = "Identifies client retainers where hoursUsed is >= 80% of allocated hours on or before cycle day 15.";
      pipeline = [
        {
          $match: {
            $expr: {
              $and: [
                { $gte: ["$hoursUsed", { $multiply: [0.8, "$hoursAllocated"] }] },
                { $lte: ["$cycleDay", 15] },
              ],
            },
          },
        },
      ];
      results = V4_SEED_CLIENTS.filter(
        (c) => c.hoursUsed >= 0.8 * c.hoursAllocated && c.cycleDay <= 15
      );
    } else if (queryText.includes("overdue") || queryText.includes("task") || queryText.includes("sla")) {
      targetCollection = "tasks_workflows";
      explanation = "Query active tasks where milestone due date has elapsed or priority is flagged as P0/urgent.";
      pipeline = [
        {
          $match: {
            $or: [
              { status: "overdue" },
              { priority: "P0" },
              { dueDate: { $lt: "$$NOW" } },
            ],
          },
        },
      ];
      results = V4_SEED_TASKS.filter(
        (t) => t.status === "at_risk" || t.priority === "P0" || new Date(t.dueDate).getTime() < Date.now()
      );
    } else if (queryText.includes("vendor") || queryText.includes("shadow") || queryText.includes("compliance")) {
      targetCollection = "vendors_creative";
      explanation = "Scans creative vendor directory for studios with shadowScore < 60 or pending compliance renewals.";
      pipeline = [
        {
          $match: {
            $or: [
              { shadowScore: { $lt: 60.0 } },
              { verificationStatus: "pending_review" },
            ],
          },
        },
      ];
      results = V4_SEED_VENDORS.filter(
        (v) => v.shadowScore < 60.0 || v.verificationStatus === "pending_review"
      );
    } else if (queryText.includes("ticket") || queryText.includes("complaint") || queryText.includes("support")) {
      targetCollection = "support_tickets_csat";
      explanation = "Retrieves active customer support tickets with high urgency or SLA breach risks.";
      pipeline = [
        {
          $match: {
            status: { $in: ["open", "escalated"] },
          },
        },
      ];
      results = V4_SEED_TICKETS;
    } else {
      targetCollection = "users_rbac";
      explanation = "Default directory inspection across active operational roles and critical track counts.";
      pipeline = [{ $match: { is_active: true } }, { $sort: { activeCriticalTracks: -1 } }];
      results = V4_SEED_USERS;
    }

    return NextResponse.json({
      targetCollection,
      explanation,
      pipeline,
      resultCount: results.length,
      results,
    });
  } catch (error: any) {
    console.error("AI ask-ops error:", error);
    return NextResponse.json(
      { error: "Failed to process Ops query", details: error.message },
      { status: 500 }
    );
  }
}
