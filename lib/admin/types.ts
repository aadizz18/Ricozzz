export type AdminRole =
  | "super_admin"
  | "exec_director"
  | "coo"
  | "dept_head"
  | "ops_manager"
  | "ops_lead"
  | "finance_director"
  | "department_lead"
  | "specialist"
  | "finance_manager"
  | "hr_manager"
  | "sales_manager"
  | "marketing_manager"
  | "tech_manager"
  | "ai_manager"
  | "qa_manager"
  | "team_member"
  | "auditor"
  // Legacy aliases
  | "ops_admin"
  | "dept_manager";

export interface AdminPermission {
  id: string;
  name: string;
  slug: string;
  description: string;
  module: string;
  action: string;
  createdAt?: string;
  created_at?: string;
}

export interface AdminRoleDef {
  id: string;
  name: string;
  slug: string;
  description: string;
  hierarchyLevel: number;
  hierarchy_level?: number;
  isSystemRole: boolean | number;
  is_system_role?: boolean | number;
  isActive: boolean | number;
  is_active?: boolean | number;
  permissions?: string[];
  permissionCount?: number;
  userCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface AdminUserPermissionOverride {
  id: string;
  adminUserId: string;
  admin_user_id?: string;
  permissionId: string;
  permission_id?: string;
  permissionSlug?: string;
  permission_slug?: string;
  permissionName?: string;
  permission_name?: string;
  module?: string;
  action?: string;
  effect: "allow" | "deny";
  grantedBy?: string | null;
  granted_by?: string | null;
  grantedByName?: string;
  granted_by_name?: string;
  reason: string;
  expiresAt?: string | null;
  expires_at?: string | null;
  createdAt?: string;
  created_at?: string;
}

export interface AdminDepartmentMember {
  id: string;
  adminUserId: string;
  admin_user_id?: string;
  departmentId: string;
  department_id?: string;
  membershipRole: "head" | "manager" | "member" | "observer";
  membership_role?: string;
  isPrimary: boolean | number;
  is_primary?: boolean | number;
  userName?: string;
  user_name?: string;
  userEmail?: string;
  user_email?: string;
  userRole?: string;
  user_role?: string;
  departmentName?: string;
  department_name?: string;
  createdAt?: string;
  created_at?: string;
}

export interface AdminUser {
  id: string;
  email: string;
  fullName: string;
  role: AdminRole;
  departmentId: string | null;
  departmentName?: string;
  status: "active" | "suspended";
  avatar: string;
  lastLoginAt: string | null;
  createdAt: string;
  permissions?: string[];
  departmentMemberships?: AdminDepartmentMember[];
  permissionOverrides?: AdminUserPermissionOverride[];
}

export interface AdminSession {
  id: string;
  userId: string;
  sessionToken: string;
  expiresAt: string;
  lastActivityAt?: string | null;
  last_activity_at?: string | null;
  ipAddress: string;
  userAgent: string;
  createdAt: string;
}

export interface Department {
  id: string;
  name: string;
  slug: string;
  headUserId?: string | null;
  head_user_id?: string | null;
  headUserName?: string;
  head_user_name?: string;
  description: string;
  memberCount?: number;
  member_count?: number;
  activeTaskCount?: number;
  active_task_count?: number;
  overdueTaskCount?: number;
  overdue_task_count?: number;
  createdAt?: string;
  created_at?: string;
}

export type TaskPriority = "low" | "medium" | "high" | "urgent";
export type TaskStatus = "todo" | "in_progress" | "blocked" | "in_review" | "completed";

export type AgentSpecialistRole =
  | "orchestrator"
  | "engineer"
  | "legal"
  | "creative"
  | "qa_auditor";

export interface TaskSubStep {
  id: string;
  title: string;
  agentRole: AgentSpecialistRole;
  agentName: string;
  agentAvatar: string;
  status: "pending" | "in_progress" | "completed" | "flagged_manual";
  reasoning: string;
  artifactOutput?: string;
  artifactType?: "code" | "legal" | "design" | "email" | "report";
  executionDurationMs: number;
}

export interface TaskAgentResolution {
  taskId: string;
  taskTitle: string;
  outcome: "auto_solved" | "needs_manual_interaction" | "in_progress";
  confidenceScore: number;
  summary: string;
  substeps: TaskSubStep[];
  humanActionRequired?: string;
  unblockedTaskId?: string;
  artifacts: Array<{
    name: string;
    type: "code" | "legal" | "design" | "email" | "report";
    content: string;
  }>;
  resolvedAt: string;
  auditTrailId: string;
}

export interface MultiAgentBatchReport {
  batchId: string;
  timestamp: string;
  totalTasks: number;
  autoSolvedCount: number;
  manualActionCount: number;
  avgConfidence: number;
  totalExecutionTimeMs: number;
  resolutions: TaskAgentResolution[];
  agentAccuracyMatrix: Record<
    string,
    { accuracy: number; tasksSolved: number; tokensProcessed: number; latencyMs: number }
  >;
}

export interface AgentTrainingSession {
  modelName: string;
  epochs: number;
  lossHistory: number[];
  finalLoss: number;
  accuracy: number;
  reasoningDepthScore: number;
  trainedOnSops: string[];
  evalMetrics: Array<{
    agent: string;
    role: AgentSpecialistRole;
    accuracy: number;
    latencyMs: number;
    benchmarkScore: string;
    status: "optimal" | "ready";
  }>;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  departmentId?: string;
  department_id?: string;
  departmentName?: string;
  department_name?: string;
  assigneeId?: string | null;
  assignee_id?: string | null;
  assigneeName?: string;
  assignee_name?: string;
  creatorId?: string;
  creator_id?: string;
  creatorName?: string;
  creator_name?: string;
  priority: TaskPriority;
  status: TaskStatus;
  blockerNote?: string | null;
  blocker_note?: string | null;
  isEscalated?: boolean | number;
  is_escalated?: boolean | number;
  dueDate?: string;
  due_date?: string;
  completedAt?: string | null;
  completed_at?: string | null;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
  commentsCount?: number;
  comments_count?: number;
  autoSolved?: boolean;
  auto_solved?: boolean;
  needsManualAction?: boolean;
  needs_manual_action?: boolean;
  manualActionNote?: string | null;
  manual_action_note?: string | null;
  agentResolution?: TaskAgentResolution;
  agent_resolution?: TaskAgentResolution;
}

export interface TaskComment {
  id: string;
  taskId?: string;
  task_id?: string;
  userId?: string;
  user_id?: string;
  userName?: string;
  user_name?: string;
  userAvatar?: string;
  user_avatar?: string;
  userRole?: AdminRole;
  user_role?: AdminRole;
  comment: string;
  isBlockerUpdate?: boolean | number;
  is_blocker_update?: boolean | number;
  createdAt?: string;
  created_at?: string;
}

export type ClientOnboardingStage =
  | "inquiry"
  | "contract_review"
  | "kickoff"
  | "active"
  | "churned";

export interface Client {
  id: string;
  name: string;
  industry: string;
  contactName?: string;
  contact_name?: string;
  contactEmail?: string;
  contact_email?: string;
  phone: string;
  companySize?: string;
  company_size?: string;
  onboardingStage?: ClientOnboardingStage;
  onboarding_stage?: ClientOnboardingStage;
  assignedOwnerId?: string | null;
  assigned_owner_id?: string | null;
  assignedOwnerName?: string;
  assigned_owner_name?: string;
  notes: string;
  nextFollowUp?: string | null;
  next_follow_up?: string | null;
  completedChecklistCount?: number;
  completed_checklist_count?: number;
  totalChecklistCount?: number;
  total_checklist_count?: number;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
}

export interface ClientOnboardingItem {
  id: string;
  clientId?: string;
  client_id?: string;
  title: string;
  category: string;
  isCompleted?: boolean | number;
  is_completed?: boolean | number;
  completedAt?: string | null;
  completed_at?: string | null;
  completedByUserId?: string | null;
  completed_by_user_id?: string | null;
  completedByUserName?: string;
  completed_by_user_name?: string;
}

export type VendorOnboardingStage =
  | "application"
  | "document_review"
  | "vetting"
  | "approved"
  | "rejected";

export type VendorVerificationStatus =
  | "unverified"
  | "pending_review"
  | "verified";

export interface Vendor {
  id: string;
  name: string;
  serviceCategory?: string;
  service_category?: string;
  contactName?: string;
  contact_name?: string;
  contactEmail?: string;
  contact_email?: string;
  phone: string;
  onboardingStage?: VendorOnboardingStage;
  onboarding_stage?: VendorOnboardingStage;
  verificationStatus?: VendorVerificationStatus;
  verification_status?: VendorVerificationStatus;
  assignedCoordinatorId?: string | null;
  assigned_coordinator_id?: string | null;
  assignedCoordinatorName?: string;
  assigned_coordinator_name?: string;
  notes: string;
  verifiedDocsCount?: number;
  verified_docs_count?: number;
  totalDocsCount?: number;
  total_docs_count?: number;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
}

export interface VendorDocument {
  id: string;
  vendorId?: string;
  vendor_id?: string;
  documentType?: string;
  document_type?: string;
  fileName?: string;
  file_name?: string;
  fileUrl?: string;
  file_url?: string;
  isVerified?: boolean | number;
  is_verified?: boolean | number;
  verifiedByUserId?: string | null;
  verified_by_user_id?: string | null;
  verifiedByUserName?: string;
  verified_by_user_name?: string;
  verifiedAt?: string | null;
  verified_at?: string | null;
  createdAt?: string;
  created_at?: string;
}

export type TicketCategory =
  | "onboarding"
  | "billing"
  | "talent_matching"
  | "platform_bug"
  | "service_quality";

export type TicketPriority = "low" | "medium" | "high" | "critical";
export type TicketStatus = "open" | "pending" | "escalated" | "resolved";

export interface SupportTicket {
  id: string;
  ticketRef?: string;
  ticket_ref?: string;
  clientId?: string | null;
  client_id?: string | null;
  clientName?: string;
  client_name?: string;
  customerName?: string;
  customer_name?: string;
  customerEmail?: string;
  customer_email?: string;
  category: TicketCategory;
  subject: string;
  description: string;
  priority: TicketPriority;
  status: TicketStatus;
  assignedUserId?: string | null;
  assigned_user_id?: string | null;
  assignedUserName?: string;
  assigned_user_name?: string;
  resolvedAt?: string | null;
  resolved_at?: string | null;
  resolutionNotes?: string | null;
  resolution_notes?: string | null;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
  responsesCount?: number;
  responses_count?: number;
}

export interface TicketResponse {
  id: string;
  ticketId?: string;
  ticket_id?: string;
  userId?: string;
  user_id?: string;
  userName?: string;
  user_name?: string;
  userRole?: AdminRole;
  user_role?: AdminRole;
  message: string;
  isInternalNote?: boolean | number;
  is_internal_note?: boolean | number;
  createdAt?: string;
  created_at?: string;
}

export interface SOP {
  id: string;
  title: string;
  slug: string;
  departmentId?: string;
  department_id?: string;
  departmentName?: string;
  department_name?: string;
  category: string;
  summary: string;
  contentMarkdown?: string;
  content_markdown?: string;
  version: string;
  status: "draft" | "active" | "archived";
  ownerId?: string | null;
  owner_id?: string | null;
  ownerName?: string;
  owner_name?: string;
  lastReviewedAt?: string | null;
  last_reviewed_at?: string | null;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
}

export interface Notification {
  id: string;
  userId?: string;
  user_id?: string;
  title: string;
  message: string;
  type: "task_assigned" | "task_overdue" | "ticket_escalated" | "vendor_pending" | "system";
  link: string | null;
  isRead?: boolean | number;
  is_read?: boolean | number;
  createdAt?: string;
  created_at?: string;
}

export interface AuditLog {
  id: string;
  actorId?: string | null;
  actor_id?: string | null;
  actorName?: string;
  actor_name?: string;
  actorRole?: string;
  actor_role?: string;
  action: string;
  entityType?: string;
  entity_type?: string;
  entityId?: string;
  entity_id?: string;
  changeSummary?: string;
  change_summary?: string;
  ipAddress?: string | null;
  ip_address?: string | null;
  createdAt?: string;
  created_at?: string;
}

export interface OperationsKPIs {
  totalTasks: number;
  pendingTasks: number;
  completedTasks: number;
  overdueTasks: number;
  blockedTasks: number;
  activeClients: number;
  onboardingClients: number;
  pausedClients?: number;
  totalClients: number;
  verifiedVendors: number;
  pendingVendors: number;
  pausedVendors?: number;
  totalVendors: number;
  openTickets: number;
  criticalTickets: number;
  resolvedTicketsRate: number;
  slaCompliancePct?: number;
  p99ResolutionLatencyMin?: number;
}

export const ADMIN_PRESET_ACCOUNTS = [
  {
    name: "Aadinath Achary",
    email: "aadinathachary@gmail.com",
    role: "Super Admin / Owner",
    department: "Operations & Governance",
    badge: "Full Clearance (Level 1)",
    avatar: "AA",
    color: "from-red-600 to-red-800",
  },
  {
    name: "Aadinath Achary",
    email: "aadinath@ricoz.io",
    role: "Super Admin / Owner",
    department: "Executive Operations",
    badge: "Full Clearance (Level 1)",
    avatar: "AA",
    color: "from-red-600 to-red-800",
  },
  {
    name: "Elena Ramos",
    email: "elena.r@ricoz.io",
    role: "Operations Lead",
    department: "Creative Delivery",
    badge: "Ops Lead (Level 2)",
    avatar: "ER",
    color: "from-amber-600 to-orange-700",
  },
];

// ============================================================================
// RICOZ OPERATIONS SUITE V3.5 & V4.1 UNIFIED TYPES & SCHEMAS
// ============================================================================

export type AdminUIMode = "executive" | "tactical";

export type UrgencyColor = "#DC2626" | "#D97706" | "#64748B" | "#7C3AED";

export interface ShapAttribution {
  feature: string;
  value: number | string;
  shapValue: number;
  impact: "positive" | "negative" | "neutral";
  description: string;
}

export interface ShapModelResult {
  model: "vendor_shadow_score" | "retainer_scope_creep_risk" | "creative_match_quality" | "burnout_sla_breach_risk";
  modelName: string;
  baseScore: number;
  calculatedScore: number;
  riskLevel?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  attributions: ShapAttribution[];
  suggestions: string[];
  solutions: string[];
  predictionConfidence: number;
}

export interface UserRBAC {
  userId: string;
  name: string;
  email: string;
  role: "super_admin" | "ops_lead" | "coordinator" | "viewer" | "admin";
  department: string;
  skills: string[];
  activeCriticalTracks: number;
  maxCapacityHours: number;
  capacity_pct?: number;
  is_active?: boolean;
}

export interface ClientMandate {
  clientId: string;
  companyName: string;
  primaryContact: {
    name: string;
    email: string;
    phone: string;
  };
  stage: "tell_us" | "discover" | "review" | "shortlist" | "project" | "inquiry" | "onboarding" | "active" | "paused";
  onboardingChecklist: Array<{
    itemKey: string;
    label: string;
    completed: boolean;
  }>;
  retainerValue: number;
  hoursAllocated: number;
  hoursUsed: number;
  cycleDay: number;
  accountLeadId: string;
  accountLeadName?: string;
  scopeCreepAlert?: boolean;
  shapRiskScore?: number;
  createdAt?: string;
}

export interface VendorCreative {
  vendorId: string;
  studioName: string;
  discipline: "creative_director" | "brand_identity" | "specialist";
  verificationStatus: "unverified" | "pending_review" | "verified";
  shadowScore: number;
  complianceDocs: Array<{
    docType: "nda" | "tax_w9" | "insurance_cert" | "msa";
    fileUrl: string;
    verified: boolean;
    expiresAt: string;
  }>;
  portfolioVector?: number[];
  autoRoutingPaused?: boolean;
  activeDeliverablesCount?: number;
  pingLatencyHours?: number;
  revisionLoops30d?: number;
}

export interface TaskWorkflow {
  taskId: string;
  title: string;
  department: string;
  priority: "P0" | "P1" | "P2" | "P3";
  status: "todo" | "in_progress" | "at_risk" | "overdue" | "blocked" | "completed";
  assigneeId: string;
  assigneeName?: string;
  dueDate: string;
  blockedByTaskId: string | null;
  sopId: string | null;
  sopTitle?: string;
  sopChecklistState: Array<{
    stepIndex: number;
    completed: boolean;
  }>;
  blockerNote: string | null;
  comments: Array<{
    authorId: string;
    authorName?: string;
    text: string;
    timestamp: string;
  }>;
  urgencyColor?: UrgencyColor;
  slaBreachRiskScore?: number;
  hoursToDeadline?: number;
}

export interface BriefEnquiry {
  enquiryId: string;
  companyName: string;
  projectTitle: string;
  creativeDiscipline: string;
  budgetRange: string | null;
  timelineWeeks: number | null;
  briefText: string;
  completenessScore: number;
  aiSuggestedTalentIds: string[];
  status: "pending" | "triaged" | "converted";
  missingFields?: string[];
  triageSummary?: string;
  createdAt?: string;
}

export interface SupportTicketCSAT {
  ticketRef: string;
  category: string;
  subject: string;
  customerName: string;
  priority: "P0" | "P1" | "P2" | "P3";
  status: "open" | "pending" | "escalated" | "resolved";
  slaDueAt: string;
  responses: Array<{
    sender: string;
    text: string;
    timestamp: string;
  }>;
  csatScore: number | null;
  rootCauseTag: string | null;
  warRoomActive?: boolean;
}

export interface SOPTemplate {
  sopId: string;
  title: string;
  department: string;
  version: string;
  category: string;
  markdownBody: string;
  checklistSteps: string[];
  driftScore: number;
  lastReviewedAt: string;
}

export interface AuditEventLedger {
  eventId: string;
  entityType: string;
  entityId: string;
  action: string;
  actorId: string;
  actorName?: string;
  payload: Record<string, unknown>;
  timestamp: string;
}

export interface BriefFunnelEvent {
  funnelId: string;
  mandateId: string;
  stageName: "tell_us" | "discover" | "review" | "shortlist" | "project";
  conversionTimeSec: number;
  dropoffFlag: boolean;
  metadata?: Record<string, unknown>;
  timestamp: string;
}

export interface PlaybookExecutionLog {
  id: string;
  playbookId: string;
  playbook_id?: string;
  playbookName: string;
  targetId: string;
  target_id?: string;
  status: "success" | "warning" | "in_progress" | "failed";
  triggeredAt: string;
  summary: string;
  details: Record<string, unknown>;
  actionsTaken?: string[];
  actions_taken?: string[];
}

export interface MLTrainingMetrics {
  modelKey: string;
  modelName: string;
  epochs: number;
  trainLoss: number;
  valLoss: number;
  r2Score: number;
  meanAbsoluteError: number;
  featureImportance: Array<{ feature: string; importance: number }>;
  lastTrainedAt: string;
  sampleCount: number;
  lossHistory?: number[];
}
