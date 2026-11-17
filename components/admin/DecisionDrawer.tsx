"use client";

import React, { useState } from "react";
import {
  X,
  Sparkles,
  ShieldAlert,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  UserCheck,
  Clock,
  Send,
  Play,
  CheckCircle2,
  AlertTriangle,
  Lock,
} from "lucide-react";
import { ShapModelResult } from "@/lib/admin/types";
import { UrgencyBadge } from "./UrgencyBadge";

export interface DecisionDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  recordType: "task" | "client" | "vendor" | "enquiry" | "ticket";
  record: any;
  shapResult?: ShapModelResult | null;
  activeViewers?: Array<{ name: string; avatar: string; role: string }>;
  onReassign?: (newAssigneeId: string) => void;
  onNudge?: (channel: "Slack" | "Email") => void;
  onTriggerPlaybook?: (playbookId: string) => void;
}

export const DecisionDrawer: React.FC<DecisionDrawerProps> = ({
  isOpen,
  onClose,
  recordType,
  record,
  shapResult,
  activeViewers = [
    { name: "Elena Ramos", avatar: "ER", role: "Ops Lead" },
    { name: "Aadinath Achary", avatar: "AA", role: "Super Admin" },
  ],
  onReassign,
  onNudge,
  onTriggerPlaybook,
}) => {
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [reassignModalOpen, setReassignModalOpen] = useState(false);
  const [selectedNewAssignee, setSelectedNewAssignee] = useState("usr-002-elena");

  if (!isOpen || !record) return null;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleNudgeAction = (channel: "Slack" | "Email") => {
    if (onNudge) {
      onNudge(channel);
    }
    showToast(`1-Click Nudge sent via ${channel} to ${record.assigneeName || record.primaryContact?.name || record.studioName || "assigned owner"}.`);
  };

  const handlePlaybookAction = (playbookId: string, name: string) => {
    if (onTriggerPlaybook) {
      onTriggerPlaybook(playbookId);
    }
    showToast(`Automation Playbook "${name}" triggered for ${record.id || record.taskId || record.clientId || "record"}.`);
  };

  const handleExecuteReassign = () => {
    if (onReassign) {
      onReassign(selectedNewAssignee);
    }
    setReassignModalOpen(false);
    showToast(`Reassigned to ${selectedNewAssignee === "usr-001-aadinath" ? "Aadinath Achary" : selectedNewAssignee === "usr-002-elena" ? "Elena Ramos" : "Kai Chen"}.`);
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-xl bg-[#0A0D14] border-l border-white/10 shadow-2xl flex flex-col transition-transform duration-300 ease-out transform translate-x-0">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="absolute top-4 left-4 right-4 z-50 p-3 rounded-xl bg-emerald-950/90 border border-emerald-600/50 text-emerald-300 text-xs font-mono flex items-center gap-2 shadow-2xl backdrop-blur-md animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. TOP HEADER & MULTIPLAYER BADGES */}
      <div className="p-5 border-b border-white/10 flex items-center justify-between bg-[#0E1118]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-red-950/70 border border-red-800/40 text-red-400 flex items-center justify-center font-mono font-bold text-xs uppercase">
            {recordType.slice(0, 3)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider font-semibold">
                Decision Brief Drawer
              </span>
              <span className="text-slate-600">•</span>
              <span className="text-[10px] font-mono text-slate-300 font-bold">
                {record.id || record.taskId || record.clientId || record.vendorId || record.ticketRef}
              </span>
            </div>
            <h3 className="text-sm font-bold text-white truncate max-w-xs">
              {record.title || record.companyName || record.studioName || record.subject || "Record Details"}
            </h3>
          </div>
        </div>

        {/* Multiplayer optimistic locking avatar badges */}
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center -space-x-1.5" title="Active viewers on this record">
            {activeViewers.map((v, i) => (
              <div
                key={i}
                className="w-6 h-6 rounded-full bg-slate-800 border-2 border-[#0A0D14] text-[9px] font-mono font-bold text-slate-200 flex items-center justify-center"
                title={`${v.name} (${v.role}) is viewing`}
              >
                {v.avatar}
              </div>
            ))}
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
            title="Close Drawer (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 2. DRAWER BODY SCROLLER */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        {/* Urgent Status & Timeline */}
        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-slate-400">Operational Urgency:</span>
            <UrgencyBadge
              dueDate={record.dueDate || record.due_date || record.slaDueAt}
              status={record.status || "open"}
              isBlocked={Boolean(record.blockedByTaskId || record.blockerNote || record.blocker_note)}
            />
          </div>

          {record.dueDate && (
            <div className="flex items-center justify-between text-xs font-mono text-slate-300">
              <span className="text-slate-400">Target Timestamp:</span>
              <span>{new Date(record.dueDate).toLocaleString()}</span>
            </div>
          )}

          {record.assigneeName && (
            <div className="flex items-center justify-between text-xs font-mono text-slate-300">
              <span className="text-slate-400">Current Assignee:</span>
              <strong className="text-white font-semibold">{record.assigneeName}</strong>
            </div>
          )}

          {record.retainerValue && (
            <div className="flex items-center justify-between text-xs font-mono text-slate-300">
              <span className="text-slate-400">Retainer Budget:</span>
              <strong className="text-emerald-400 font-bold">${record.retainerValue.toLocaleString()} USD</strong>
            </div>
          )}

          {record.hoursUsed !== undefined && record.hoursAllocated !== undefined && (
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-400">Hours Burned:</span>
                <span className={`font-bold ${record.hoursUsed / record.hoursAllocated >= 0.8 ? "text-amber-400" : "text-slate-200"}`}>
                  {record.hoursUsed}h / {record.hoursAllocated}h ({Math.round((record.hoursUsed / record.hoursAllocated) * 100)}%)
                </span>
              </div>
              <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                <div
                  className={`h-full ${record.hoursUsed / record.hoursAllocated >= 0.8 ? "bg-amber-500" : "bg-emerald-500"}`}
                  style={{ width: `${Math.min(100, Math.round((record.hoursUsed / record.hoursAllocated) * 100))}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* 3. SHAP EXPLAINABLE AI REASONING LAYER */}
        {shapResult && (
          <div className="p-4 rounded-xl bg-gradient-to-br from-[#121624] to-[#0E1118] border border-blue-500/20 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-400" />
                <span className="text-xs font-bold font-mono text-blue-300 uppercase tracking-wider">
                  SHAP XAI Inference Layer
                </span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-950/80 text-blue-300 border border-blue-800/40">
                Confidence: {Math.round((shapResult.predictionConfidence || 0.95) * 100)}%
              </span>
            </div>

            {/* Score Deconstruction Formula: f(x) = phi_0 + sum(phi_i) */}
            <div className="p-3 rounded-lg bg-black/40 border border-white/5 font-mono text-xs space-y-1">
              <div className="flex items-baseline justify-between">
                <span className="text-slate-400">Expected Baseline (\phi_0):</span>
                <span className="text-slate-200 font-bold">{shapResult.baseScore.toFixed(1)}</span>
              </div>
              <div className="flex items-baseline justify-between text-sm">
                <span className="text-white font-semibold">Calculated Score f(x):</span>
                <span className={`font-black text-lg ${shapResult.calculatedScore >= 80 ? "text-amber-400" : shapResult.calculatedScore < 60 ? "text-red-400" : "text-emerald-400"}`}>
                  {shapResult.calculatedScore.toFixed(1)}
                  {shapResult.model.includes("risk") ? "% Risk" : " pts"}
                </span>
              </div>
            </div>

            {/* Feature Attribution Waterfall Bars */}
            <div className="space-y-2.5">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                Additive Shapley Feature Attributions (\phi_i)
              </span>

              {shapResult.attributions.map((attr, idx) => {
                const isPositive = attr.shapValue > 0;
                const isZero = attr.shapValue === 0;

                return (
                  <div key={idx} className="p-2.5 rounded-lg bg-white/[0.02] border border-white/5 space-y-1 text-xs font-mono">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300 font-medium">{attr.feature}</span>
                      <span className={`font-bold flex items-center gap-1 ${isZero ? "text-slate-400" : isPositive ? "text-emerald-400" : "text-red-400"}`}>
                        {isPositive ? <TrendingUp className="w-3 h-3" /> : !isZero ? <TrendingDown className="w-3 h-3" /> : null}
                        {attr.shapValue > 0 ? `+${attr.shapValue.toFixed(1)}` : attr.shapValue.toFixed(1)}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 font-sans">
                      {attr.description} ({String(attr.value)})
                    </div>
                  </div>
                );
              })}
            </div>

            {/* AI Actionable Suggestions & Automated Solutions */}
            {shapResult.suggestions.length > 0 && (
              <div className="p-3 rounded-lg bg-amber-950/20 border border-amber-800/30 space-y-1.5">
                <span className="text-[10px] font-mono text-amber-400 uppercase font-bold tracking-wider">
                  AI Actionable Suggestions
                </span>
                <ul className="text-xs text-amber-200/90 space-y-1 list-disc pl-4 font-sans">
                  {shapResult.suggestions.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
            )}

            {shapResult.solutions.length > 0 && (
              <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-800/30 space-y-1.5">
                <span className="text-[10px] font-mono text-emerald-400 uppercase font-bold tracking-wider">
                  Recommended Mitigations
                </span>
                <ul className="text-xs text-emerald-200/90 space-y-1 list-disc pl-4 font-sans">
                  {shapResult.solutions.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* 4. INLINE MICRO-ACTIONS STRIP */}
        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-3">
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold">
            Operational Micro-Actions
          </span>

          <div className="grid grid-cols-2 gap-2 font-mono text-xs">
            {/* 1-Click Nudge */}
            <button
              onClick={() => handleNudgeAction("Slack")}
              className="p-2.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-slate-200 flex items-center justify-center gap-1.5 transition-colors font-medium"
            >
              <Send className="w-3.5 h-3.5 text-blue-400" />
              <span>1-Click Nudge</span>
            </button>

            {/* Instant Reassign */}
            <button
              onClick={() => setReassignModalOpen(true)}
              className="p-2.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-slate-200 flex items-center justify-center gap-1.5 transition-colors font-medium"
            >
              <UserCheck className="w-3.5 h-3.5 text-amber-400" />
              <span>Instant Reassign</span>
            </button>
          </div>

          {/* Quick Playbook Triggers */}
          <div className="pt-2 border-t border-white/5 space-y-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
              Trigger Automation Playbook
            </span>

            <div className="flex flex-col gap-1.5 font-mono text-xs">
              <button
                onClick={() => handlePlaybookAction("PLAYBOOK_WAR_ROOM_SPINUP", "Instant War Room Spin-Up")}
                className="w-full text-left p-2 rounded-lg bg-red-950/40 hover:bg-red-950/70 border border-red-800/40 text-red-300 flex items-center justify-between transition-colors"
              >
                <span>Spin up Emergency P0 War Room</span>
                <Play className="w-3 h-3 text-red-400" />
              </button>

              <button
                onClick={() => handlePlaybookAction("PLAYBOOK_VENDOR_COMPLIANCE", "Self-Healing Vendor Compliance")}
                className="w-full text-left p-2 rounded-lg bg-blue-950/40 hover:bg-blue-950/70 border border-blue-800/40 text-blue-300 flex items-center justify-between transition-colors"
              >
                <span>Dispatch Compliance Magic-Link</span>
                <Play className="w-3 h-3 text-blue-400" />
              </button>

              <button
                onClick={() => handlePlaybookAction("PLAYBOOK_BOTTLENECK_REROUTE", "Autonomous Bottleneck Re-Routing")}
                className="w-full text-left p-2 rounded-lg bg-amber-950/40 hover:bg-amber-950/70 border border-amber-800/40 text-amber-300 flex items-center justify-between transition-colors"
              >
                <span>Run Bottleneck Auto-Reroute</span>
                <Play className="w-3 h-3 text-amber-400" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 5. REASSIGN MODAL OVERLAY */}
      {reassignModalOpen && (
        <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm p-6 flex flex-col justify-center">
          <div className="bg-[#0E1118] border border-white/10 rounded-2xl p-5 space-y-4 shadow-2xl">
            <h4 className="text-sm font-bold text-white font-mono">Instant Task Reassignment</h4>
            <p className="text-xs text-slate-400">
              Select an available operational lead to balance critical track distribution:
            </p>

            <select
              value={selectedNewAssignee}
              onChange={(e) => setSelectedNewAssignee(e.target.value)}
              className="w-full p-2.5 rounded-lg bg-white/[0.04] border border-white/10 text-xs text-white font-mono"
            >
              <option value="usr-001-aadinath" className="bg-[#0A0D14]">Aadinath Achary (Executive Ops - 2 tracks)</option>
              <option value="usr-002-elena" className="bg-[#0A0D14]">Elena Ramos (Creative Delivery - 4 tracks)</option>
              <option value="usr-003-kai" className="bg-[#0A0D14]">Kai Chen (Technology Lead - 2 tracks)</option>
              <option value="usr-004-sarah" className="bg-[#0A0D14]">Sarah Jenkins (Sales - 3 tracks)</option>
            </select>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setReassignModalOpen(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-mono text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteReassign}
                className="px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold font-mono uppercase tracking-wider"
              >
                Confirm Reassign
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
