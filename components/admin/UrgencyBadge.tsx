"use client";

import React from "react";
import { AlertCircle, Clock, CheckCircle2, ShieldAlert } from "lucide-react";

interface UrgencyBadgeProps {
  dueDate: string | Date | undefined;
  status: string;
  isBlocked?: boolean;
  className?: string;
}

/**
 * FR-02: Date-Aware Urgency Engine Status Badge
 * - OVERDUE: dueDate < NOW() -> Hex #DC2626 (Red)
 * - AT RISK: dueDate <= NOW() + 48 Hours -> Hex #D97706 (Amber)
 * - ON TRACK: dueDate > NOW() + 48 Hours -> Hex #64748B (Slate)
 * - BLOCKED: Dependency lock flagged -> Hex #7C3AED (Purple)
 */
export const UrgencyBadge: React.FC<UrgencyBadgeProps> = ({
  dueDate,
  status,
  isBlocked = false,
  className = "",
}) => {
  if (status === "completed") {
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 ${className}`}>
        <CheckCircle2 className="w-3 h-3" />
        <span>COMPLETED</span>
      </span>
    );
  }

  if (isBlocked || status === "blocked") {
    return (
      <span
        style={{ borderColor: "#7C3AED", color: "#C4B5FD", backgroundColor: "rgba(124, 58, 237, 0.15)" }}
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider border ${className}`}
      >
        <ShieldAlert className="w-3 h-3 text-[#A78BFA]" />
        <span>BLOCKED</span>
      </span>
    );
  }

  if (!dueDate) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-slate-800/80 text-slate-400 border border-slate-700/60">
        NO DUE DATE
      </span>
    );
  }

  const dueTimestamp = new Date(dueDate).getTime();
  const now = Date.now();
  const diffHours = (dueTimestamp - now) / (1000 * 60 * 60);

  if (isNaN(dueTimestamp) || dueTimestamp < now) {
    // OVERDUE
    return (
      <span
        style={{ borderColor: "#DC2626", color: "#FCA5A5", backgroundColor: "rgba(220, 38, 38, 0.2)" }}
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider border ${className}`}
      >
        <AlertCircle className="w-3 h-3 text-[#DC2626]" />
        <span>OVERDUE</span>
      </span>
    );
  }

  if (diffHours <= 48) {
    // AT RISK (<= 48h)
    return (
      <span
        style={{ borderColor: "#D97706", color: "#FCD34D", backgroundColor: "rgba(217, 119, 6, 0.2)" }}
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider border ${className}`}
      >
        <Clock className="w-3 h-3 text-[#D97706]" />
        <span>AT RISK ({Math.max(1, Math.round(diffHours))}H)</span>
      </span>
    );
  }

  // ON TRACK (> 48h)
  return (
    <span
      style={{ borderColor: "#64748B", color: "#94A3B8", backgroundColor: "rgba(100, 116, 139, 0.15)" }}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider border ${className}`}
    >
      <Clock className="w-3 h-3 text-[#64748B]" />
      <span>ON TRACK</span>
    </span>
  );
};
