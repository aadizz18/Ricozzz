import { NextRequest, NextResponse } from "next/server";
import { V4_SEED_CLIENTS, V4_SEED_TASKS, V4_SEED_VENDORS } from "@/lib/demo/v4SeedData";

export async function POST(req: NextRequest) {
  try {
    const t0 = performance.now();
    const body = await req.json();
    const rawSql = (body.raw_sql || "").trim();
    const format = body.format || "json";

    let rows: any[] = [];
    let columns: string[] = [];

    const lowerSql = rawSql.toLowerCase();

    if (lowerSql.includes("hours_burned_pct") || lowerSql.includes("ricoz_mandates_v3")) {
      columns = ["category", "avg_burn", "client_count", "risk_level"];
      rows = [
        { category: "Brand Identity", avg_burn: 84.0, client_count: 1, risk_level: "HIGH" },
        { category: "Creative Direction", avg_burn: 81.5, client_count: 2, risk_level: "HIGH" },
        { category: "Specialist 3D", avg_burn: 62.0, client_count: 1, risk_level: "NOMINAL" },
      ];
    } else if (lowerSql.includes("vendors") || lowerSql.includes("shadow_score")) {
      columns = ["studio_name", "discipline", "shadow_score", "verification_status"];
      rows = V4_SEED_VENDORS.map((v) => ({
        studio_name: v.studioName,
        discipline: v.discipline,
        shadow_score: v.shadowScore,
        verification_status: v.verificationStatus,
      }));
    } else if (lowerSql.includes("tasks") || lowerSql.includes("overdue")) {
      columns = ["task_id", "title", "department", "status", "due_date"];
      rows = V4_SEED_TASKS.map((t) => ({
        task_id: t.taskId,
        title: t.title,
        department: t.department,
        status: t.status,
        due_date: t.dueDate,
      }));
    } else {
      columns = ["client_id", "company_name", "retainer_value", "hours_used", "hours_allocated", "stage"];
      rows = V4_SEED_CLIENTS.map((c) => ({
        client_id: c.clientId,
        company_name: c.companyName,
        retainer_value: c.retainerValue,
        hours_used: c.hoursUsed,
        hours_allocated: c.hoursAllocated,
        stage: c.stage,
      }));
    }

    const executionTimeMs = Math.round((performance.now() - t0) * 100) / 100;

    if (format === "csv") {
      const csvHeader = columns.join(",");
      const csvRows = rows.map((r) => columns.map((col) => JSON.stringify(r[col] ?? "")).join(","));
      const csvContent = [csvHeader, ...csvRows].join("\n");
      return new NextResponse(csvContent, {
        headers: { "Content-Type": "text/csv", "Content-Disposition": "attachment; filename=export.csv" },
      });
    }

    return NextResponse.json({
      status: "success",
      query: rawSql,
      execution_time_ms: Math.max(1.8, executionTimeMs),
      columns,
      row_count: rows.length,
      data: rows,
    });
  } catch (error: any) {
    console.error("V1 Analytics Query error:", error);
    return NextResponse.json(
      { status: "error", message: error.message },
      { status: 500 }
    );
  }
}
