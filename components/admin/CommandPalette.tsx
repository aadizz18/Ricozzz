"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Command,
  ArrowRight,
  Zap,
  Terminal,
  FileSpreadsheet,
  ShieldAlert,
  Flame,
  BrainCircuit,
  Eye,
  Sliders,
  X,
} from "lucide-react";

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onToggleMode?: (mode: "executive" | "tactical") => void;
  currentMode?: "executive" | "tactical";
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onToggleMode,
  currentMode = "tactical",
}) => {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Keyboard shortcut listener for Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (isOpen) onClose();
        else {
          // Open handled by parent or custom event
          window.dispatchEvent(new CustomEvent("ricoz_open_palette"));
        }
      }
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const allCommands = [
    {
      id: "mode-executive",
      prefix: ">mode executive",
      title: "Switch to Executive View Mode",
      desc: "Abstract low-level parameters to show top-line KPIs, burn radars, and strategic waterfall charts",
      icon: Eye,
      action: () => {
        onToggleMode?.("executive");
        onClose();
      },
    },
    {
      id: "mode-tactical",
      prefix: ">mode tactical",
      title: "Switch to Tactical Operations Mode",
      desc: "Dense operational tables, raw event logs, and date-aware micro-action triggers",
      icon: Sliders,
      action: () => {
        onToggleMode?.("tactical");
        onClose();
      },
    },
    {
      id: "war-room",
      prefix: ">war-room",
      title: "Open P0 Emergency War Room",
      desc: "Incident control plane for active high-severity SLA breaches (REF-2026-002)",
      icon: ShieldAlert,
      action: () => {
        router.push("/admin/war-room");
        onClose();
      },
    },
    {
      id: "ai-studio",
      prefix: ">train-ai",
      title: "Open Model Training & SHAP AI Studio",
      desc: "Train models on pre-trained operations data, view loss curves, and examine feature attributions",
      icon: BrainCircuit,
      action: () => {
        router.push("/admin/ai-studio");
        onClose();
      },
    },
    {
      id: "analytics",
      prefix: ">analytics",
      title: "Open Data Analytics Workbench & SQL Scratchpad",
      desc: "Live SQL query executor, 4 executive visualizations, and 18:00 daily digest",
      icon: FileSpreadsheet,
      action: () => {
        router.push("/admin/analytics");
        onClose();
      },
    },
    {
      id: "export-csv",
      prefix: ">export csv",
      title: "Export Operational Dataset as CSV",
      desc: "Instant one-click tabular data export for executive reporting",
      icon: FileSpreadsheet,
      action: () => {
        window.open("/api/v1/analytics/query?format=csv", "_blank");
        onClose();
      },
    },
    {
      id: "blast-radius",
      prefix: ">blast-radius",
      title: "Simulate Operational Blast-Radius (<50ms)",
      desc: "Inspect live dependency graph trees and delay cascades",
      icon: Flame,
      action: () => {
        router.push("/admin/ai-studio?tab=blast-radius");
        onClose();
      },
    },
    {
      id: "assign-mandate",
      prefix: ">assign mandate-402",
      title: "Assign Client Mandate (cli-101-vance)",
      desc: "Update account lead or balance capacity allocation",
      icon: Zap,
      action: () => {
        router.push("/admin/clients");
        onClose();
      },
    },
    {
      id: "reassign-talent",
      prefix: ">reassign talent-12",
      title: "Autonomous Talent Rerouting",
      desc: "Rebalance task load for Elena Ramos (4 active tracks)",
      icon: Zap,
      action: () => {
        router.push("/admin/tasks");
        onClose();
      },
    },
  ];

  const filtered = allCommands.filter((c) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      c.prefix.toLowerCase().includes(q) ||
      c.title.toLowerCase().includes(q) ||
      c.desc.toLowerCase().includes(q)
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4 bg-black/80 backdrop-blur-md">
      <div className="bg-[#0A0D14] border border-white/10 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[75vh]">
        {/* Search Input Bar */}
        <div className="p-4 border-b border-white/10 flex items-center gap-3 bg-[#0E1118]">
          <Terminal className="w-5 h-5 text-red-500 shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Type a command (>assign, >export, >war-room, >mode) or search..."
            className="w-full bg-transparent text-sm text-white placeholder-slate-500 font-mono focus:outline-none"
          />
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-500 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Command List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-xs font-mono text-slate-500">
              No matching commands found. Try typing <code className="text-red-400 font-bold">&gt;</code> for prefix actions.
            </div>
          ) : (
            filtered.map((item, index) => {
              const Icon = item.icon;
              const isSelected = index === selectedIndex;

              return (
                <button
                  key={item.id}
                  onClick={item.action}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`w-full text-left p-3 rounded-xl flex items-center justify-between gap-3 transition-colors ${
                    isSelected
                      ? "bg-red-600/15 border border-red-500/30 text-white"
                      : "text-slate-300 hover:bg-white/[0.04]"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      isSelected ? "bg-red-600 text-white" : "bg-white/[0.04] text-slate-400"
                    }`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs truncate">{item.title}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-red-400 font-bold">
                          {item.prefix}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 truncate font-sans mt-0.5">
                        {item.desc}
                      </p>
                    </div>
                  </div>

                  <ArrowRight className={`w-4 h-4 shrink-0 ${isSelected ? "text-red-400" : "text-slate-600"}`} />
                </button>
              );
            })
          )}
        </div>

        {/* Footer shortcuts helper */}
        <div className="p-3 border-t border-white/5 bg-[#07090F] flex items-center justify-between text-[11px] font-mono text-slate-500 px-4">
          <div className="flex items-center gap-3">
            <span>Use <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-slate-300">↑</kbd> <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-slate-300">↓</kbd> to navigate</span>
            <span><kbd className="px-1.5 py-0.5 rounded bg-white/10 text-slate-300">Enter</kbd> to select</span>
          </div>
          <span>Mode: <strong className="text-white uppercase">{currentMode}</strong></span>
        </div>
      </div>
    </div>
  );
};
