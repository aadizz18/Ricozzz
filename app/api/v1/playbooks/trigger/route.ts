import { NextRequest, NextResponse } from "next/server";
import { executePlaybook } from "@/lib/ai/playbooksEngine";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { playbook_id, target_mandate_id, execution_context } = body;

    if (!playbook_id || !target_mandate_id) {
      return NextResponse.json(
        { status: "error", message: "playbook_id and target_mandate_id are required." },
        { status: 400 }
      );
    }

    const idMap: Record<string, string> = {
      "pb-001-kickoff": "PLAYBOOK_ZERO_TOUCH_KICKOFF",
      "pb-002-sla-ladder": "PLAYBOOK_SLA_BREACH_LADDER",
      "pb-003-reroute": "PLAYBOOK_BOTTLENECK_REROUTE",
      "pb-004-compliance-heal": "PLAYBOOK_VENDOR_COMPLIANCE",
      "pb-005-war-room": "PLAYBOOK_WAR_ROOM_SPINUP",
      "pb-006-invoice-gate": "PLAYBOOK_SMART_INVOICE_GATE",
      "pb-007-concierge": "PLAYBOOK_CONCIERGE_HIGH_VALUE",
    };
    const resolvedPlaybookId = idMap[playbook_id] || playbook_id;

    const log = executePlaybook(resolvedPlaybookId, target_mandate_id, execution_context || {});

    return NextResponse.json({
      status: "success",
      playbook_id,
      target_mandate_id,
      execution_log: log,
      message: `Automation playbook ${playbook_id} executed successfully on mandate ${target_mandate_id}.`,
    });
  } catch (error: any) {
    console.error("Playbooks trigger error:", error);
    return NextResponse.json(
      { status: "error", message: error.message },
      { status: 500 }
    );
  }
}
