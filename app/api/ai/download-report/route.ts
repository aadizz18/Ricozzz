import { NextRequest, NextResponse } from "next/server";
import { getMockStore } from "@/lib/admin/mockStore";
import { TaskAgentResolution, TaskSubStep } from "@/lib/admin/types";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const format = searchParams.get("format") || "markdown";

    const store = getMockStore();
    const latestReport = store.batchReports[0];

    const timestamp = new Date().toISOString();
    const dateStr = timestamp.split("T")[0];

    let content = "";
    let contentType = "text/markdown; charset=utf-8";
    let fileName = `RICOZ_Autonomous_Swarm_Report_${dateStr}.md`;

    if (latestReport) {
      content = `# RICOZ OPERATIONS SUITE — MULTI-AGENT SWARM RESOLUTION REPORT
**Generated:** ${new Date(latestReport.timestamp).toLocaleString()}
**Batch ID:** \`${latestReport.batchId}\`
**Platform:** RICOZ Admin Operations Suite V4.1

---

## 1. Executive Summary & Resolution Metrics

| Metric | Value |
| :--- | :--- |
| **Total Tasks Evaluated** | ${latestReport.totalTasks} |
| **Autonomously Solved** | **${latestReport.autoSolvedCount}** (${Math.round((latestReport.autoSolvedCount / latestReport.totalTasks) * 100)}%) |
| **Manual Interaction Required** | **${latestReport.manualActionCount}** |
| **Average Model Confidence** | **${latestReport.avgConfidence}%** |
| **Execution Duration** | ${(latestReport.totalExecutionTimeMs / 1000).toFixed(2)}s |

---

## 2. Multi-Agent Performance & Accuracy Matrix

| Agent Specialist Persona | Role | Accuracy Score | Tasks Processed | Avg Latency |
| :--- | :--- | :--- | :--- | :--- |
| **Elena Ramos** | Lead Ops Orchestrator | ${latestReport.agentAccuracyMatrix.orchestrator.accuracy}% | ${latestReport.agentAccuracyMatrix.orchestrator.tasksSolved} | ${latestReport.agentAccuracyMatrix.orchestrator.latencyMs}ms |
| **Kai Chen** | Technical & Systems Engineer | ${latestReport.agentAccuracyMatrix.engineer.accuracy}% | ${latestReport.agentAccuracyMatrix.engineer.tasksSolved} | ${latestReport.agentAccuracyMatrix.engineer.latencyMs}ms |
| **Rachel Thorne** | Legal, Escrow & Compliance | ${latestReport.agentAccuracyMatrix.legal.accuracy}% | ${latestReport.agentAccuracyMatrix.legal.tasksSolved} | ${latestReport.agentAccuracyMatrix.legal.latencyMs}ms |
| **Sarah Jenkins** | Creative Director & Brand Lead | ${latestReport.agentAccuracyMatrix.creative.accuracy}% | ${latestReport.agentAccuracyMatrix.creative.tasksSolved} | ${latestReport.agentAccuracyMatrix.creative.latencyMs}ms |
| **Auditor AI** | QA & Blast-Radius Verification | ${latestReport.agentAccuracyMatrix.qa_auditor.accuracy}% | ${latestReport.agentAccuracyMatrix.qa_auditor.tasksSolved} | ${latestReport.agentAccuracyMatrix.qa_auditor.latencyMs}ms |

---

## 3. Individual Task Resolutions & Agent Traces

${latestReport.resolutions
  .map(
    (r: TaskAgentResolution, idx: number) => `### Task ${idx + 1}: ${r.taskTitle} (\`${r.taskId}\`)
- **Status Outcome:** ${r.outcome === "auto_solved" ? "✅ AUTONOMOUSLY SOLVED" : "⚠️ MANUAL INTERACTION REQUIRED"}
- **Confidence Rating:** ${r.confidenceScore}%
- **Audit ID:** \`${r.auditTrailId}\`
- **Summary:** ${r.summary}
${r.humanActionRequired ? `\n> **⚠️ Action Required by Human Team Member:**\n> ${r.humanActionRequired}\n` : ""}

#### Multi-Agent Substep Execution:
${r.substeps
  .map(
    (s: TaskSubStep, sIdx: number) => `${sIdx + 1}. **[${s.agentName} — ${s.agentRole.toUpperCase()}]** *${s.title}* (${s.executionDurationMs}ms)
   - *Reasoning:* ${s.reasoning}
   ${s.artifactOutput ? `   - *Artifact:* \`${s.artifactOutput}\`` : ""}`
  )
  .join("\n")}

${r.artifacts.length > 0 ? `#### Deliverable Artifacts:\n` + r.artifacts.map((a: any) => `\`\`\`${a.type}\n// File: ${a.name}\n${a.content}\n\`\`\``).join("\n\n") : ""}

---
`
  )
  .join("\n")}

## 4. Governance & Compliance Sign-Off

This automated multi-agent operational resolution report was executed within the RICOZ Advanced Operations Suite pursuant to ISO/IEC 25010 Quality Model Standards and RICOZ Escrow & SLA Governance Protocol.

- **Verified by:** Auditor AI (Verification Engine V4.1)
- **Authorized Admin User:** Aadinath Achary (Super Admin)
- **Digital Audit Stamp:** \`RIC-VERIFY-${Date.now().toString(16).toUpperCase()}\`
`
    } else {
      // Baseline executive overview of current tasks
      const pendingTasks = store.tasks;
      content = `# RICOZ OPERATIONS SUITE — MULTI-AGENT SWARM RESOLUTION REPORT
**Generated:** ${new Date().toLocaleString()}
**Batch ID:** \`baseline-audit-${Date.now()}\`
**Platform:** RICOZ Admin Operations Suite V4.1

---

## 1. Executive Summary & Resolution Metrics

| Metric | Value |
| :--- | :--- |
| **Total Enterprise Tasks** | ${pendingTasks.length} |
| **Autonomous Swarm Ready** | **100% Ready** |
| **Specialist Swarm Agents** | 5 Personas (Elena Ramos, Kai Chen, Rachel Thorne, Sarah Jenkins, Auditor AI) |
| **SOP Benchmark Conformance** | 98.4% |

---

## 2. Multi-Agent Specialist Personas

| Agent Specialist Persona | Role | Primary Responsibility |
| :--- | :--- | :--- |
| **Elena Ramos** | Lead Ops Orchestrator | Decomposes tasks into sub-problems, maps blast-radius, coordinates handoffs |
| **Kai Chen** | Technical & Systems Engineer | Resolves code blockers, optimizes WebGL shaders, executes asset pipelines |
| **Rachel Thorne** | Legal, Escrow & Compliance | Milestones, California §2870 IP carve-outs, escrow releases |
| **Sarah Jenkins** | Creative Director & Brand Lead | Brand architecture tokens, typography OTF exports, presentation deck standards |
| **Auditor AI** | QA & Blast-Radius Verification | SLA verification, cross-browser validation, audit logging |

---

## 3. Current Task Inventory & Multi-Agent Readiness

${pendingTasks
  .map(
    (t: any, idx: number) => `### Task ${idx + 1}: ${t.title} (\`${t.id}\`)
- **Status:** \`${(t.status || "todo").toUpperCase()}\` | **Priority:** \`${(t.priority || "medium").toUpperCase()}\`
- **Department:** ${t.department_name || t.departmentId || "Operations"}
- **Assignee:** ${t.assignee_name || t.assigneeId || "Elena Ramos"}
- **Blocker Status:** ${t.blocker_note || (t.is_escalated ? "Escalated for immediate review" : "None")}
- **Autonomous Swarm Strategy:** Ingested into agent reasoning queue for step-by-step resolution or compliance escalation.
`
  )
  .join("\n")}

## 4. Governance & Compliance Sign-Off

This operations report was generated within the RICOZ Advanced Operations Suite pursuant to ISO/IEC 25010 Quality Model Standards.

- **Verified by:** Auditor AI (Verification Engine V4.1)
- **Authorized Admin User:** Aadinath Achary (Super Admin)
- **Digital Audit Stamp:** \`RIC-VERIFY-${Date.now().toString(16).toUpperCase()}\`
`;
    }

    if (format === "html") {
      contentType = "text/html; charset=utf-8";
      fileName = `RICOZ_Autonomous_Swarm_Report_${dateStr}.html`;
      content = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>RICOZ Swarm Resolution Report</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #07080C; color: #F5F5F0; padding: 40px; line-height: 1.6; max-width: 900px; margin: 0 auto; }
    h1, h2, h3 { color: #FFF; font-weight: 800; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 8px; }
    h1 { color: #EF4444; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { border: 1px solid rgba(255,255,255,0.1); padding: 10px 14px; text-align: left; }
    th { background: rgba(255,255,255,0.05); color: #94A3B8; font-family: monospace; font-size: 11px; text-transform: uppercase; }
    pre { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); padding: 14px; border-radius: 8px; overflow-x: auto; font-family: monospace; font-size: 12px; color: #38BDF8; }
    blockquote { border-left: 4px solid #F59E0B; background: rgba(245,158,11,0.1); padding: 12px 16px; border-radius: 4px; color: #FCD34D; font-family: monospace; font-size: 12px; }
    .badge { display: inline-block; padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; font-family: monospace; }
    .badge-green { background: rgba(16,185,129,0.2); color: #34D399; border: 1px solid rgba(16,185,129,0.4); }
    .badge-amber { background: rgba(245,158,11,0.2); color: #FBBF24; border: 1px solid rgba(245,158,11,0.4); }
  </style>
</head>
<body>
  <div style="text-align: right; font-family: monospace; font-size: 11px; color: #94A3B8;">RICOZ OPERATIONS SUITE V4.1</div>
  <pre style="white-space: pre-wrap; font-family: inherit; color: inherit; background: none; border: none; padding: 0;">${content.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre>
</body>
</html>`;
    }

    return new Response(content, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (error: any) {
    console.error("Download report error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to generate report", details: error.message },
      { status: 500 }
    );
  }
}
