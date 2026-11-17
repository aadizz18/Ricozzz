/**
 * RICOZ Operations Suite V3.5 & V4.1
 * 7 Closed-Loop Automation Playbooks (FR-06)
 */

import { PlaybookExecutionLog } from "@/lib/admin/types";

export interface PlaybookConfig {
  id: string;
  name: string;
  triggerEvent: string;
  condition: string;
  actions: string[];
  autoExecute: boolean;
  lastRun?: string;
  status: "idle" | "running" | "active" | "completed";
}

export const PLAYBOOK_DEFINITIONS: PlaybookConfig[] = [
  {
    id: "PLAYBOOK_ZERO_TOUCH_KICKOFF",
    name: "Zero-Touch Client Kickoff",
    triggerEvent: "Client Brief Deposit Received",
    condition: "deposit_verified === true && retainer_value > 0",
    actions: [
      "Generate tokenized Client Portal magic-link",
      "Provision private Slack channel (#proj-[client])",
      "Queue top 3 matching creative directors in shortlisting drawer",
    ],
    autoExecute: true,
    status: "active",
  },
  {
    id: "PLAYBOOK_SLA_BREACH_LADDER",
    name: "3-Tier SLA Breach Ladder",
    triggerEvent: "Task or Ticket Due Date Countdown",
    condition: "elapsed_pct >= 75 || elapsed_pct >= 90 || elapsed_pct >= 100",
    actions: [
      "75% elapsed: Trigger Ops Coordinator alert toast",
      "90% elapsed: Escalate to Operations Lead (Elena Ramos)",
      "100% elapsed: Dispatch Executive Notification + upgrade ticket to P0 Emergency",
    ],
    autoExecute: true,
    status: "active",
  },
  {
    id: "PLAYBOOK_BOTTLENECK_REROUTE",
    name: "Autonomous Bottleneck Re-Routing",
    triggerEvent: "Task Inactive Check",
    condition: "untouched_hours > 24 && owner_capacity_pct > 90",
    actions: [
      "Identify secondary qualified operator with capacity < 75%",
      "Automatically reassign task workflow",
      "Record audit ledger entry and notify original assignee",
    ],
    autoExecute: true,
    status: "active",
  },
  {
    id: "PLAYBOOK_VENDOR_COMPLIANCE",
    name: "Self-Healing Vendor Compliance",
    triggerEvent: "Daily Compliance Expiration Scan",
    condition: "expires_in_days <= 30 || expires_in_days <= 15 || expires_in_days <= 7 || expires_in_days <= 0",
    actions: [
      "At 30d, 15d, 7d: Dispatch automated single-use magic-link renewal email",
      "At Day 0: Automatically pause studio profile from new project matching",
    ],
    autoExecute: true,
    status: "active",
  },
  {
    id: "PLAYBOOK_WAR_ROOM_SPINUP",
    name: "Instant War Room Spin-Up",
    triggerEvent: "P0 Milestone Breach or Incident Flagged",
    condition: "ticket.priority === 'P0' || task.priority === 'P0' || manual_escalation === true",
    actions: [
      "Provision emergency War Room drawer in Admin Panel",
      "Dispatch P0 webhook alert to Slack (#ops-war-room)",
      "Lock incident timeline and assign Incident Lead",
    ],
    autoExecute: true,
    status: "active",
  },
  {
    id: "PLAYBOOK_SMART_INVOICE_GATE",
    name: "Smart Invoice & Milestone Gatekeeper",
    triggerEvent: "Deliverable Review & Approval",
    condition: "client_signoff === true && escrow_funded === true",
    actions: [
      "Verify escrow deposit balance in treasury ledger",
      "Unlock high-resolution asset export package for client download",
      "Trigger automated 85% payout release to creative studio",
    ],
    autoExecute: true,
    status: "active",
  },
  {
    id: "PLAYBOOK_CONCIERGE_HIGH_VALUE",
    name: "Brief Concierge Alert",
    triggerEvent: "Public Web Inquiry Received",
    condition: "budget_usd >= 10000 || enterprise_flag === true",
    actions: [
      "Directly route enquiry to Senior Operations Director inbox",
      "Pre-populate custom Creative Pod scope template",
      "Initiate 15-minute VIP discovery calendar reservation",
    ],
    autoExecute: true,
    status: "active",
  },
];

// Execution history store
const playbookLogs: PlaybookExecutionLog[] = [
  {
    id: "log-pb-101",
    playbookId: "PLAYBOOK_ZERO_TOUCH_KICKOFF",
    playbookName: "Zero-Touch Client Kickoff",
    targetId: "cli-101-vance",
    status: "success",
    triggeredAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    summary: "Client portal generated and Slack channel #proj-vance provisioned.",
    details: { client: "Vance Global Capital", portalUrl: "https://ricoz.io/portal/vance-x99" },
  },
  {
    id: "log-pb-102",
    playbookId: "PLAYBOOK_WAR_ROOM_SPINUP",
    playbookName: "Instant War Room Spin-Up",
    targetId: "REF-2026-002",
    status: "warning",
    triggeredAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    summary: "Emergency P0 War Room opened for CDN Asset Portal Outage.",
    details: { ticketRef: "REF-2026-002", channel: "#ops-war-room", lead: "usr-001-aadinath" },
  },
  {
    id: "log-pb-103",
    playbookId: "PLAYBOOK_VENDOR_COMPLIANCE",
    playbookName: "Self-Healing Vendor Compliance",
    targetId: "ven-301-starlight",
    status: "success",
    triggeredAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    summary: "Insurance certificate expires in 10 days. Renewal magic-link dispatched.",
    details: { studio: "Starlight Visual Studios", docType: "insurance_cert" },
  },
];

export function executePlaybook(
  playbookId: string,
  targetId: string,
  context: Record<string, unknown> = {}
): PlaybookExecutionLog {
  const definition = PLAYBOOK_DEFINITIONS.find((p) => p.id === playbookId);
  const name = definition?.name || playbookId;

  let summary = `Playbook ${name} executed successfully on target ${targetId}.`;

  if (playbookId === "PLAYBOOK_WAR_ROOM_SPINUP") {
    summary = `Emergency P0 War Room active for ${targetId}. Slack #ops-war-room alerted.`;
  } else if (playbookId === "PLAYBOOK_VENDOR_COMPLIANCE") {
    summary = `Dispatched tokenized magic-link renewal notice to vendor contact for ${targetId}.`;
  } else if (playbookId === "PLAYBOOK_BOTTLENECK_REROUTE") {
    summary = `Reassigned untouched task ${targetId} to available operator with <70% load.`;
  } else if (playbookId === "PLAYBOOK_CONCIERGE_HIGH_VALUE") {
    summary = `High-value brief (${targetId}) routed directly to Senior Ops Director with VIP priority.`;
  } else if (playbookId === "PLAYBOOK_SMART_INVOICE_GATE") {
    summary = `Escrow verified. Payout released to talent; deliverables unlocked for client.`;
  }

  const actions = [
    `Triggered playbook ${name}`,
    summary,
    `Notification dispatched to telemetry bus`,
  ];

  const log: PlaybookExecutionLog = {
    id: `log-pb-${Date.now()}`,
    playbookId,
    playbook_id: playbookId,
    playbookName: name,
    targetId,
    target_id: targetId,
    status: "success",
    triggeredAt: new Date().toISOString(),
    summary,
    details: context,
    actionsTaken: actions,
    actions_taken: actions,
  };

  playbookLogs.unshift(log);
  return log;
}

export function getPlaybookLogs(): PlaybookExecutionLog[] {
  return playbookLogs;
}
