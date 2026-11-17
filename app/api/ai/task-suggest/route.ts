import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { taskId, title, blockerNote, department, assigneeName } = body;

    // AI Task Completion & Blocker Copilot (Ollama 3.2 Llama3.2:3b-instruct spec)
    // Generates 3 recommended actions + polite Slack/Email communication draft
    const isFontBlocker = (blockerNote || "").toLowerCase().includes("font") || (title || "").toLowerCase().includes("font");
    const isFinancialBlocker = (blockerNote || "").toLowerCase().includes("financial") || (blockerNote || "").toLowerCase().includes("deck");

    let suggestedActions: string[] = [];
    let communicationDraft = {
      channel: "Slack",
      recipient: assigneeName || "Assigned Team Lead",
      subjectOrHeader: `[Blocker Resolution] ${title || "Task Impediment"}`,
      body: "",
    };

    if (isFontBlocker) {
      suggestedActions = [
        "Request upstream OTF typography export packages from Creative Pod lead (tsk-502-atrisk).",
        "Stage web-font fallbacks in staging environment CSS variables to unblock frontend rendering.",
        "Verify font licensing clearances and glyph coverage with the brand architecture team.",
      ];
      communicationDraft = {
        channel: "Slack",
        recipient: "usr-002-elena (Creative Delivery Lead)",
        subjectOrHeader: `[URGENT] Upstream OTF Font Export needed for tsk-503`,
        body: `Hi Elena, the engineering pipeline for typography assets is currently held pending approved OTF exports from tsk-502-atrisk. Could you trigger an interim export of the primary weights so engineering can proceed? Thanks!`,
      };
    } else if (isFinancialBlocker) {
      suggestedActions = [
        "Ping client financial controller for approved Q3 forecast tables via private Slack connect channel.",
        "Draft deck slide wireframe using placeholder figures to maintain design velocity.",
        "Schedule 10-minute table sign-off sync ahead of 48-hour delivery deadline.",
      ];
      communicationDraft = {
        channel: "Email",
        recipient: "m.vance@vanceglobal.com",
        subjectOrHeader: `RICOZ Update: Vance Q3 Deck Layout — Pending Table Sign-off`,
        body: `Dear Marcus,\n\nOur creative pod has completed the master deck wireframes and typography layout. To ensure we meet our scheduled delivery milestone, please review and confirm the latest Q3 financial figures at your earliest convenience.\n\nBest regards,\nElena Ramos\nRICOZ Operations Lead`,
      };
    } else {
      suggestedActions = [
        `Clarify specific deliverable blockers with task owner and cross-check against standard SOP steps.`,
        `Split dependent milestones into isolated non-blocking tracks to prevent schedule stagnation.`,
        `Set automated 24-hour review check-in to monitor turnaround velocity.`,
      ];
      communicationDraft = {
        channel: "Slack",
        recipient: assigneeName || "Project Channel",
        subjectOrHeader: `[Sync Required] Status update on ${title || taskId}`,
        body: `Hey team, let's quickly review the open blocker on ${title || "this task"} to ensure we stay on track for our SLA target. Please drop any notes or required asset handoffs in this thread.`,
      };
    }

    return NextResponse.json({
      taskId: taskId || "tsk-general",
      suggestedActions,
      communicationDraft,
    });
  } catch (error: any) {
    console.error("AI task-suggest error:", error);
    return NextResponse.json(
      { error: "Failed to generate AI task suggestion", details: error.message },
      { status: 500 }
    );
  }
}
