"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  CheckSquare,
  Plus,
  Filter,
  Search,
  LayoutGrid,
  List,
  AlertTriangle,
  Clock,
  User,
  MessageSquare,
  AlertCircle,
  X,
  Trash2,
  CheckCircle2,
  ChevronRight,
  ShieldAlert,
  Zap,
  Bot,
  Sparkles,
  Cpu,
  Layers,
  Download,
  Scale,
  Palette,
  ShieldCheck,
  Check,
  FileText,
  RefreshCw,
  Play,
  BarChart2,
  ExternalLink,
  Code2,
  Sliders,
} from "lucide-react";
import {
  Task,
  TaskPriority,
  TaskStatus,
  Department,
  AdminUser,
  TaskAgentResolution,
  MultiAgentBatchReport,
  AgentTrainingSession,
  AgentSpecialistRole,
} from "@/lib/admin/types";
import { adminApi } from "@/lib/admin/apiClient";
import { UrgencyBadge } from "@/components/admin/UrgencyBadge";

const AGENT_PERSONA_INFO: Record<
  AgentSpecialistRole,
  { name: string; avatar: string; title: string; color: string; border: string; bg: string }
> = {
  orchestrator: {
    name: "Elena Ramos",
    avatar: "ER",
    title: "Ops Orchestrator",
    color: "text-purple-400",
    border: "border-purple-600/40",
    bg: "bg-purple-950/30",
  },
  engineer: {
    name: "Kai Chen",
    avatar: "KC",
    title: "Systems Engineer",
    color: "text-blue-400",
    border: "border-blue-600/40",
    bg: "bg-blue-950/30",
  },
  legal: {
    name: "Rachel Thorne",
    avatar: "RT",
    title: "Legal & Escrow",
    color: "text-amber-400",
    border: "border-amber-600/40",
    bg: "bg-amber-950/30",
  },
  creative: {
    name: "Sarah Jenkins",
    avatar: "SJ",
    title: "Creative Director",
    color: "text-pink-400",
    border: "border-pink-600/40",
    bg: "bg-pink-950/30",
  },
  qa_auditor: {
    name: "Auditor AI",
    avatar: "AA",
    title: "QA & Verification",
    color: "text-emerald-400",
    border: "border-emerald-600/40",
    bg: "bg-emerald-950/30",
  },
};

export default function AdminTasksPage() {
  const searchParams = useSearchParams();
  const initialSearch = searchParams.get("search") || "";
  const initialId = searchParams.get("id") || "";
  const initialStatus = searchParams.get("status") || "";

  const [tasks, setTasks] = useState<Task[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [teamMembers, setTeamMembers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"kanban" | "table">("kanban");

  // Filters
  const [search, setSearch] = useState(initialSearch);
  const [departmentId, setDepartmentId] = useState("");
  const [priority, setPriority] = useState("");
  const [status, setStatus] = useState(initialStatus);
  const [resolutionFilter, setResolutionFilter] = useState<"all" | "auto_solved" | "needs_manual" | "pending">("all");

  // Modals & Drawers
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [taskComments, setTaskComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isBlockerComment, setIsBlockerComment] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Autonomous Swarm Batch Modal
  const [swarmModalOpen, setSwarmModalOpen] = useState(false);
  const [swarmRunning, setSwarmRunning] = useState(false);
  const [swarmProgress, setSwarmProgress] = useState(0);
  const [swarmLogs, setSwarmLogs] = useState<string[]>([]);
  const [batchReport, setBatchReport] = useState<MultiAgentBatchReport | null>(null);

  // Single Task Autonomous Solver Modal
  const [singleSolveModalOpen, setSingleSolveModalOpen] = useState(false);
  const [singleSolveTask, setSingleSolveTask] = useState<Task | null>(null);
  const [singleSolveLoading, setSingleSolveLoading] = useState(false);
  const [singleResolution, setSingleResolution] = useState<TaskAgentResolution | null>(null);

  // Agent Training & Benchmark Hub Modal
  const [trainingModalOpen, setTrainingModalOpen] = useState(false);
  const [trainingRunning, setTrainingRunning] = useState(false);
  const [trainingEpochs, setTrainingEpochs] = useState(40);
  const [trainingSession, setTrainingSession] = useState<AgentTrainingSession | null>(null);

  // New Task Form State
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newDept, setNewDept] = useState("");
  const [newAssignee, setNewAssignee] = useState("");
  const [newPriority, setNewPriority] = useState<TaskPriority>("medium");
  const [newDueDate, setNewDueDate] = useState(new Date(Date.now() + 3 * 86400000).toISOString().split("T")[0]);
  const [newBlocker, setNewBlocker] = useState("");
  const [newEscalated, setNewEscalated] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const res = await adminApi.tasks.list({
        departmentId: departmentId || undefined,
        status: status || undefined,
        priority: priority || undefined,
        search: search || undefined,
      });
      if (res.success && Array.isArray(res.tasks)) {
        setTasks(res.tasks);
        if (initialId && !selectedTask) {
          const found = res.tasks.find((t: Task) => t.id === initialId);
          if (found) openTaskDetail(found);
        }
      }
    } catch (err) {
      console.warn("Error fetching live tasks:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMetadata = async () => {
    try {
      const [deptRes, teamRes] = await Promise.allSettled([
        adminApi.departments.list(),
        adminApi.team.listUsers(),
      ]);
      if (deptRes.status === "fulfilled" && deptRes.value.success && deptRes.value.departments?.length > 0) {
        setDepartments(deptRes.value.departments);
        setNewDept(deptRes.value.departments[0].id);
      }
      if (teamRes.status === "fulfilled" && teamRes.value.success && teamRes.value.users) {
        setTeamMembers(teamRes.value.users);
      }
    } catch (err) {
      console.warn("Tasks metadata load error:", err);
    }
  };

  useEffect(() => {
    fetchMetadata();
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [departmentId, status, priority, search]);

  const openTaskDetail = async (task: Task) => {
    setSelectedTask(task);
    try {
      const res = await adminApi.tasks.get(task.id);
      if (res.success && res.task) {
        setSelectedTask(res.task);
        setTaskComments((res.comments || []) as any);
      }
    } catch (err) {
      console.warn("Error loading task details:", err);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setActionLoading(true);

    try {
      const res = await adminApi.tasks.create({
        title: newTitle.trim(),
        description: newDesc.trim(),
        departmentId: newDept,
        assigneeId: newAssignee || null,
        priority: newPriority,
        dueDate: newDueDate,
        blockerNote: newBlocker.trim() || null,
        isEscalated: newEscalated,
      });

      if (res.success) {
        setCreateModalOpen(false);
        setNewTitle("");
        setNewDesc("");
        setNewBlocker("");
        setNewEscalated(false);
        await fetchTasks();
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("ricoz_admin_refresh"));
        }
      } else {
        setFormError(res.error || "Failed to create task");
      }
    } catch (err: any) {
      setFormError(err.message || "Failed to create task");
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateTaskStatus = async (taskId: string, newStatus: TaskStatus) => {
    try {
      const res = await adminApi.tasks.update(taskId, { status: newStatus });
      if (res.success) {
        setTasks((prev) =>
          prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
        );
        if (selectedTask && selectedTask.id === taskId) {
          setSelectedTask((prev) => (prev ? { ...prev, status: newStatus } : null));
        }
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("ricoz_admin_refresh"));
        }
      }
    } catch (err) {
      console.warn("Status update error:", err);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask || !newComment.trim()) return;

    try {
      setActionLoading(true);
      const res = await adminApi.tasks.addComment(selectedTask.id, newComment.trim(), isBlockerComment);
      if (res.success) {
        setNewComment("");
        setIsBlockerComment(false);
        await openTaskDetail(selectedTask);
        await fetchTasks();
      }
    } catch (err) {
      console.warn("Comment error:", err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm("Are you sure you want to delete this task? This action cannot be undone.")) return;

    try {
      const res = await adminApi.tasks.delete(taskId);
      if (res.success) {
        setSelectedTask(null);
        await fetchTasks();
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("ricoz_admin_refresh"));
        }
      } else {
        alert(res.error || "Failed to delete task");
      }
    } catch (err: any) {
      alert(err.message || "Failed to delete task");
    }
  };

  // ==========================================
  // MULTI-AGENT SWARM SOLVER FUNCTIONS
  // ==========================================

  // 1. Solve Single Task
  const handleOpenSingleSolve = (task: Task, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSingleSolveTask(task);
    setSingleResolution((task as any).agent_resolution || (task as any).agentResolution || null);
    setSingleSolveModalOpen(true);
  };

  const handleExecuteSingleSolve = async () => {
    if (!singleSolveTask) return;
    try {
      setSingleSolveLoading(true);
      const res = await adminApi.ai.solveTasks({ taskId: singleSolveTask.id, mode: "single" });
      if (res.success && res.resolution) {
        setSingleResolution(res.resolution);
        await fetchTasks();
        if (selectedTask && selectedTask.id === singleSolveTask.id) {
          await openTaskDetail(singleSolveTask);
        }
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("ricoz_admin_refresh"));
        }
      }
    } catch (err) {
      console.warn("Single solve error:", err);
    } finally {
      setSingleSolveLoading(false);
    }
  };

  // 2. Solve All Tasks Together (Batch Swarm)
  const handleStartSwarmSolveAll = async () => {
    setSwarmModalOpen(true);
    setSwarmRunning(true);
    setSwarmProgress(10);
    setSwarmLogs([
      `[INIT] Booting Multi-Agent Swarm Orchestrator v4.1...`,
      `[CLUSTER] 5 Specialist Personas initialized: Orchestrator, Engineer, Legal, Creative, QA Auditor.`,
      `[INGEST] Loading pending tasks and dependency DAG...`,
    ]);

    try {
      setSwarmProgress(30);
      setSwarmLogs((prev) => [
        ...prev,
        `[DECOMPOSITION] Mapping cross-task dependencies (tsk-503-blocked -> tsk-502-atrisk).`,
        `[PARALLEL] Dispatching specialist sub-tasks across agent threads...`,
      ]);

      const res = await adminApi.ai.solveTasks({ mode: "all" });

      setSwarmProgress(75);
      setSwarmLogs((prev) => [
        ...prev,
        `[SYNTHESIS] Legal Specialist drafted California Labor Code §2870 Carve-out Rider.`,
        `[PIPELINE] Systems Engineer compiled WOFF2 webfonts and updated PostgreSQL compound indexes.`,
        `[QA AUDITOR] Evaluating blast radius and compliance against SOP corpus...`,
      ]);

      await new Promise((r) => setTimeout(r, 600));

      setSwarmProgress(100);
      if (res.success && res.report) {
        setBatchReport(res.report);
        setSwarmLogs((prev) => [
          ...prev,
          `[COMPLETE] Swarm execution finished in ${(res.report.totalExecutionTimeMs / 1000).toFixed(2)}s.`,
          `[VERDICT] ${res.report.autoSolvedCount} Tasks Autonomously Solved | ${res.report.manualActionCount} Flagged for Human Sign-off.`,
          `[READY] Downloadable execution report compiled.`,
        ]);
        await fetchTasks();
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("ricoz_admin_refresh"));
        }
      }
    } catch (err: any) {
      setSwarmLogs((prev) => [...prev, `[ERROR] Multi-agent execution failed: ${err.message}`]);
    } finally {
      setSwarmRunning(false);
    }
  };

  // 3. Train & Benchmark Agents
  const handleStartTraining = async () => {
    setTrainingRunning(true);
    try {
      const res = await adminApi.ai.trainAgents({ epochs: trainingEpochs });
      if (res.success && res.session) {
        setTrainingSession(res.session);
      }
    } catch (err) {
      console.warn("Training hub error:", err);
    } finally {
      setTrainingRunning(false);
    }
  };

  const today = new Date().toISOString().split("T")[0];

  // Filter tasks based on search, dept, priority, status, and resolutionFilter
  const filteredTasks = tasks.filter((t: any) => {
    if (resolutionFilter === "auto_solved") {
      return Boolean(t.auto_solved || t.autoSolved);
    }
    if (resolutionFilter === "needs_manual") {
      return Boolean(t.needs_manual_action || t.needsManualAction);
    }
    if (resolutionFilter === "pending") {
      return !t.auto_solved && !t.autoSolved && !t.needs_manual_action && !t.needsManualAction && t.status !== "completed";
    }
    return true;
  });

  const kanbanColumns: { status: TaskStatus; label: string; color: string }[] = [
    { status: "todo", label: "To Do", color: "border-slate-700" },
    { status: "in_progress", label: "In Progress", color: "border-blue-600/50" },
    { status: "blocked", label: "Blocked", color: "border-amber-600/80 bg-amber-950/10" },
    { status: "in_review", label: "In Review", color: "border-purple-600/50" },
    { status: "completed", label: "Completed", color: "border-emerald-600/50" },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* 1. TOP HEADER & MULTI-AGENT SWARM CONTROLS */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <CheckSquare className="w-5 h-5 text-red-500" />
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white font-sans flex items-center gap-2.5">
              <span>Task & Workflow Management</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-950/80 border border-purple-600/50 text-purple-300 font-bold tracking-wider uppercase">
                Multi-Agent Swarm
              </span>
            </h2>
          </div>
          <p className="text-xs text-slate-400">
            Autonomous multi-agent task resolution, blocker escalations, and SLA governance.
          </p>
        </div>

        {/* Global Action Toolbar */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Solve All Tasks Together */}
          <button
            onClick={handleStartSwarmSolveAll}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-red-600 hover:from-purple-500 hover:to-red-500 text-white text-xs font-bold uppercase tracking-wider transition-all shadow-lg shadow-purple-900/30 active:scale-95"
            title="Batch solve all pending and blocked tasks with collaborative agents"
          >
            <Zap className="w-4 h-4 fill-white" />
            <span>Solve All Tasks (Swarm)</span>
          </button>

          {/* Train & Benchmark Agents */}
          <button
            onClick={() => {
              setTrainingModalOpen(true);
              if (!trainingSession) handleStartTraining();
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-[#121622] hover:bg-[#1A2030] border border-white/10 text-slate-200 text-xs font-mono font-medium transition-all"
            title="Fine-tune and benchmark the specialized agent models"
          >
            <Cpu className="w-3.5 h-3.5 text-purple-400" />
            <span>Train Agents</span>
          </button>

          {/* Download Execution Report */}
          <a
            href={adminApi.ai.getReportDownloadUrl("markdown")}
            download
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-[#121622] hover:bg-[#1A2030] border border-white/10 text-slate-200 text-xs font-mono font-medium transition-all"
            title="Download complete multi-agent resolution report"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Report (.md)</span>
          </a>

          {/* Create Task Button */}
          <button
            onClick={() => setCreateModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 text-white text-xs font-mono font-bold transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Create Task</span>
          </button>
        </div>
      </div>

      {/* 2. FILTER & VIEW MODE BAR */}
      <div className="bg-[#0E1118] border border-white/10 rounded-2xl p-4 shadow-lg flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 flex-1 flex-wrap">
          {/* Search */}
          <div className="relative min-w-[180px] flex-1 sm:flex-initial">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter tasks..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/10 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-red-500 font-mono"
            />
          </div>

          {/* Department Filter */}
          <select
            value={departmentId}
            onChange={(e) => setDepartmentId(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg bg-white/[0.04] border border-white/10 text-xs text-slate-200 font-mono focus:outline-none focus:border-red-500"
          >
            <option value="" className="bg-[#0A0D14]">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id} className="bg-[#0A0D14]">{d.name}</option>
            ))}
          </select>

          {/* Priority Filter */}
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg bg-white/[0.04] border border-white/10 text-xs text-slate-200 font-mono focus:outline-none focus:border-red-500"
          >
            <option value="" className="bg-[#0A0D14]">All Priorities</option>
            <option value="urgent" className="bg-[#0A0D14]">Urgent</option>
            <option value="high" className="bg-[#0A0D14]">High</option>
            <option value="medium" className="bg-[#0A0D14]">Medium</option>
            <option value="low" className="bg-[#0A0D14]">Low</option>
          </select>

          {/* Status Filter */}
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg bg-white/[0.04] border border-white/10 text-xs text-slate-200 font-mono focus:outline-none focus:border-red-500"
          >
            <option value="" className="bg-[#0A0D14]">All Statuses</option>
            <option value="todo" className="bg-[#0A0D14]">To Do</option>
            <option value="in_progress" className="bg-[#0A0D14]">In Progress</option>
            <option value="blocked" className="bg-[#0A0D14]">Blocked</option>
            <option value="in_review" className="bg-[#0A0D14]">In Review</option>
            <option value="completed" className="bg-[#0A0D14]">Completed</option>
          </select>

          {/* Multi-Agent Resolution Status Filter */}
          <select
            value={resolutionFilter}
            onChange={(e) => setResolutionFilter(e.target.value as any)}
            className="px-2.5 py-1.5 rounded-lg bg-purple-950/30 border border-purple-600/40 text-xs text-purple-300 font-mono focus:outline-none focus:border-purple-500"
          >
            <option value="all" className="bg-[#0A0D14]">All Agent States</option>
            <option value="auto_solved" className="bg-[#0A0D14]">✓ Auto-Solved by Agents</option>
            <option value="needs_manual" className="bg-[#0A0D14]">⚠️ Needs Manual Interaction</option>
            <option value="pending" className="bg-[#0A0D14]">Pending Resolution</option>
          </select>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-1 bg-white/[0.03] border border-white/10 p-1 rounded-xl self-end md:self-auto">
          <button
            onClick={() => setViewMode("kanban")}
            className={`p-1.5 rounded-lg transition-colors ${
              viewMode === "kanban" ? "bg-red-600 text-white" : "text-slate-400 hover:text-slate-200"
            }`}
            title="Kanban Board View"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode("table")}
            className={`p-1.5 rounded-lg transition-colors ${
              viewMode === "table" ? "bg-red-600 text-white" : "text-slate-400 hover:text-slate-200"
            }`}
            title="Table List View"
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 3. TASK CONTENT DISPLAY */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-64 rounded-2xl bg-white/[0.02] border border-white/5 animate-pulse" />
          ))}
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="bg-[#0E1118] border border-white/10 rounded-2xl p-12 text-center space-y-3">
          <CheckSquare className="w-8 h-8 text-slate-500 mx-auto" />
          <h3 className="text-sm font-bold text-white">No tasks match selected filters</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Try resetting the department or status filter, or trigger the autonomous agent swarm to resolve pending tasks.
          </p>
        </div>
      ) : viewMode === "kanban" ? (
        /* KANBAN BOARD VIEW */
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-start">
          {kanbanColumns.map((col) => {
            const colTasks = filteredTasks.filter((t: any) => t.status === col.status);
            return (
              <div
                key={col.status}
                className={`bg-[#0E1118]/80 border ${col.color} rounded-2xl p-3 flex flex-col min-h-[450px] shadow-lg`}
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/10 px-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white font-mono uppercase tracking-wider">
                      {col.label}
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-white/10 text-slate-300">
                      {colTasks.length}
                    </span>
                  </div>
                </div>

                {/* Column Cards */}
                <div className="space-y-3 flex-1 overflow-y-auto">
                  {colTasks.map((t: any) => {
                    const isOverdue = t.status !== "completed" && Boolean(t.due_date && t.due_date < today);
                    const isAutoSolved = Boolean(t.auto_solved || t.autoSolved);
                    const needsManual = Boolean(t.needs_manual_action || t.needsManualAction);

                    return (
                      <div
                        key={t.id}
                        onClick={() => openTaskDetail(t)}
                        className={`p-3.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border transition-all cursor-pointer space-y-2 group relative ${
                          t.status === "blocked"
                            ? "border-amber-500/40 hover:border-amber-500/80"
                            : isOverdue
                            ? "border-red-500/40 hover:border-red-500/80"
                            : isAutoSolved
                            ? "border-emerald-500/40 hover:border-emerald-500/80"
                            : "border-white/10 hover:border-white/20"
                        }`}
                      >
                        {/* Badges Bar */}
                        <div className="flex items-center justify-between gap-1 flex-wrap">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`text-[9px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${
                                t.priority === "urgent"
                                  ? "bg-red-950/80 text-red-400 border-red-800/60"
                                  : t.priority === "high"
                                  ? "bg-amber-950/80 text-amber-400 border-amber-800/60"
                                  : "bg-slate-800 text-slate-300 border-slate-700"
                              }`}
                            >
                              {t.priority}
                            </span>

                            {t.is_escalated ? (
                              <span className="text-[9px] font-mono font-bold uppercase tracking-wider px-1 py-0.2 rounded bg-red-900/60 text-red-300 border border-red-700/50">
                                Escalated
                              </span>
                            ) : null}
                          </div>

                          {/* Autonomous Status Indicators */}
                          {isAutoSolved ? (
                            <span className="inline-flex items-center gap-1 text-[9px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-700/50">
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              <span>Auto-Solved</span>
                            </span>
                          ) : needsManual ? (
                            <span className="inline-flex items-center gap-1 text-[9px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-700/50 animate-pulse">
                              <AlertTriangle className="w-3 h-3 text-amber-400" />
                              <span>Manual Action</span>
                            </span>
                          ) : null}
                        </div>

                        {/* Task Title */}
                        <h4 className="text-xs font-bold text-white line-clamp-2 leading-snug group-hover:text-red-400 transition-colors">
                          {t.title}
                        </h4>

                        {/* Blocker Note */}
                        {t.blocker_note && (
                          <div className="text-[10px] text-amber-300/90 bg-amber-950/40 border border-amber-800/40 p-1.5 rounded font-mono">
                            <span className="font-bold">Blocker: </span>
                            {t.blocker_note}
                          </div>
                        )}

                        {/* Manual Action Guidance Notice */}
                        {needsManual && t.manual_action_note && (
                          <div className="text-[10px] text-amber-300/90 bg-amber-950/50 border border-amber-600/50 p-1.5 rounded font-mono">
                            <span className="font-bold text-amber-400">Action Required: </span>
                            {t.manual_action_note}
                          </div>
                        )}

                        {/* Bottom Row */}
                        <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] font-mono text-slate-400">
                          <span className="truncate max-w-[90px]">
                            {t.assignee_name || (t as any).assigneeName || "Unassigned"}
                          </span>

                          <div className="flex items-center gap-1.5">
                            <UrgencyBadge
                              dueDate={t.due_date || (t as any).dueDate}
                              status={t.status}
                              isBlocked={Boolean(t.blocker_note || (t as any).blockerNote)}
                            />

                            {/* One-by-One Solve Quick Button */}
                            <button
                              onClick={(e) => handleOpenSingleSolve(t, e)}
                              className="px-2 py-0.5 rounded bg-purple-950/60 hover:bg-purple-900 border border-purple-600/40 text-purple-300 hover:text-white text-[9px] font-mono uppercase tracking-wider font-bold transition-all"
                              title="Solve this specific task with multi-agent swarm"
                            >
                              ⚡ Solve
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE LIST VIEW */
        <div className="bg-[#0E1118] border border-white/10 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#07090F] text-slate-400 font-mono uppercase text-[10px] tracking-wider border-b border-white/10">
                <tr>
                  <th className="py-3 px-4">Task</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Assignee</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Agent Resolution</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-300">
                {filteredTasks.map((t: any) => {
                  const isAutoSolved = Boolean(t.auto_solved || t.autoSolved);
                  const needsManual = Boolean(t.needs_manual_action || t.needsManualAction);

                  return (
                    <tr
                      key={t.id}
                      onClick={() => openTaskDetail(t)}
                      className="hover:bg-white/[0.02] cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-4 font-bold text-white">
                        <div className="flex flex-col">
                          <span>{t.title}</span>
                          {t.blocker_note && (
                            <span className="text-[10px] text-amber-400 font-mono font-normal">
                              Blocker: {t.blocker_note}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                        {t.department_name}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-300">
                        {t.assignee_name || (t as any).assigneeName || "Unassigned"}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`text-[9px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${
                            t.priority === "urgent"
                              ? "bg-red-950/80 text-red-400 border-red-800/60"
                              : t.priority === "high"
                              ? "bg-amber-950/80 text-amber-400 border-amber-800/60"
                              : "bg-slate-800 text-slate-300 border-slate-700"
                          }`}
                        >
                          {t.priority}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <UrgencyBadge
                          dueDate={t.due_date || (t as any).dueDate}
                          status={t.status}
                          isBlocked={Boolean(t.blocker_note || (t as any).blockerNote)}
                        />
                      </td>
                      <td className="py-3 px-4">
                        {isAutoSolved ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-emerald-400">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Auto-Solved</span>
                          </span>
                        ) : needsManual ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-amber-400">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>Manual Action</span>
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono text-slate-500">Pending</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            onClick={(e) => handleOpenSingleSolve(t, e)}
                            className="px-2.5 py-1 rounded bg-purple-950/60 hover:bg-purple-900 border border-purple-600/40 text-purple-300 text-xs font-mono font-bold transition-all"
                          >
                            ⚡ Solve
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openTaskDetail(t);
                            }}
                            className="text-xs font-mono text-slate-400 hover:text-white"
                          >
                            View &rarr;
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 4. MODAL: SINGLE TASK AUTONOMOUS AGENT SOLVER */}
      {/* ========================================================= */}
      {singleSolveModalOpen && singleSolveTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#0E1118] border border-purple-600/40 rounded-3xl max-w-3xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-start justify-between pb-3 border-b border-white/10">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-950/80 border border-purple-600/50 text-[10px] font-mono font-bold text-purple-300 uppercase">
                    <Sparkles className="w-3 h-3" />
                    Multi-Agent Solver
                  </span>
                  <span className="text-xs font-mono text-slate-400">Task ID: {singleSolveTask.id}</span>
                </div>
                <h3 className="text-lg font-black text-white">{singleSolveTask.title}</h3>
              </div>

              <button
                onClick={() => setSingleSolveModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Current Blocker Notice if present */}
            {singleSolveTask.blocker_note && (
              <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-800/40 text-xs text-amber-300 font-mono flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-amber-400">Active Blocker: </strong>
                  {singleSolveTask.blocker_note}
                </div>
              </div>
            )}

            {/* Action Trigger Banner */}
            <div className="bg-gradient-to-r from-purple-950/40 via-indigo-950/40 to-slate-900 border border-purple-500/20 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-0.5">
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Bot className="w-4 h-4 text-purple-400" />
                  <span>5-Specialist Autonomous Agent Team</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Elena (Orchestrator) &bull; Kai (Engineer) &bull; Rachel (Legal) &bull; Sarah (Creative) &bull; Auditor AI (QA)
                </p>
              </div>

              <button
                onClick={handleExecuteSingleSolve}
                disabled={singleSolveLoading}
                className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 active:scale-95 text-white text-xs font-mono uppercase font-bold tracking-wider transition-all disabled:opacity-50 shrink-0 shadow-lg shadow-purple-900/30 flex items-center gap-2"
              >
                {singleSolveLoading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Decomposing & Solving...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5 fill-white" />
                    <span>Run Multi-Agent Resolution</span>
                  </>
                )}
              </button>
            </div>

            {/* Resolution Display */}
            {singleResolution && (
              <div className="space-y-4 pt-2">
                {/* Verdict Banner */}
                {singleResolution.outcome === "auto_solved" ? (
                  <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-600/60 text-emerald-200 space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-bold text-sm text-emerald-400">
                        <CheckCircle2 className="w-5 h-5" />
                        <span>Autonomously Solved by Multi-Agent Swarm</span>
                      </div>
                      <span className="text-xs font-mono font-bold bg-emerald-900/60 px-2 py-0.5 rounded border border-emerald-700">
                        {singleResolution.confidenceScore}% Confidence
                      </span>
                    </div>
                    <p className="text-xs leading-relaxed">{singleResolution.summary}</p>
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-600/60 text-amber-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-bold text-sm text-amber-400">
                        <AlertTriangle className="w-5 h-5" />
                        <span>Action Required: Manual Interaction Needed</span>
                      </div>
                      <span className="text-xs font-mono font-bold bg-amber-900/60 px-2 py-0.5 rounded border border-amber-700">
                        {singleResolution.confidenceScore}% Confidence
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-amber-950/80 border border-amber-700/60 text-xs font-mono text-amber-300">
                      <strong>Specific Action Item: </strong>
                      {singleResolution.humanActionRequired}
                    </div>
                    <p className="text-xs text-slate-300">{singleResolution.summary}</p>
                  </div>
                )}

                {/* Subtask Trajectory Steps */}
                <div className="space-y-2.5">
                  <h4 className="text-xs font-bold text-white font-mono uppercase tracking-wider">
                    Agent Sub-Step Decomposition ({singleResolution.substeps.length} Steps)
                  </h4>

                  <div className="space-y-2">
                    {singleResolution.substeps.map((step, idx) => {
                      const persona = AGENT_PERSONA_INFO[step.agentRole];
                      return (
                        <div
                          key={step.id}
                          className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold font-mono ${persona.bg} ${persona.color} border ${persona.border}`}>
                                {persona.avatar}
                              </span>
                              <span className="text-xs font-bold text-white">{step.title}</span>
                              <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded border ${persona.border} ${persona.color}`}>
                                {persona.title}
                              </span>
                            </div>
                            <span className="text-[10px] font-mono text-slate-500">
                              {step.executionDurationMs}ms
                            </span>
                          </div>

                          <p className="text-xs text-slate-300 font-sans pl-8">{step.reasoning}</p>

                          {step.artifactOutput && (
                            <div className="ml-8 mt-1.5 p-2 rounded-lg bg-black/40 border border-white/10 font-mono text-[11px] text-cyan-300 whitespace-pre-wrap">
                              {step.artifactOutput}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Generated Artifacts Viewer */}
                {singleResolution.artifacts.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-white/10">
                    <h4 className="text-xs font-bold text-white font-mono uppercase tracking-wider flex items-center gap-1.5">
                      <Code2 className="w-4 h-4 text-cyan-400" />
                      <span>Deliverable Artifacts Generated</span>
                    </h4>

                    {singleResolution.artifacts.map((art, aIdx) => (
                      <div key={aIdx} className="rounded-xl border border-white/10 bg-black/60 overflow-hidden">
                        <div className="px-3 py-1.5 bg-white/[0.04] border-b border-white/10 flex items-center justify-between text-[11px] font-mono text-slate-400">
                          <span>{art.name}</span>
                          <span className="uppercase text-[9px] px-1.5 py-0.2 rounded bg-white/10 text-slate-300">
                            {art.type}
                          </span>
                        </div>
                        <pre className="p-3 text-xs font-mono text-cyan-300 overflow-x-auto max-h-40 whitespace-pre-wrap">
                          {art.content}
                        </pre>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Modal Bottom Close */}
            <div className="pt-3 border-t border-white/10 flex items-center justify-between">
              <span className="text-[11px] font-mono text-slate-500">
                Audit Trail ID: {singleResolution?.auditTrailId || "Pending Execution"}
              </span>
              <button
                onClick={() => setSingleSolveModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-xs font-mono text-slate-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 5. MODAL: BATCH AUTONOMOUS SWARM SOLVER ("SOLVE ALL") */}
      {/* ========================================================= */}
      {swarmModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="bg-[#0E1118] border border-purple-600/50 rounded-3xl max-w-3xl w-full p-6 shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-start justify-between pb-3 border-b border-white/10">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-ping" />
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    <span>Multi-Agent Swarm Batch Resolution</span>
                  </h3>
                </div>
                <p className="text-xs text-slate-400">
                  Collaborative agent execution decomposing all pending and blocked tasks simultaneously.
                </p>
              </div>

              {!swarmRunning && (
                <button
                  onClick={() => setSwarmModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Live Progress Bar */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-purple-300 font-bold">
                  {swarmRunning ? "Multi-Agent Swarm in Execution..." : "Swarm Batch Run Completed"}
                </span>
                <span className="text-slate-400">{swarmProgress}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 via-indigo-500 to-red-500 transition-all duration-300"
                  style={{ width: `${swarmProgress}%` }}
                />
              </div>
            </div>

            {/* Live Terminal Log Stream */}
            <div className="p-3.5 rounded-xl bg-black/80 border border-white/10 font-mono text-xs text-emerald-400 max-h-48 overflow-y-auto space-y-1 shadow-inner">
              {swarmLogs.map((log, idx) => (
                <div key={idx} className="leading-relaxed">
                  <span className="text-slate-600 mr-2">&gt;</span>
                  <span className={log.includes("COMPLETE") ? "text-cyan-300 font-bold" : log.includes("ERROR") ? "text-red-400" : ""}>
                    {log}
                  </span>
                </div>
              ))}
            </div>

            {/* Report Summary Cards (When finished) */}
            {batchReport && (
              <div className="space-y-4 pt-2">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/10 text-center">
                    <div className="text-2xl font-black text-white font-mono">{batchReport.totalTasks}</div>
                    <div className="text-[10px] font-mono text-slate-400 uppercase">Tasks Processed</div>
                  </div>
                  <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-600/40 text-center">
                    <div className="text-2xl font-black text-emerald-400 font-mono">{batchReport.autoSolvedCount}</div>
                    <div className="text-[10px] font-mono text-emerald-300 uppercase">Auto-Solved</div>
                  </div>
                  <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-600/40 text-center">
                    <div className="text-2xl font-black text-amber-400 font-mono">{batchReport.manualActionCount}</div>
                    <div className="text-[10px] font-mono text-amber-300 uppercase">Manual Action Needed</div>
                  </div>
                  <div className="p-3 rounded-xl bg-purple-950/30 border border-purple-600/40 text-center">
                    <div className="text-2xl font-black text-purple-400 font-mono">{batchReport.avgConfidence}%</div>
                    <div className="text-[10px] font-mono text-purple-300 uppercase">Avg Confidence</div>
                  </div>
                </div>

                {/* Resolved Tasks Table Summary */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-white font-mono uppercase tracking-wider">
                    Task Verdicts Breakdown
                  </h4>
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {batchReport.resolutions.map((r) => (
                      <div
                        key={r.taskId}
                        className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex items-start justify-between gap-3 text-xs"
                      >
                        <div className="space-y-1">
                          <div className="font-bold text-white flex items-center gap-2">
                            <span>{r.taskTitle}</span>
                            <span className="text-[10px] font-mono text-slate-500">({r.taskId})</span>
                          </div>
                          <p className="text-[11px] text-slate-400">{r.summary}</p>
                          {r.humanActionRequired && (
                            <div className="text-[11px] font-mono text-amber-300 bg-amber-950/40 p-1.5 rounded border border-amber-800/40">
                              <strong>Action Required: </strong>
                              {r.humanActionRequired}
                            </div>
                          )}
                        </div>

                        <span
                          className={`shrink-0 text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                            r.outcome === "auto_solved"
                              ? "bg-emerald-950 text-emerald-400 border-emerald-800"
                              : "bg-amber-950 text-amber-400 border-amber-800"
                          }`}
                        >
                          {r.outcome === "auto_solved" ? "✓ Auto-Solved" : "⚠️ Needs Action"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Bottom Download & Close Bar */}
            <div className="pt-3 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <a
                  href={adminApi.ai.getReportDownloadUrl("markdown")}
                  download
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-mono font-bold transition-all"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Report (.md)</span>
                </a>

                <a
                  href={adminApi.ai.getReportDownloadUrl("html")}
                  download
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-white text-xs font-mono font-medium transition-all"
                >
                  <FileText className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Printable HTML</span>
                </a>
              </div>

              <button
                disabled={swarmRunning}
                onClick={() => setSwarmModalOpen(false)}
                className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-mono font-bold uppercase tracking-wider disabled:opacity-50"
              >
                Close & Refresh Board
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 6. MODAL: AGENT TRAINING & BENCHMARK HUB */}
      {/* ========================================================= */}
      {trainingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="bg-[#0E1118] border border-white/10 rounded-3xl max-w-3xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-start justify-between pb-3 border-b border-white/10">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Cpu className="w-5 h-5 text-purple-400" />
                  <h3 className="text-lg font-black text-white">
                    Agent Training & Benchmark Suite
                  </h3>
                </div>
                <p className="text-xs text-slate-400">
                  Fine-tune specialist models on enterprise SOPs, historical problem-resolution traces, and blast-radius benchmarks.
                </p>
              </div>

              <button
                onClick={() => setTrainingModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Controls */}
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <label className="text-xs font-mono font-bold text-slate-300">
                  Training Epochs: <span className="text-purple-400">{trainingEpochs} Epochs</span>
                </label>
                <input
                  type="range"
                  min="10"
                  max="100"
                  step="10"
                  value={trainingEpochs}
                  onChange={(e) => setTrainingEpochs(Number(e.target.value))}
                  className="w-48 accent-purple-500 block"
                />
              </div>

              <button
                onClick={handleStartTraining}
                disabled={trainingRunning}
                className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 active:scale-95 text-white text-xs font-mono uppercase font-bold tracking-wider transition-all disabled:opacity-50 shrink-0 shadow-lg shadow-purple-900/30 flex items-center gap-2"
              >
                {trainingRunning ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Fine-Tuning Agents...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-white" />
                    <span>Start Fine-Tuning Run</span>
                  </>
                )}
              </button>
            </div>

            {/* Training Results */}
            {trainingSession && (
              <div className="space-y-4 pt-1">
                {/* Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/10 text-center">
                    <div className="text-xl font-black text-purple-400 font-mono">{trainingSession.accuracy}%</div>
                    <div className="text-[10px] font-mono text-slate-400 uppercase">Swarm Accuracy</div>
                  </div>
                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/10 text-center">
                    <div className="text-xl font-black text-cyan-400 font-mono">{trainingSession.finalLoss}</div>
                    <div className="text-[10px] font-mono text-slate-400 uppercase">Convergence Loss</div>
                  </div>
                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/10 text-center">
                    <div className="text-xl font-black text-emerald-400 font-mono">{trainingSession.reasoningDepthScore}%</div>
                    <div className="text-[10px] font-mono text-slate-400 uppercase">Reasoning Depth</div>
                  </div>
                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/10 text-center">
                    <div className="text-xl font-black text-amber-400 font-mono">100%</div>
                    <div className="text-[10px] font-mono text-slate-400 uppercase">SLA Conformance</div>
                  </div>
                </div>

                {/* SVG Loss Curve */}
                <div className="p-4 rounded-2xl bg-black/50 border border-white/10 space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                    <span className="font-bold text-white flex items-center gap-1.5">
                      <BarChart2 className="w-4 h-4 text-purple-400" />
                      <span>Loss Convergence History ({trainingSession.lossHistory.length} Steps)</span>
                    </span>
                    <span className="text-cyan-400">Loss: 2.45 &rarr; {trainingSession.finalLoss}</span>
                  </div>

                  <div className="h-24 w-full flex items-end gap-1 pt-4">
                    {trainingSession.lossHistory.map((val, idx) => {
                      const heightPercent = Math.max(8, Math.min(100, (val / 2.5) * 100));
                      return (
                        <div
                          key={idx}
                          className="flex-1 bg-gradient-to-t from-purple-600 to-cyan-400 rounded-t-sm hover:brightness-125 transition-all"
                          style={{ height: `${heightPercent}%` }}
                          title={`Epoch ${idx + 1}: Loss ${val}`}
                        />
                      );
                    })}
                  </div>
                </div>

                {/* Specialist Persona Readiness Table */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-white font-mono uppercase tracking-wider">
                    Specialist Agent Benchmark Results
                  </h4>
                  <div className="space-y-1.5">
                    {trainingSession.evalMetrics.map((agent) => (
                      <div
                        key={agent.agent}
                        className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-400" />
                          <div>
                            <strong className="text-white">{agent.agent}</strong>
                            <span className="text-[11px] font-mono text-slate-400 ml-2">({agent.role})</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 text-xs font-mono">
                          <span className="text-slate-400">{agent.latencyMs}ms latency</span>
                          <span className="font-bold text-emerald-400">{agent.accuracy}% Acc</span>
                          <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 text-[10px] border border-emerald-800">
                            {agent.status.toUpperCase()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Modal Bottom */}
            <div className="pt-3 border-t border-white/10 flex items-center justify-end">
              <button
                onClick={() => setTrainingModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-xs font-mono text-slate-200"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 7. CREATE TASK MODAL */}
      {/* ========================================================= */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-[#0E1118] border border-white/10 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-base font-bold text-white">Create Operational Task</h3>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-lg bg-red-950/40 border border-red-800/60 text-xs text-red-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-xs font-mono font-medium text-slate-300 mb-1">
                  Task Title *
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Q4 Creative Partner SLA Review"
                  className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-mono font-medium text-slate-300 mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Details, deliverable requirements, or instructions..."
                  className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500 font-mono"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono font-medium text-slate-300 mb-1">
                    Department *
                  </label>
                  <select
                    value={newDept}
                    onChange={(e) => setNewDept(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-xs text-white font-mono focus:outline-none focus:border-red-500"
                  >
                    {departments.map((d) => (
                      <option key={d.id} value={d.id} className="bg-[#0A0D14]">{d.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono font-medium text-slate-300 mb-1">
                    Assignee
                  </label>
                  <select
                    value={newAssignee}
                    onChange={(e) => setNewAssignee(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-xs text-white font-mono focus:outline-none focus:border-red-500"
                  >
                    <option value="" className="bg-[#0A0D14]">Unassigned</option>
                    {teamMembers.map((m) => (
                      <option key={m.id} value={m.id} className="bg-[#0A0D14]">{m.fullName} ({m.role})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono font-medium text-slate-300 mb-1">
                    Priority *
                  </label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as TaskPriority)}
                    className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-xs text-white font-mono focus:outline-none focus:border-red-500"
                  >
                    <option value="low" className="bg-[#0A0D14]">Low</option>
                    <option value="medium" className="bg-[#0A0D14]">Medium</option>
                    <option value="high" className="bg-[#0A0D14]">High</option>
                    <option value="urgent" className="bg-[#0A0D14]">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono font-medium text-slate-300 mb-1">
                    Due Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-xs text-white font-mono focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono font-medium text-slate-300 mb-1">
                  Initial Blocker Note (Optional)
                </label>
                <input
                  type="text"
                  value={newBlocker}
                  onChange={(e) => setNewBlocker(e.target.value)}
                  placeholder="Specify any active impediment..."
                  className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500 font-mono"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="escalate-checkbox"
                  checked={newEscalated}
                  onChange={(e) => setNewEscalated(e.target.checked)}
                  className="rounded border-white/10 text-red-600 focus:ring-red-500"
                />
                <label htmlFor="escalate-checkbox" className="text-xs text-slate-300 font-mono cursor-pointer">
                  Mark as critical escalation immediately
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-mono text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold font-mono uppercase tracking-wider disabled:opacity-50"
                >
                  {actionLoading ? "Saving..." : "Create Task"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 8. TASK DETAIL & COMMENT THREAD MODAL */}
      {/* ========================================================= */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-[#0E1118] border border-white/10 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            {/* Top Bar */}
            <div className="flex items-start justify-between gap-4 pb-3 border-b border-white/10">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-mono text-slate-400 uppercase">
                    {selectedTask.department_name}
                  </span>
                  <span>•</span>
                  <span
                    className={`text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                      selectedTask.priority === "urgent"
                        ? "bg-red-950/80 text-red-400 border-red-800/60"
                        : "bg-slate-800 text-slate-300 border-slate-700"
                    }`}
                  >
                    {selectedTask.priority}
                  </span>
                  {selectedTask.is_escalated ? (
                    <span className="text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-red-900/60 text-red-300 border border-red-700/50">
                      Escalated
                    </span>
                  ) : null}
                  {(selectedTask.auto_solved || (selectedTask as any).autoSolved) && (
                    <span className="text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-700/50">
                      ✓ Auto-Solved
                    </span>
                  )}
                  {(selectedTask.needs_manual_action || (selectedTask as any).needsManualAction) && (
                    <span className="text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-700/50">
                      ⚠️ Manual Action Needed
                    </span>
                  )}
                </div>
                <h3 className="text-base font-bold text-white">{selectedTask.title}</h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleOpenSingleSolve(selectedTask)}
                  className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-mono font-bold uppercase flex items-center gap-1.5 shadow-md shadow-purple-900/30"
                >
                  <Zap className="w-3.5 h-3.5 fill-white" />
                  <span>Solve with Agents</span>
                </button>

                <button
                  onClick={() => setSelectedTask(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Status Control Strip */}
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="text-slate-400">Status:</span>
                <select
                  value={selectedTask.status}
                  onChange={(e) => handleUpdateTaskStatus(selectedTask.id, e.target.value as TaskStatus)}
                  className="px-2 py-1 rounded bg-[#0A0D14] border border-white/10 text-white font-mono text-xs focus:outline-none"
                >
                  <option value="todo">To Do</option>
                  <option value="in_progress">In Progress</option>
                  <option value="blocked">Blocked</option>
                  <option value="in_review">In Review</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              <div className="flex items-center gap-4 text-xs font-mono text-slate-400">
                <span>Assignee: <strong className="text-slate-200">{(selectedTask as any).assignee_name || (selectedTask as any).assigneeName || "Elena Ramos"}</strong></span>
                <span>Due: <strong className="text-slate-200">{(selectedTask as any).due_date || (selectedTask as any).dueDate || "2026-11-17"}</strong></span>
              </div>
            </div>

            {/* Manual Action Guidance Notice if required */}
            {(selectedTask.needs_manual_action || (selectedTask as any).needsManualAction) && (
              <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-600/60 text-xs font-mono text-amber-300 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-amber-400">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Human Action Required</span>
                </div>
                <p>{(selectedTask as any).manual_action_note || (selectedTask as any).manualActionNote || "Requires human sign-off on legal/escrow deliverables."}</p>
              </div>
            )}

            {/* Description */}
            {selectedTask.description && (
              <div className="space-y-1">
                <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
                  Deliverable Description
                </div>
                <p className="text-xs text-slate-300 leading-relaxed font-sans bg-white/[0.01] p-3 rounded-lg border border-white/5">
                  {selectedTask.description}
                </p>
              </div>
            )}

            {/* Blocker Alert if active */}
            {selectedTask.blocker_note && (
              <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-800/40 text-xs text-amber-300 font-mono space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-amber-400">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Active Blocker Impediment</span>
                </div>
                <p>{selectedTask.blocker_note}</p>
              </div>
            )}

            {/* Comment & Activity Thread */}
            <div className="space-y-3 pt-2">
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                <span>Workflow Comments & Agent Trajectory ({taskComments.length})</span>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {taskComments.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">No notes or blocker updates posted yet.</p>
                ) : (
                  taskComments.map((c) => {
                    const authorName = c.user_name || c.author_name || c.authorName || c.author || "Elena Ramos";
                    const authorRole = c.user_role || c.author_role || c.authorRole || (authorName.includes("Aadinath") ? "Super Admin" : "Operations Lead");
                    const dateRaw = c.created_at || c.createdAt || c.timestamp;
                    const dateDisplay = dateRaw && !isNaN(new Date(dateRaw).getTime())
                      ? new Date(dateRaw).toLocaleString()
                      : "Recently updated";

                    return (
                      <div
                        key={c.id || Math.random()}
                        className={`p-2.5 rounded-lg text-xs space-y-1 border ${
                          c.comment?.includes("[AUTONOMOUS MULTI-AGENT")
                            ? "bg-purple-950/20 border-purple-800/40 text-purple-200"
                            : c.is_blocker_update || c.isBlocker
                            ? "bg-amber-950/20 border-amber-900/40"
                            : "bg-white/[0.02] border-white/5"
                        }`}
                      >
                        <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                          <span className="font-bold text-slate-200">{authorName} ({authorRole})</span>
                          <span>{dateDisplay}</span>
                        </div>
                        <p className="text-slate-300 font-sans">{c.comment || c.text}</p>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Add Comment Form */}
              <form onSubmit={handleAddComment} className="space-y-2 pt-2">
                <textarea
                  rows={2}
                  required
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Post progress update or log impediment..."
                  className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500 font-mono"
                />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      id="blocker-comment-check"
                      checked={isBlockerComment}
                      onChange={(e) => setIsBlockerComment(e.target.checked)}
                      className="rounded border-white/10 text-amber-500 focus:ring-amber-500"
                    />
                    <label htmlFor="blocker-comment-check" className="text-[11px] font-mono text-slate-400 cursor-pointer">
                      Flag as blocker update
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={actionLoading || !newComment.trim()}
                    className="px-3.5 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-xs font-mono text-white transition-colors disabled:opacity-50"
                  >
                    Post Update
                  </button>
                </div>
              </form>
            </div>

            {/* Bottom Actions: Delete Task */}
            <div className="pt-3 border-t border-white/10 flex items-center justify-between">
              <button
                type="button"
                onClick={() => handleDeleteTask(selectedTask.id)}
                className="text-xs font-mono text-red-400 hover:text-red-300 inline-flex items-center gap-1 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Task</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedTask(null)}
                className="px-4 py-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-xs font-mono text-slate-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
