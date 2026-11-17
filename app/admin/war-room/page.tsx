"use client";

import React, { useState, useEffect } from "react";
import {
  ShieldAlert,
  AlertTriangle,
  Clock,
  UserCheck,
  CheckCircle2,
  Send,
  Radio,
  FileCheck2,
  Terminal,
  ArrowRight,
  Flame,
  Volume2,
} from "lucide-react";
import { V4_SEED_TICKETS } from "@/lib/demo/v4SeedData";

export default function WarRoomPage() {
  const [activeIncident, setActiveIncident] = useState(() =>
    V4_SEED_TICKETS.find((t) => t.priority === "P0") || V4_SEED_TICKETS[1]
  );
  const [elapsedMinutes, setElapsedMinutes] = useState(15);
  const [messages, setMessages] = useState([
    { sender: "Sarah Jenkins", role: "Sales Lead", text: "Client designers reporting asset portal CDN unreachable in New York and London.", time: "17:45 UTC" },
    { sender: "Elena Ramos", role: "Ops Lead", text: "Escalating incident to P0. Provisions made for secondary asset mirror.", time: "17:50 UTC" },
    { sender: "Aadinath Achary", role: "Incident Lead", text: "DNS propagation check running. Initiating cache flush on Cloudflare edge.", time: "17:55 UTC" },
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isResolved, setIsResolved] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Live war room ticker
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedMinutes((prev) => prev + 1);
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    const newMsg = {
      sender: "Aadinath Achary",
      role: "Super Admin / Lead",
      text: inputMessage.trim(),
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) + " UTC",
    };

    setMessages((prev) => [...prev, newMsg]);
    setInputMessage("");
  };

  const handleResolveIncident = () => {
    setIsResolved(true);
    setToast("Incident REF-2026-002 resolved! Root-cause post-mortem logged to audit ledger.");
    setTimeout(() => setToast(null), 5000);
  };

  return (
    <div className="space-y-6 pb-12 font-mono">
      {/* 1. WAR ROOM EMERGENCY STRIP */}
      <div className={`p-5 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all shadow-xl ${
        isResolved
          ? "bg-emerald-950/40 border-emerald-800/60"
          : "bg-red-950/60 border-red-800/80 animate-pulse"
      }`}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white ${
            isResolved ? "bg-emerald-600" : "bg-red-600 shadow-lg shadow-red-900/50"
          }`}>
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold tracking-widest text-red-400">
                {isResolved ? "INCIDENT RESOLVED" : "P0 CRITICAL EMERGENCY WAR ROOM"}
              </span>
              <span className="text-slate-500">•</span>
              <span className="text-xs text-white font-bold">{activeIncident.ticketRef}</span>
            </div>
            <h2 className="text-lg font-black text-white font-sans mt-0.5">
              {activeIncident.subject}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="px-3 py-1.5 rounded-xl bg-black/40 border border-white/10 text-xs">
            <span className="text-slate-400">Elapsed Time: </span>
            <strong className="text-red-400">{elapsedMinutes} minutes</strong>
          </div>

          <div className="px-3 py-1.5 rounded-xl bg-black/40 border border-white/10 text-xs">
            <span className="text-slate-400">Lead: </span>
            <strong className="text-white">Aadinath Achary</strong>
          </div>

          {!isResolved && (
            <button
              onClick={handleResolveIncident}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold uppercase tracking-wider transition-all shadow-md"
            >
              Resolve Incident
            </button>
          )}
        </div>
      </div>

      {toast && (
        <div className="p-3.5 rounded-xl bg-emerald-950/90 border border-emerald-600/60 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toast}</span>
        </div>
      )}

      {/* 2. WAR ROOM TWO-COLUMN GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (7 cols): Live Slack / Teams Bridge Stream */}
        <div className="lg:col-span-7 bg-[#0E1118] border border-white/10 rounded-2xl p-5 space-y-4 shadow-lg flex flex-col h-[520px]">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-red-400 animate-ping" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Slack Bridge: #ops-war-room
              </span>
            </div>
            <span className="text-[10px] text-slate-500">Encrypted Stream</span>
          </div>

          {/* Messages Feed */}
          <div className="flex-1 overflow-y-auto space-y-3 pr-2">
            {messages.map((m, idx) => (
              <div key={idx} className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <strong className="text-white font-bold">{m.sender}</strong>
                    <span className="text-[10px] text-slate-400">({m.role})</span>
                  </div>
                  <span className="text-[10px] text-slate-500">{m.time}</span>
                </div>
                <p className="text-xs text-slate-300 font-sans leading-relaxed">
                  {m.text}
                </p>
              </div>
            ))}
          </div>

          {/* Chat Form */}
          <form onSubmit={handleSendMessage} className="pt-3 border-t border-white/10 flex items-center gap-2">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Post directive to #ops-war-room..."
              className="flex-1 px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500 font-mono"
            />
            <button
              type="submit"
              className="p-2 rounded-xl bg-red-600 hover:bg-red-700 text-white transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* Right Column (5 cols): Incident Timeline & Root-Cause Post-Mortem */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-[#0E1118] border border-white/10 rounded-2xl p-5 space-y-4 shadow-lg">
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              Diagnostic Telemetry & Root Cause
            </span>

            <div className="space-y-2.5 text-xs">
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                <span className="text-[10px] text-slate-500 uppercase">Impacted Service</span>
                <div className="text-white font-bold">Asset CDN Distribution Pod (S3 / Fastly)</div>
              </div>

              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                <span className="text-[10px] text-slate-500 uppercase">Affected Client Accounts</span>
                <div className="text-amber-400 font-bold">Vance Global Capital, Kinetics Capital</div>
              </div>

              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                <span className="text-[10px] text-slate-500 uppercase">Identified Root Cause</span>
                <div className="text-slate-300 font-sans">
                  Edge SSL certificate rotation mismatch on secondary region origin. Failover triggered.
                </div>
              </div>
            </div>

            {/* Quick Unblocking Mitigations */}
            <div className="pt-3 border-t border-white/5 space-y-2">
              <span className="text-[10px] uppercase text-slate-400 font-bold">
                Automated Playbook Actions
              </span>
              <button
                onClick={() => {
                  setToast("Rerouted CDN origin to us-east-1 S3 mirror.");
                  setTimeout(() => setToast(null), 3500);
                }}
                className="w-full text-left p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 text-xs text-slate-200 flex items-center justify-between"
              >
                <span>Trigger S3 Asset Failover</span>
                <ArrowRight className="w-3.5 h-3.5 text-red-400" />
              </button>

              <button
                onClick={() => {
                  setToast("Dispatched client status page notification.");
                  setTimeout(() => setToast(null), 3500);
                }}
                className="w-full text-left p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 text-xs text-slate-200 flex items-center justify-between"
              >
                <span>Notify Active Clients via Status Page</span>
                <ArrowRight className="w-3.5 h-3.5 text-blue-400" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
