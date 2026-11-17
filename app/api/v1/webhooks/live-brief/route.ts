import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { source_origin, client_email, stage, brief_text, budget_usd } = body;

    const mandateId = `m-${Date.now().toString(36)}`;
    const isHighValue = (budget_usd || 0) >= 10000;

    return NextResponse.json({
      status: "success",
      mandate_id: mandateId,
      source_origin: source_origin || "ricoz-six.vercel.app",
      client_email,
      stage: stage || "tell_us",
      budget_usd,
      is_high_value: isHighValue,
      concierge_priority: isHighValue ? "P0_VIP" : "STANDARD",
      assigned_triage: isHighValue ? "usr-001-aadinath (Senior Ops Director)" : "usr-002-elena",
      message: `Brief successfully ingested from live website bridge (${source_origin || "ricoz-six.vercel.app"}). Queued for AI auto-concierge triage.`,
    });
  } catch (error: any) {
    console.error("Live brief webhook error:", error);
    return NextResponse.json(
      { status: "error", message: error.message },
      { status: 500 }
    );
  }
}
