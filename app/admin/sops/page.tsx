"use client";

import React, { useEffect, useState } from "react";
import {
  FileText,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  BookOpen,
  Edit3,
  X,
  AlertCircle,
  Building,
  ShieldCheck,
  CheckSquare,
  Square,
  Activity,
  Copy,
  Check,
  TrendingDown,
  Sparkles,
} from "lucide-react";
import { SOP, Department } from "@/lib/admin/types";
import { adminApi } from "@/lib/admin/apiClient";

function renderMarkdownInline(text: string) {
  const parts: (string | React.ReactNode)[] = [];
  const regex = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let lastIndex = 0;
  let match;
  let key = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith("**") && token.endsWith("**")) {
      parts.push(
        <strong key={key++} className="font-bold text-white">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith("`") && token.endsWith("`")) {
      parts.push(
        <code
          key={key++}
          className="px-1.5 py-0.5 rounded bg-white/10 font-mono text-[11px] text-red-300 border border-white/5"
        >
          {token.slice(1, -1)}
        </code>
      );
    }
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }
  return parts.length > 0 ? parts : text;
}

export default function AdminSOPsPage() {
  const [sops, setSops] = useState<SOP[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDept, setSelectedDept] = useState("");
  const [search, setSearch] = useState("");
  const [activeSop, setActiveSop] = useState<SOP | null>(null);
  const [copied, setCopied] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<Record<string, Record<number, boolean>>>({
    "sop-801-deck-design": { 0: true, 1: true },
    "sop-802-brand-guide": { 0: true },
  });

  const toggleStep = (sopId: string, idx: number) => {
    setCompletedSteps((prev) => ({
      ...prev,
      [sopId]: {
        ...(prev[sopId] || {}),
        [idx]: !prev[sopId]?.[idx],
      },
    }));
  };

  const handleCopyMarkdown = (content: string) => {
    if (!content) return;
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Modals & Editing
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDept, setNewDept] = useState("");
  const [newCategory, setNewCategory] = useState("Quality Assurance");
  const [newVersion, setNewVersion] = useState("v1.0");
  const [newSummary, setNewSummary] = useState("");
  const [newContent, setNewContent] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const fetchSops = async () => {
    try {
      setLoading(true);
      const res = await adminApi.sops.list({
        departmentId: selectedDept || undefined,
        search: search || undefined,
      });
      const data = res.sops || [];
      setSops(data);
      if (data.length > 0 && (!activeSop || !data.some((s) => s.id === activeSop.id))) {
        setActiveSop(data[0]);
      }
    } catch (err: any) {
      console.warn("Error loading SOPs:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDepts = async () => {
    try {
      const res = await adminApi.departments.list();
      const d = res.departments || [];
      setDepartments(d);
      if (d.length > 0 && !newDept) {
        setNewDept(d[0].id);
      }
    } catch {
      // Non-blocking
    }
  };

  useEffect(() => {
    fetchDepts();
  }, []);

  useEffect(() => {
    fetchSops();
  }, [selectedDept, search]);

  const handleCreateSop = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSaving(true);

    try {
      const res = await adminApi.sops.create({
        title: newTitle,
        departmentId: newDept,
        category: newCategory,
        version: newVersion,
        summary: newSummary,
        contentMarkdown: newContent,
      });

      if (!res.success) {
        throw new Error((res as any).error || "Failed to create SOP");
      }

      setCreateModalOpen(false);
      setNewTitle("");
      setNewSummary("");
      setNewContent("");
      if (res.sop) {
        setActiveSop(res.sop);
      }
      await fetchSops();
      window.dispatchEvent(new Event("ricoz_admin_refresh"));
    } catch (err: any) {
      setFormError(err.message || "Error creating SOP");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* 1. TOP HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <FileText className="w-5 h-5 text-red-500" />
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white font-sans">
              Standard Operating Procedures (SOPs)
            </h2>
          </div>
          <p className="text-xs text-slate-400">
            Internal operational standards, compliance checklists, and process version control.
          </p>
        </div>

        <button
          onClick={() => setCreateModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 active:bg-red-800 text-white text-xs font-bold uppercase tracking-wider transition-all shadow-md shadow-red-900/30"
        >
          <Plus className="w-4 h-4" />
          <span>New Procedure</span>
        </button>
      </div>

      {/* 2. FILTER & SEARCH BAR */}
      <div className="bg-[#0E1118] border border-white/10 rounded-2xl p-4 shadow-lg flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 flex-1 flex-wrap">
          <div className="relative min-w-[200px] flex-1 sm:flex-initial">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search documentation..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/10 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-red-500 font-mono"
            />
          </div>

          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg bg-white/[0.04] border border-white/10 text-xs text-slate-200 font-mono focus:outline-none focus:border-red-500"
          >
            <option value="" className="bg-[#0A0D14]">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id} className="bg-[#0A0D14]">{d.name}</option>
            ))}
          </select>
        </div>

        <div className="text-xs font-mono text-slate-400">
          Showing <span className="text-white font-bold">{sops.length}</span> standardized SOPs
        </div>
      </div>

      {/* 3. TWO-COLUMN SPLIT: DIRECTORY & READER */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (5 cols): SOP List */}
        <div className="lg:col-span-5 space-y-3">
          {loading ? (
            <div className="h-64 rounded-2xl bg-white/[0.02] border border-white/5 animate-pulse" />
          ) : sops.length === 0 ? (
            <div className="bg-[#0E1118] border border-white/10 rounded-2xl p-8 text-center text-xs text-slate-400">
              No SOPs found matching filters.
            </div>
          ) : (
            sops.map((s) => {
              const isSelected = activeSop?.id === s.id;
              const drift = (s as any).driftScore ?? 4.2;
              return (
                <div
                  key={s.id}
                  onClick={() => setActiveSop(s)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-2.5 ${
                    isSelected
                      ? "bg-[#141924] border-red-500/60 shadow-lg"
                      : "bg-[#0E1118] border-white/10 hover:border-white/20"
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] font-mono">
                    <span className="text-slate-400 uppercase font-bold">
                      {s.departmentName || (s as any).department_name}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-mono border ${
                          drift > 3
                            ? "bg-amber-950/60 text-amber-300 border-amber-800/40"
                            : "bg-emerald-950/60 text-emerald-300 border-emerald-800/40"
                        }`}
                      >
                        Drift: {drift}%
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-white/[0.05] border border-white/10 text-red-400 font-bold">
                        {s.version}
                      </span>
                    </div>
                  </div>

                  <h3 className="text-sm font-bold text-white tracking-tight">
                    {s.title}
                  </h3>

                  <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                    {s.summary}
                  </p>

                  <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] font-mono text-slate-500">
                    <span>Category: {s.category}</span>
                    <span>Reviewed: {s.lastReviewedAt ? new Date(s.lastReviewedAt).toLocaleDateString() : "Active"}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Column (7 cols): Document Reader */}
        <div className="lg:col-span-7">
          {activeSop ? (
            <div className="bg-[#0E1118] border border-white/10 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
              {/* Reader Header */}
              <div className="space-y-4 pb-5 border-b border-white/10">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-white/[0.04] border border-white/10 text-slate-300">
                      {activeSop.departmentName || (activeSop as any).department_name}
                    </span>
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-red-950/80 text-red-400 border border-red-800/40">
                      {activeSop.version}
                    </span>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                        ((activeSop as any).driftScore ?? 4.2) > 3
                          ? "bg-amber-950/60 text-amber-300 border-amber-800/40"
                          : "bg-emerald-950/60 text-emerald-300 border-emerald-800/40"
                      }`}
                    >
                      Process Drift: {(activeSop as any).driftScore ?? 4.2}%
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">
                      Category: {activeSop.category}
                    </span>
                  </div>

                  <button
                    onClick={() =>
                      handleCopyMarkdown(
                        activeSop.contentMarkdown ||
                          (activeSop as any).content_markdown ||
                          (activeSop as any).markdownBody ||
                          ""
                      )
                    }
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-[11px] text-slate-300 font-mono transition-all"
                    title="Copy Markdown"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-400" />
                        <span>Copy SOP</span>
                      </>
                    )}
                  </button>
                </div>

                <h1 className="text-xl sm:text-2xl font-black text-white font-sans tracking-tight">
                  {activeSop.title}
                </h1>

                <p className="text-xs text-slate-300 leading-relaxed italic bg-white/[0.02] p-3 rounded-lg border border-white/5 font-sans">
                  {activeSop.summary}
                </p>

                <div className="flex items-center gap-4 text-[10px] font-mono text-slate-500">
                  <span>Author / Owner: <strong className="text-slate-300">{activeSop.ownerName || (activeSop as any).owner_name || "Elena Ramos"}</strong></span>
                  <span>Last Reviewed: <strong className="text-slate-300">{activeSop.lastReviewedAt ? new Date(activeSop.lastReviewedAt).toLocaleDateString() : "Recent"}</strong></span>
                </div>
              </div>

              {/* Reader Content Markdown Render */}
              <div className="space-y-5">
                {(() => {
                  const raw: string =
                    activeSop.contentMarkdown ||
                    (activeSop as any).content_markdown ||
                    (activeSop as any).markdownBody ||
                    "";

                  if (!raw.trim()) {
                    return <p className="text-xs text-slate-500 italic">No document body content available.</p>;
                  }

                  const blocks: string[] = raw.split("\n\n");
                  let globalStepCounter = 0;

                  return blocks.map((block: string, bIdx: number) => {
                    const trimmed = block.trim();

                    // Heading Level 2
                    if (trimmed.startsWith("## ")) {
                      return (
                        <h3 key={bIdx} className="text-sm font-bold text-white uppercase tracking-wider font-mono pt-2 pb-1 border-b border-white/10">
                          {trimmed.replace(/^##\s+/, "")}
                        </h3>
                      );
                    }

                    // Heading Level 3
                    if (trimmed.startsWith("### ")) {
                      return (
                        <h4 key={bIdx} className="text-xs font-bold text-red-400 uppercase tracking-wider font-mono pt-2 pb-1">
                          {trimmed.replace(/^###\s+/, "")}
                        </h4>
                      );
                    }

                    // Checklist / Ordered items: lines starting with 1., 2., -, or - [ ]
                    const lines = trimmed.split("\n");
                    const isListBlock = lines.every((l: string) => /^[0-9]+\.\s+|^-\s+|^-\s*\[[ xX]\]\s*/.test(l.trim()));

                    if (isListBlock) {
                      const totalSteps = lines.length;
                      const activeSopState = completedSteps[activeSop.id] || {};
                      const completedCount = lines.filter((_: string, idx: number) => activeSopState[idx]).length;

                      return (
                        <div key={bIdx} className="space-y-3 bg-white/[0.02] border border-white/10 rounded-xl p-4">
                          <div className="flex items-center justify-between text-xs font-mono">
                            <span className="text-slate-400 flex items-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5 text-red-400" />
                              Interactive Checklist Verification
                            </span>
                            <span className="text-slate-300 font-bold">
                              {completedCount} / {totalSteps} Cleared ({Math.round((completedCount / totalSteps) * 100)}%)
                            </span>
                          </div>

                          <div className="w-full h-1.5 bg-black/40 rounded-full overflow-hidden border border-white/5">
                            <div
                              className="h-full bg-gradient-to-r from-red-600 to-emerald-500 transition-all duration-300"
                              style={{ width: `${(completedCount / totalSteps) * 100}%` }}
                            />
                          </div>

                          <div className="space-y-2 pt-1">
                            {lines.map((line: string, lIdx: number) => {
                              const stepIdx = lIdx;
                              const isChecked = Boolean(activeSopState[stepIdx]);
                              const cleanText = line.replace(/^[0-9]+\.\s+|^-\s+|^-\s*\[[ xX]\]\s*/, "");

                              return (
                                <div
                                  key={lIdx}
                                  onClick={() => toggleStep(activeSop.id, stepIdx)}
                                  className={`flex items-start gap-3 p-2.5 rounded-lg border transition-all cursor-pointer ${
                                    isChecked
                                      ? "bg-emerald-950/20 border-emerald-800/40 text-slate-300"
                                      : "bg-white/[0.02] border-white/5 hover:border-white/10 text-slate-200"
                                  }`}
                                >
                                  <div className="mt-0.5">
                                    {isChecked ? (
                                      <CheckSquare className="w-4 h-4 text-emerald-400" />
                                    ) : (
                                      <Square className="w-4 h-4 text-slate-500" />
                                    )}
                                  </div>
                                  <div className={`text-xs leading-relaxed flex-1 ${isChecked ? "line-through text-slate-400" : ""}`}>
                                    {renderMarkdownInline(cleanText)}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    }

                    // Standard paragraph
                    return (
                      <p key={bIdx} className="text-xs text-slate-300 leading-relaxed font-sans">
                        {renderMarkdownInline(trimmed)}
                      </p>
                    );
                  });
                })()}
              </div>
            </div>
          ) : (
            <div className="bg-[#0E1118] border border-white/10 rounded-2xl p-12 text-center text-xs text-slate-500">
              Select an operational SOP from the directory to review instructions.
            </div>
          )}
        </div>
      </div>

      {/* 4. CREATE SOP MODAL */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-[#0E1118] border border-white/10 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-base font-bold text-white">Author Standard Operating Procedure</h3>
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

            <form onSubmit={handleCreateSop} className="space-y-4">
              <div>
                <label className="block text-xs font-mono font-medium text-slate-300 mb-1">
                  Procedure Title *
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Enterprise Client Escrow Milestone Approval Procedure"
                  className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500 font-mono"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
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
                    Category
                  </label>
                  <input
                    type="text"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    placeholder="e.g. Quality Assurance"
                    className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono font-medium text-slate-300 mb-1">
                    Version
                  </label>
                  <input
                    type="text"
                    value={newVersion}
                    onChange={(e) => setNewVersion(e.target.value)}
                    placeholder="e.g. v1.0"
                    className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono font-medium text-slate-300 mb-1">
                  Executive Summary *
                </label>
                <textarea
                  rows={2}
                  required
                  value={newSummary}
                  onChange={(e) => setNewSummary(e.target.value)}
                  placeholder="One or two sentences explaining the scope and objective of this SOP..."
                  className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-mono font-medium text-slate-300 mb-1">
                  Content Body (Markdown Supported) *
                </label>
                <textarea
                  rows={8}
                  required
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="### 1. Purpose&#10;&#10;Detailed instructions, checklists, and escalation paths..."
                  className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500 font-mono"
                />
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
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold font-mono uppercase tracking-wider disabled:opacity-50"
                >
                  {saving ? "Publishing..." : "Publish SOP"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
