import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const dispatchEmail = searchParams.get("dispatch_email") === "true";
    const format = searchParams.get("format") || "json";

    const digestData = {
      digest_id: `digest-${new Date().toISOString().split("T")[0]}`,
      timestamp: new Date().toISOString(),
      platform: "RICOZ Operations Suite V3.5",
      metrics: {
        sla_compliance: "96.8%",
        active_mandates: 34,
        gross_retainer_usd: 425000,
        unresolved_p0_incidents: 1,
        active_talent_headcount: 182,
        throughput_rates: { tech: "92%", ops: "78%", creative: "71%", sales: "64%" },
      },
      critical_alerts: [
        "REF-2026-002: CDN asset storage unreachable (P0 War Room spun up)",
        "cli-101-vance: Scope Creep Shield triggered at 84% hours on Day 12",
      ],
      executive_summary:
        "Daily operational integrity remains high with strong client retention (94.2% benchmark achieved). Creative delivery queue remains near saturation; automated load balancing has mitigated P0 delivery risks.",
    };

    if (format === "pdf") {
      // Return printable HTML document with PDF headers
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>RICOZ Boardroom Operational Digest</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0A0D14; color: #F1F5F9; padding: 40px; margin: 0; }
            h1 { color: #EF4444; font-size: 24px; margin-bottom: 4px; }
            .header { border-bottom: 2px solid #27272A; padding-bottom: 20px; margin-bottom: 30px; }
            .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 30px; }
            .card { background: #18181B; border: 1px solid #27272A; border-radius: 12px; padding: 20px; }
            .card-title { font-size: 11px; font-family: monospace; color: #A1A1AA; text-transform: uppercase; }
            .card-val { font-size: 28px; font-weight: bold; color: #FFFFFF; margin-top: 8px; }
            .summary { background: #18181B; border-left: 4px solid #EF4444; border-radius: 4px; padding: 20px; font-size: 14px; line-height: 1.6; }
            .alert-box { background: #450A0A; border: 1px solid #991B1B; padding: 15px; border-radius: 8px; color: #FCA5A5; font-family: monospace; font-size: 12px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>RICOZ OPERATIONS EXECUTIVE DIGEST</h1>
            <div style="font-family: monospace; font-size: 12px; color: #94A3B8;">SNAPSHOT DATE: ${new Date().toUTCString()} | GENERATED AT 18:00 UTC</div>
          </div>
          <div class="grid">
            <div class="card">
              <div class="card-title">SLA Compliance</div>
              <div class="card-val" style="color: #10B981;">96.8%</div>
            </div>
            <div class="card">
              <div class="card-title">Active Mandates</div>
              <div class="card-val">34</div>
            </div>
            <div class="card">
              <div class="card-title">Active Retainers (USD)</div>
              <div class="card-val">$425,000</div>
            </div>
          </div>
          <div class="summary">
            <strong>Executive Commentary:</strong><br/>
            ${digestData.executive_summary}
          </div>
          <div class="alert-box">
            <strong>ACTIVE HIGH-PRIORITY INCIDENTS:</strong><br/>
            ${digestData.critical_alerts.map((a) => `• ${a}`).join("<br/>")}
          </div>
        </body>
        </html>
      `;
      return new NextResponse(html, {
        headers: { "Content-Type": "text/html" },
      });
    }

    return NextResponse.json({
      status: "success",
      dispatch_email: dispatchEmail,
      digest: digestData,
    });
  } catch (error: any) {
    console.error("V1 Daily Digest error:", error);
    return NextResponse.json(
      { status: "error", message: error.message },
      { status: 500 }
    );
  }
}
