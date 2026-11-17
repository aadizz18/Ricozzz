/**
 * RICOZ Operations Suite V3.5 & V4.1
 * Canonical Seed Data & Operations Store
 * Contains all exact test cases from PRD V3.5 and V4.1 Technical Specification.
 */

import {
  UserRBAC,
  ClientMandate,
  VendorCreative,
  TaskWorkflow,
  BriefEnquiry,
  SupportTicketCSAT,
  SOPTemplate,
  AuditEventLedger,
  BriefFunnelEvent,
} from "@/lib/admin/types";

export const V4_SEED_USERS: UserRBAC[] = [
  {
    userId: "usr-001-aadinath",
    name: "Aadinath Achary",
    email: "aadinath@ricoz.io",
    role: "super_admin",
    department: "Executive Operations",
    skills: ["Architecture", "System Engineering", "Ops Automation"],
    activeCriticalTracks: 2,
    maxCapacityHours: 40,
    capacity_pct: 65,
    is_active: true,
  },
  {
    userId: "usr-002-elena",
    name: "Elena Ramos",
    email: "elena.r@ricoz.io",
    role: "ops_lead",
    department: "Creative Delivery",
    skills: ["Brand Identity", "Workflow Optimization", "Vendor Management"],
    activeCriticalTracks: 4,
    maxCapacityHours: 45,
    capacity_pct: 92,
    is_active: true,
  },
  {
    userId: "usr-003-kai",
    name: "Kai Chen",
    email: "kai.c@ricoz.io",
    role: "coordinator",
    department: "Technology",
    skills: ["Fullstack", "Vector Indexing", "Cloud Architecture"],
    activeCriticalTracks: 2,
    maxCapacityHours: 40,
    capacity_pct: 70,
    is_active: true,
  },
  {
    userId: "usr-004-sarah",
    name: "Sarah Jenkins",
    email: "sarah.j@ricoz.io",
    role: "ops_lead",
    department: "Sales & Partnerships",
    skills: ["Enterprise Retainers", "Scoping", "Account Growth"],
    activeCriticalTracks: 3,
    maxCapacityHours: 40,
    capacity_pct: 80,
    is_active: true,
  },
];

export const V4_SEED_CLIENTS: ClientMandate[] = [
  {
    clientId: "cli-101-vance",
    companyName: "Vance Global Capital",
    primaryContact: {
      name: "Marcus Vance",
      email: "m.vance@vanceglobal.com",
      phone: "+1-555-019-2831",
    },
    stage: "active",
    onboardingChecklist: [
      { itemKey: "ob_1", label: "Contract Signed", completed: true },
      { itemKey: "ob_2", label: "Payment Method Verified", completed: true },
      { itemKey: "ob_3", label: "Kickoff Call Completed", completed: true },
      { itemKey: "ob_4", label: "Brand Assets Uploaded", completed: true },
      { itemKey: "ob_5", label: "Workspace Provisioned", completed: true },
    ],
    retainerValue: 15000.0,
    hoursAllocated: 100.0,
    hoursUsed: 84.0,
    cycleDay: 12,
    accountLeadId: "usr-002-elena",
    accountLeadName: "Elena Ramos",
    scopeCreepAlert: true,
    shapRiskScore: 88.5,
  },
  {
    clientId: "cli-102-kinetics",
    companyName: "Kinetics Capital",
    primaryContact: {
      name: "Sarah Jenkins",
      email: "s.jenkins@kineticscap.com",
      phone: "+1-555-014-9922",
    },
    stage: "onboarding",
    onboardingChecklist: [
      { itemKey: "ob_1", label: "Contract Signed", completed: true },
      { itemKey: "ob_2", label: "Payment Method Verified", completed: true },
      { itemKey: "ob_3", label: "Kickoff Call Completed", completed: true },
      { itemKey: "ob_4", label: "Brand Assets Uploaded", completed: false },
      { itemKey: "ob_5", label: "Workspace Provisioned", completed: false },
    ],
    retainerValue: 8500.0,
    hoursAllocated: 60.0,
    hoursUsed: 12.0,
    cycleDay: 4,
    accountLeadId: "usr-002-elena",
    accountLeadName: "Elena Ramos",
    scopeCreepAlert: false,
    shapRiskScore: 18.2,
  },
  {
    clientId: "cli-103-lumina",
    companyName: "Lumina Therapeutics",
    primaryContact: {
      name: "Dr. Alicia Vance",
      email: "a.vance@luminathera.com",
      phone: "+1-555-023-4411",
    },
    stage: "active",
    onboardingChecklist: [
      { itemKey: "ob_1", label: "Contract Signed", completed: true },
      { itemKey: "ob_2", label: "Payment Method Verified", completed: true },
      { itemKey: "ob_3", label: "Kickoff Call Completed", completed: true },
      { itemKey: "ob_4", label: "Brand Assets Uploaded", completed: true },
      { itemKey: "ob_5", label: "Workspace Provisioned", completed: true },
    ],
    retainerValue: 22000.0,
    hoursAllocated: 120.0,
    hoursUsed: 45.0,
    cycleDay: 15,
    accountLeadId: "usr-004-sarah",
    accountLeadName: "Sarah Jenkins",
    scopeCreepAlert: false,
    shapRiskScore: 24.5,
  },
];

export const V4_SEED_VENDORS: VendorCreative[] = [
  {
    vendorId: "ven-301-starlight",
    studioName: "Starlight Visual Studios",
    discipline: "brand_identity",
    verificationStatus: "verified",
    shadowScore: 92.5,
    complianceDocs: [
      {
        docType: "nda",
        fileUrl: "https://vault.ricoz.io/docs/starlight_nda.pdf",
        verified: true,
        expiresAt: "2026-12-31T00:00:00Z",
      },
      {
        docType: "tax_w9",
        fileUrl: "https://vault.ricoz.io/docs/starlight_w9.pdf",
        verified: true,
        expiresAt: "2025-12-31T00:00:00Z",
      },
      {
        docType: "insurance_cert",
        fileUrl: "https://vault.ricoz.io/docs/starlight_ins.pdf",
        verified: true,
        // Insurance expiring in 10 days!
        expiresAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        docType: "msa",
        fileUrl: "https://vault.ricoz.io/docs/starlight_msa.pdf",
        verified: true,
        expiresAt: "2027-01-01T00:00:00Z",
      },
    ],
    autoRoutingPaused: false,
    activeDeliverablesCount: 3,
    pingLatencyHours: 4.2,
    revisionLoops30d: 1.0,
  },
  {
    vendorId: "ven-302-atelier",
    studioName: "Atelier Spatial 3D",
    discipline: "specialist",
    verificationStatus: "pending_review",
    shadowScore: 59.0, // Triggers Shadow-Score Drop <60 alert!
    complianceDocs: [
      {
        docType: "nda",
        fileUrl: "https://vault.ricoz.io/docs/atelier_nda.pdf",
        verified: true,
        expiresAt: "2025-08-15T00:00:00Z",
      },
      {
        docType: "tax_w9",
        fileUrl: "https://vault.ricoz.io/docs/atelier_w9.pdf",
        verified: false,
        expiresAt: "2024-12-31T00:00:00Z",
      },
      {
        docType: "insurance_cert",
        fileUrl: "https://vault.ricoz.io/docs/atelier_ins.pdf",
        verified: false,
        expiresAt: "2024-10-01T00:00:00Z",
      },
      {
        docType: "msa",
        fileUrl: "https://vault.ricoz.io/docs/atelier_msa.pdf",
        verified: true,
        expiresAt: "2026-06-01T00:00:00Z",
      },
    ],
    autoRoutingPaused: true,
    activeDeliverablesCount: 1,
    pingLatencyHours: 28.5,
    revisionLoops30d: 3.0,
  },
  {
    vendorId: "ven-303-monolith",
    studioName: "Monolith Creative Pod",
    discipline: "creative_director",
    verificationStatus: "verified",
    shadowScore: 88.0,
    complianceDocs: [
      { docType: "nda", fileUrl: "https://vault.ricoz.io/docs/monolith_nda.pdf", verified: true, expiresAt: "2027-05-01T00:00:00Z" },
      { docType: "tax_w9", fileUrl: "https://vault.ricoz.io/docs/monolith_w9.pdf", verified: true, expiresAt: "2026-12-31T00:00:00Z" },
      { docType: "insurance_cert", fileUrl: "https://vault.ricoz.io/docs/monolith_ins.pdf", verified: true, expiresAt: "2026-10-15T00:00:00Z" },
      { docType: "msa", fileUrl: "https://vault.ricoz.io/docs/monolith_msa.pdf", verified: true, expiresAt: "2027-01-01T00:00:00Z" },
    ],
    autoRoutingPaused: false,
    activeDeliverablesCount: 2,
    pingLatencyHours: 5.5,
    revisionLoops30d: 1.2,
  },
];

export const V4_SEED_TASKS: TaskWorkflow[] = [
  {
    taskId: "tsk-501-overdue",
    title: "Finalize Vance Q3 Deck Layout",
    department: "Creative Delivery",
    priority: "P1",
    status: "in_progress",
    assigneeId: "usr-002-elena",
    assigneeName: "Elena Ramos",
    dueDate: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(), // Overdue by 48h!
    blockedByTaskId: null,
    sopId: "sop-801-deck-design",
    sopTitle: "Corporate Pitch Deck Standard",
    sopChecklistState: [
      { stepIndex: 0, completed: true },
      { stepIndex: 1, completed: true },
      { stepIndex: 2, completed: false },
    ],
    blockerNote: null,
    comments: [
      {
        authorId: "usr-002-elena",
        authorName: "Elena Ramos",
        text: "Waiting on updated financial tables from client.",
        timestamp: new Date(Date.now() - 50 * 60 * 60 * 1000).toISOString(),
      },
    ],
    urgencyColor: "#DC2626", // RED (overdue)
    slaBreachRiskScore: 95.0,
    hoursToDeadline: -48,
  },
  {
    taskId: "tsk-502-atrisk",
    title: "Kinetics Brand Architecture Guidelines",
    department: "Creative Delivery",
    priority: "P0",
    status: "in_progress",
    assigneeId: "usr-002-elena",
    assigneeName: "Elena Ramos",
    dueDate: new Date(Date.now() + 18 * 60 * 60 * 1000).toISOString(), // Due in 18h (<48h AT RISK)!
    blockedByTaskId: null,
    sopId: "sop-802-brand-guide",
    sopTitle: "Brand Guidelines Specification",
    sopChecklistState: [
      { stepIndex: 0, completed: true },
      { stepIndex: 1, completed: false },
    ],
    blockerNote: null,
    comments: [],
    urgencyColor: "#D97706", // AMBER (at risk)
    slaBreachRiskScore: 76.0,
    hoursToDeadline: 18,
  },
  {
    taskId: "tsk-503-blocked",
    title: "Deploy Kinetics Typography Assets",
    department: "Engineering",
    priority: "P2",
    status: "blocked",
    assigneeId: "usr-001-aadinath",
    assigneeName: "Aadinath Achary",
    dueDate: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
    blockedByTaskId: "tsk-502-atrisk",
    sopId: null,
    sopChecklistState: [],
    blockerNote: "Cannot deploy font packages until tsk-502-atrisk exports approved OTF files.",
    comments: [
      {
        authorId: "usr-001-aadinath",
        authorName: "Aadinath Achary",
        text: "Marked blocked pending upstream brand approval.",
        timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
      },
    ],
    urgencyColor: "#7C3AED", // PURPLE (blocked)
    slaBreachRiskScore: 68.0,
    hoursToDeadline: 72,
  },
  {
    taskId: "tsk-504-ontrack",
    title: "Lumina Design Token System Audit",
    department: "Technology",
    priority: "P2",
    status: "in_progress",
    assigneeId: "usr-003-kai",
    assigneeName: "Kai Chen",
    dueDate: new Date(Date.now() + 96 * 60 * 60 * 1000).toISOString(), // Due in 96h ON TRACK!
    blockedByTaskId: null,
    sopId: null,
    sopChecklistState: [],
    blockerNote: null,
    comments: [],
    urgencyColor: "#64748B", // SLATE (on track > 48h)
    slaBreachRiskScore: 15.0,
    hoursToDeadline: 96,
  },
];

export const V4_SEED_BRIEFS: BriefEnquiry[] = [
  {
    enquiryId: "enq-701-incomplete",
    companyName: "Nexus Robotics",
    projectTitle: "Rebranding & Web Design",
    creativeDiscipline: "brand_identity",
    budgetRange: null,
    timelineWeeks: null,
    briefText: "We need a quick logo refresh and maybe a 3-page site.",
    completenessScore: 35.0, // Incomplete auto-triage!
    aiSuggestedTalentIds: [],
    status: "pending",
    missingFields: ["budgetRange", "timelineWeeks"],
    triageSummary: "Brief lacks budget parameters and milestone horizon. Prevents direct conversion to project.",
  },
  {
    enquiryId: "enq-702-complete",
    companyName: "Apex BioLabs",
    projectTitle: "Full Brand System & Portal",
    creativeDiscipline: "creative_director",
    budgetRange: "$25k - $50k",
    timelineWeeks: 6,
    briefText: "Comprehensive corporate overhaul including brand system, icon set, and clinical portal UI kit.",
    completenessScore: 95.0,
    aiSuggestedTalentIds: ["ven-301-starlight", "ven-303-monolith"],
    status: "triaged",
    triageSummary: "High-clarity specification. Matched with Starlight Visual Studios and Monolith Creative Pod.",
  },
];

export const V4_SEED_TICKETS: SupportTicketCSAT[] = [
  {
    ticketRef: "REF-2026-001",
    category: "Billing Discrepancy",
    subject: "Extra hour charge on Invoice #1042",
    customerName: "Marcus Vance",
    priority: "P1",
    status: "open",
    slaDueAt: new Date(Date.now() + 45 * 60 * 1000).toISOString(), // SLA breach in 45m!
    responses: [
      {
        sender: "Marcus Vance",
        text: "Please check hours recorded on Tuesday.",
        timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
      },
    ],
    csatScore: null,
    rootCauseTag: null,
    warRoomActive: false,
  },
  {
    ticketRef: "REF-2026-002",
    category: "Service Outage",
    subject: "Asset Portal CDN Unreachable",
    customerName: "Sarah Jenkins",
    priority: "P0",
    status: "escalated",
    slaDueAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(), // Breached 15m ago -> War Room!
    responses: [
      {
        sender: "Sarah Jenkins",
        text: "Our designers cannot access brand files.",
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      },
      {
        sender: "Elena Ramos",
        text: "Escalating to engineering war room.",
        timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      },
    ],
    csatScore: null,
    rootCauseTag: "Infrastructure failure",
    warRoomActive: true,
  },
];

export const V4_SEED_SOPS: SOPTemplate[] = [
  {
    sopId: "sop-801-deck-design",
    title: "Corporate Pitch Deck Standard",
    department: "Creative Delivery",
    version: "v2.1",
    category: "Presentation",
    markdownBody: `### Standard Operating Procedure
1. **Confirm brand guidelines**: Cross-check hex colors, typography scale, and dark mode tokens.
2. **Apply master typography**: Enforce Playfair Display for headers and DM Sans for body copy.
3. **Verify data chart color contrast**: Ensure all infographics achieve WCAG AA compliance (4.5:1 ratio).
4. **Export asset package**: Generate interactive PDF, web-ready SVGs, and Figma components.`,
    checklistSteps: [
      "Confirm brand guidelines",
      "Apply master typography",
      "Verify data chart color contrast",
      "Export asset package",
    ],
    driftScore: 4.2,
    lastReviewedAt: "2025-01-10T00:00:00Z",
  },
  {
    sopId: "sop-802-brand-guide",
    title: "Brand Guidelines Specification",
    department: "Creative Delivery",
    version: "v1.4",
    category: "Branding",
    markdownBody: `### Brand Guide Rules
1. **Define primary/secondary palette**: Document Pantone, RGB, CMYK, and CSS variable tokens.
2. **Specify font fallback stacks**: Define cross-platform fallbacks (e.g. system-ui, sans-serif).
3. **Document logo clear space**: Require 2x symbol width margins on all exterior lockups.`,
    checklistSteps: [
      "Define primary/secondary palette",
      "Specify font fallback stacks",
      "Document logo clear space",
    ],
    driftScore: 1.5,
    lastReviewedAt: "2025-02-01T00:00:00Z",
  },
];

export const V4_SEED_AUDIT_LOGS: AuditEventLedger[] = [
  {
    eventId: "evt-901-init",
    entityType: "system",
    entityId: "ricoz-core",
    action: "SYSTEM_BOOTSTRAP",
    actorId: "usr-001-aadinath",
    actorName: "Aadinath Achary",
    payload: { environment: "production-staging", version: "V4.1" },
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    eventId: "evt-902-warroom",
    entityType: "incident",
    entityId: "REF-2026-002",
    action: "WAR_ROOM_SPUN_UP",
    actorId: "usr-002-elena",
    actorName: "Elena Ramos",
    payload: { reason: "P0 milestone breach on CDN unreachable" },
    timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
  },
  {
    eventId: "evt-903-scope",
    entityType: "client",
    entityId: "cli-101-vance",
    action: "SCOPE_CREEP_SHIELD_ACTIVATED",
    actorId: "system",
    actorName: "Autonomous Radar",
    payload: { hoursUsed: 84, hoursAllocated: 100, cycleDay: 12 },
    timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
  },
];

export const V4_SEED_FUNNEL: BriefFunnelEvent[] = [
  { funnelId: "fn-01", mandateId: "m-01", stageName: "tell_us", conversionTimeSec: 45, dropoffFlag: false, timestamp: new Date().toISOString() },
  { funnelId: "fn-02", mandateId: "m-02", stageName: "discover", conversionTimeSec: 85, dropoffFlag: false, timestamp: new Date().toISOString() },
  { funnelId: "fn-03", mandateId: "m-03", stageName: "review", conversionTimeSec: 140, dropoffFlag: false, timestamp: new Date().toISOString() },
  { funnelId: "fn-04", mandateId: "m-04", stageName: "shortlist", conversionTimeSec: 180, dropoffFlag: false, timestamp: new Date().toISOString() },
  { funnelId: "fn-05", mandateId: "m-05", stageName: "project", conversionTimeSec: 320, dropoffFlag: false, timestamp: new Date().toISOString() },
];
