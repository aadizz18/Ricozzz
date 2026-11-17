"use client";

import React, { useState } from "react";
import { Globe, X, ExternalLink, RefreshCw, Smartphone, Monitor, Layers, ArrowRight, Zap, CheckCircle2 } from "lucide-react";

interface LiveWebsiteOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LiveWebsiteOverlay: React.FC<LiveWebsiteOverlayProps> = ({ isOpen, onClose }) => {
  const [deviceMode, setDeviceMode] = useState<"desktop" | "mobile">("desktop");
  const [iframeUrl, setIframeUrl] = useState("/");
  const [simulatingBrief, setSimulatingBrief] = useState(false);
  const [briefSuccess, setBriefSuccess] = useState(false);

  if (!isOpen) return null;

  const funnelSteps = [
    { stage: "Tell Us", visitors: 450, dropoff: "0%", conversionRate: "100%", avgSec: 45, color: "bg-blue-500" },
    { stage: "Discover", visitors: 360, dropoff: "20%", conversionRate: "80.0%", avgSec: 85, color: "bg-indigo-500" },
    { stage: "Review", visitors: 270, dropoff: "25%", conversionRate: "60.0%", avgSec: 140, color: "bg-purple-500" },
    { stage: "Shortlist", visitors: 180, dropoff: "33%", conversionRate: "40.0%", avgSec: 180, color: "bg-pink-500" },
    { stage: "Project", visitors: 90, dropoff: "50%", conversionRate: "20.0%", avgSec: 320, color: "bg-emerald-500" },
  ];

  const handleSimulateBrief = async () => {
    try {
      setSimulatingBrief(true);
      await fetch("/api/v1/webhooks/live-brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source_origin: "ricoz-six.vercel.app",
          client_email: "marcus@vanceglobal.com",
          stage: "tell_us",
          brief_text: "Need comprehensive creative overhaul including typography, 3D brand assets, and portal kit.",
          budget_usd: 15000,
        }),
      });
      setBriefSuccess(true);
      setTimeout(() => setBriefSuccess(false), 4000);
    } catch (err) {
      console.error("Simulate brief error:", err);
    } finally {
      setSimulatingBrief(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex flex-col p-4 sm:p-6 overflow-hidden">
      {/* 1. TOP CONTROLS STRIP */}
      <div className="h-14 bg-[#0A0D14] border border-white/10 rounded-2xl px-5 flex items-center justify-between mb-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-950/70 border border-emerald-800/40 text-emerald-400 flex items-center justify-center">
            <Globe className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white font-mono">Live Website Preview & Sync Bridge</span>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                ricoz-six.vercel.app
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-mono">
              Live funnel telemetry, public inquiry auto-concierge, and iframe preview.
            </p>
          </div>
        </div>

        {/* Device Switcher & Actions */}
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-white/[0.04] border border-white/10 rounded-xl p-0.5">
            <button
              onClick={() => setDeviceMode("desktop")}
              className={`p-1.5 rounded-lg text-xs transition-colors ${
                deviceMode === "desktop" ? "bg-red-600 text-white" : "text-slate-400 hover:text-white"
              }`}
              title="Desktop View"
            >
              <Monitor className="w-4 h-4" />
            </button>
            <button
              onClick={() => setDeviceMode("mobile")}
              className={`p-1.5 rounded-lg text-xs transition-colors ${
                deviceMode === "mobile" ? "bg-red-600 text-white" : "text-slate-400 hover:text-white"
              }`}
              title="Mobile View"
            >
              <Smartphone className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={handleSimulateBrief}
            disabled={simulatingBrief}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-xs font-mono text-slate-200 transition-colors"
          >
            <Zap className={`w-3.5 h-3.5 ${simulatingBrief ? "animate-spin text-amber-400" : "text-amber-400"}`} />
            <span>Simulate Inbound Brief</span>
          </button>

          <a
            href="https://ricoz-six.vercel.app"
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 border border-white/10"
            title="Open in new window"
          >
            <ExternalLink className="w-4 h-4" />
          </a>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 hover:text-white border border-white/10"
            title="Close Preview"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {briefSuccess && (
        <div className="mb-4 p-3 rounded-xl bg-emerald-950/80 border border-emerald-600/50 text-emerald-300 text-xs font-mono flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Webhook received from live website! Brief automatically parsed, completeness score: 95%, routed to Shortlist Concierge.</span>
        </div>
      )}

      {/* 2. 5-STAGE FUNNEL TELEMETRY STRIP */}
      <div className="bg-[#0E1118] border border-white/10 rounded-2xl p-4 mb-4 shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider font-semibold flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-red-500" />
            <span>5-Stage Public Journey Funnel Telemetry (Tell Us → Discover → Review → Shortlist → Project)</span>
          </span>
          <span className="text-xs font-mono text-emerald-400 font-bold">Overall Conversion: 20.0%</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {funnelSteps.map((step, i) => (
            <div key={i} className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1 text-xs font-mono">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-semibold">{i + 1}. {step.stage}</span>
                <span className="text-slate-200 font-bold">{step.visitors}</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-emerald-400">{step.conversionRate}</span>
                <span className="text-slate-500">Drop: {step.dropoff}</span>
              </div>
              <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden mt-1">
                <div
                  className={`h-full ${step.color}`}
                  style={{ width: step.conversionRate }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. LIVE WEBSITE IFRAME PREVIEW CONTAINER */}
      <div className="flex-1 bg-[#0A0D14] border border-white/10 rounded-2xl overflow-hidden flex items-center justify-center p-2 relative">
        <div
          className={`h-full transition-all duration-300 rounded-xl overflow-hidden shadow-2xl border border-white/5 ${
            deviceMode === "mobile" ? "w-[390px]" : "w-full"
          }`}
        >
          <iframe
            src={iframeUrl}
            title="RICOZ Public Website Live Preview"
            className="w-full h-full bg-white border-0"
          />
        </div>
      </div>
    </div>
  );
};
