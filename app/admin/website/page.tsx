"use client";

import React, { useEffect, useState } from "react";
import {
  Globe,
  Inbox,
  Layout,
  HelpCircle,
  Quote,
  Settings,
  Search,
  Plus,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  Star,
  ArrowRight,
  ExternalLink,
  Clock,
  Building,
  Mail,
  User,
  Filter,
} from "lucide-react";
import { adminApi } from "@/lib/admin/apiClient";

export default function AdminWebsitePage() {
  const [activeTab, setActiveTab] = useState<"enquiries" | "sections" | "faqs" | "testimonials" | "settings">("enquiries");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Data States
  const [enquiries, setEnquiries] = useState<any[]>([]);
  const [enquiryStatusFilter, setEnquiryStatusFilter] = useState("all");
  const [enquirySearch, setEnquirySearch] = useState("");
  const [selectedEnquiry, setSelectedEnquiry] = useState<any | null>(null);

  const [sections, setSections] = useState<any[]>([]);
  const [editingSection, setEditingSection] = useState<any | null>(null);

  const [faqs, setFaqs] = useState<any[]>([]);
  const [showAddFaqModal, setShowAddFaqModal] = useState(false);
  const [newFaqQuestion, setNewFaqQuestion] = useState("");
  const [newFaqAnswer, setNewFaqAnswer] = useState("");
  const [newFaqCategory, setNewFaqCategory] = useState("general");

  const [testimonials, setTestimonials] = useState<any[]>([]);
  const [showAddTestimonialModal, setShowAddTestimonialModal] = useState(false);
  const [newTestimonialName, setNewTestimonialName] = useState("");
  const [newTestimonialCompany, setNewTestimonialCompany] = useState("");
  const [newTestimonialRole, setNewTestimonialRole] = useState("");
  const [newTestimonialQuote, setNewTestimonialQuote] = useState("");
  const [newTestimonialRating, setNewTestimonialRating] = useState(5);

  const [siteSettings, setSiteSettings] = useState<Record<string, any>>({});
  const [heroTalentCount, setHeroTalentCount] = useState(57);
  const [heroDisciplinesCount, setHeroDisciplinesCount] = useState(19);

  const fetchEnquiries = async () => {
    try {
      const res = await adminApi.website.getEnquiries({
        status: enquiryStatusFilter !== "all" ? enquiryStatusFilter : undefined,
        search: enquirySearch || undefined,
      });
      setEnquiries(res.enquiries || []);
    } catch (err: any) {
      console.error("Fetch enquiries error:", err);
    }
  };

  const fetchSections = async () => {
    try {
      const res = await adminApi.website.getSections();
      setSections(res.sections || []);
    } catch (err: any) {
      console.error("Fetch sections error:", err);
    }
  };

  const fetchFaqs = async () => {
    try {
      const res = await adminApi.website.getFaqs();
      setFaqs(res.faqs || []);
    } catch (err: any) {
      console.error("Fetch FAQs error:", err);
    }
  };

  const fetchTestimonials = async () => {
    try {
      const res = await adminApi.website.getTestimonials();
      setTestimonials(res.testimonials || []);
    } catch (err: any) {
      console.error("Fetch testimonials error:", err);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await adminApi.website.getSettings();
      const s = res.settings || {};
      setSiteSettings(s);
      if (s.hero_metrics?.value) {
        setHeroTalentCount(s.hero_metrics.value.talentCount || 57);
        setHeroDisciplinesCount(s.hero_metrics.value.disciplinesCount || 19);
      }
    } catch (err: any) {
      console.error("Fetch settings error:", err);
    }
  };

  const loadAll = async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([
        fetchEnquiries(),
        fetchSections(),
        fetchFaqs(),
        fetchTestimonials(),
        fetchSettings(),
      ]);
    } catch (err: any) {
      setError(err.message || "Failed to load website management data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    fetchEnquiries();
  }, [enquiryStatusFilter, enquirySearch]);

  const handleUpdateEnquiryStatus = async (id: string, nextStatus: string) => {
    try {
      await adminApi.website.updateEnquiry(id, nextStatus);
      setSuccessMsg(`Inquiry status updated to ${nextStatus}.`);
      await fetchEnquiries();
    } catch (err: any) {
      setError(err.message || "Failed to update status.");
    }
  };

  const handleDeleteEnquiry = async (id: string) => {
    if (!confirm("Are you sure you want to delete this enquiry?")) return;
    try {
      await adminApi.website.deleteEnquiry(id);
      setSuccessMsg("Enquiry removed.");
      if (selectedEnquiry?.id === id) setSelectedEnquiry(null);
      await fetchEnquiries();
    } catch (err: any) {
      setError(err.message || "Failed to delete enquiry.");
    }
  };

  const handleToggleSectionPublish = async (section: any) => {
    try {
      const next = !section.is_published;
      await adminApi.website.updateSection(section.id, { isPublished: next });
      setSuccessMsg(`Section "${section.title}" is now ${next ? "Published" : "Draft"}.`);
      await fetchSections();
    } catch (err: any) {
      setError(err.message || "Failed to toggle publication status.");
    }
  };

  const handleSaveSectionTitle = async (section: any, title: string, subtitle: string) => {
    try {
      await adminApi.website.updateSection(section.id, { title, subtitle });
      setSuccessMsg("Section details saved.");
      setEditingSection(null);
      await fetchSections();
    } catch (err: any) {
      setError(err.message || "Failed to save section.");
    }
  };

  const handleToggleFaqPublish = async (faq: any) => {
    try {
      const next = !faq.is_published;
      await adminApi.website.updateFaq(faq.id, { isPublished: next });
      setSuccessMsg(`FAQ is now ${next ? "Published" : "Draft"}.`);
      await fetchFaqs();
    } catch (err: any) {
      setError(err.message || "Failed to toggle FAQ.");
    }
  };

  const handleCreateFaq = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await adminApi.website.createFaq({
        question: newFaqQuestion,
        answer: newFaqAnswer,
        category: newFaqCategory,
        isPublished: true,
      });
      setShowAddFaqModal(false);
      setNewFaqQuestion("");
      setNewFaqAnswer("");
      setSuccessMsg("FAQ published successfully.");
      await fetchFaqs();
    } catch (err: any) {
      setError(err.message || "Failed to create FAQ.");
    }
  };

  const handleDeleteFaq = async (id: string) => {
    if (!confirm("Delete this FAQ?")) return;
    try {
      await adminApi.website.deleteFaq(id);
      setSuccessMsg("FAQ removed.");
      await fetchFaqs();
    } catch (err: any) {
      setError(err.message || "Failed to delete FAQ.");
    }
  };

  const handleToggleTestimonialPublish = async (t: any) => {
    try {
      const next = !t.is_published;
      await adminApi.website.updateTestimonial(t.id, { isPublished: next });
      setSuccessMsg(`Testimonial is now ${next ? "Published" : "Draft"}.`);
      await fetchTestimonials();
    } catch (err: any) {
      setError(err.message || "Failed to toggle testimonial.");
    }
  };

  const handleCreateTestimonial = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await adminApi.website.createTestimonial({
        clientName: newTestimonialName,
        company: newTestimonialCompany,
        role: newTestimonialRole,
        quote: newTestimonialQuote,
        rating: newTestimonialRating,
        isPublished: true,
        isFeatured: true,
      });
      setShowAddTestimonialModal(false);
      setNewTestimonialName("");
      setNewTestimonialCompany("");
      setNewTestimonialRole("");
      setNewTestimonialQuote("");
      setSuccessMsg("Testimonial published successfully.");
      await fetchTestimonials();
    } catch (err: any) {
      setError(err.message || "Failed to create testimonial.");
    }
  };

  const handleDeleteTestimonial = async (id: string) => {
    if (!confirm("Delete this testimonial?")) return;
    try {
      await adminApi.website.deleteTestimonial(id);
      setSuccessMsg("Testimonial removed.");
      await fetchTestimonials();
    } catch (err: any) {
      setError(err.message || "Failed to delete testimonial.");
    }
  };

  const handleSaveHeroMetrics = async () => {
    try {
      const val = {
        talentCount: Number(heroTalentCount),
        disciplinesCount: Number(heroDisciplinesCount),
        matchRate: "98%",
        satisfactionRate: "99.4%",
      };
      await adminApi.website.updateSetting("hero_metrics", val);
      setSuccessMsg("Homepage hero metrics updated.");
      await fetchSettings();
    } catch (err: any) {
      setError(err.message || "Failed to update hero metrics.");
    }
  };

  const statusStyles: Record<string, string> = {
    new: "bg-red-950/80 text-red-400 border-red-800/60",
    reviewed: "bg-blue-950/80 text-blue-400 border-blue-800/60",
    contacted: "bg-amber-950/80 text-amber-400 border-amber-800/60",
    converted: "bg-emerald-950/80 text-emerald-400 border-emerald-800/60",
    archived: "bg-slate-800/80 text-slate-400 border-slate-700",
  };

  return (
    <div className="space-y-6 pb-12">
      {/* 1. TOP HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Globe className="w-5 h-5 text-red-500" />
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white font-sans">
              Website Content & Enquiries CMS
            </h2>
          </div>
          <p className="text-xs text-slate-400">
            Publish dynamic homepage sections, review visitor mandate briefings, manage FAQs, and update social proof.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-slate-300 hover:text-white text-xs font-mono transition-colors"
          >
            <span>View Live Website</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* FEEDBACK BANNERS */}
      {error && (
        <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-800/60 text-xs text-red-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-white text-xs font-mono">Dismiss</button>
        </div>
      )}

      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-xs text-emerald-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-400 hover:text-white text-xs font-mono">Dismiss</button>
        </div>
      )}

      {/* 2. TAB NAVIGATION */}
      <div className="flex items-center gap-1 p-1 bg-[#0E1118] border border-white/10 rounded-2xl overflow-x-auto">
        <button
          onClick={() => setActiveTab("enquiries")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono transition-all ${
            activeTab === "enquiries"
              ? "bg-red-600 text-white font-bold shadow-md"
              : "text-slate-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <Inbox className="w-4 h-4" />
          <span>Client Inquiries ({enquiries.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("sections")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono transition-all ${
            activeTab === "sections"
              ? "bg-red-600 text-white font-bold shadow-md"
              : "text-slate-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <Layout className="w-4 h-4" />
          <span>Homepage Content ({sections.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("faqs")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono transition-all ${
            activeTab === "faqs"
              ? "bg-red-600 text-white font-bold shadow-md"
              : "text-slate-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <HelpCircle className="w-4 h-4" />
          <span>FAQs ({faqs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("testimonials")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono transition-all ${
            activeTab === "testimonials"
              ? "bg-red-600 text-white font-bold shadow-md"
              : "text-slate-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <Quote className="w-4 h-4" />
          <span>Testimonials ({testimonials.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("settings")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono transition-all ${
            activeTab === "settings"
              ? "bg-red-600 text-white font-bold shadow-md"
              : "text-slate-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Site Settings</span>
        </button>
      </div>

      {/* 3. TAB 1: CLIENT INQUIRIES QUEUE */}
      {activeTab === "enquiries" && (
        <div className="space-y-4">
          <div className="bg-[#0E1118] border border-white/10 rounded-2xl p-4 shadow-lg flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 flex-1 flex-wrap">
              <div className="relative min-w-[220px] flex-1 sm:flex-initial">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={enquirySearch}
                  onChange={(e) => setEnquirySearch(e.target.value)}
                  placeholder="Search inquiries by name, email, company..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/10 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-red-500 font-mono"
                />
              </div>

              <select
                value={enquiryStatusFilter}
                onChange={(e) => setEnquiryStatusFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg bg-white/[0.04] border border-white/10 text-xs text-slate-200 font-mono focus:outline-none focus:border-red-500"
              >
                <option value="all" className="bg-[#0A0D14]">All Statuses</option>
                <option value="new" className="bg-[#0A0D14]">New</option>
                <option value="reviewed" className="bg-[#0A0D14]">Reviewed</option>
                <option value="contacted" className="bg-[#0A0D14]">Contacted</option>
                <option value="converted" className="bg-[#0A0D14]">Converted to Client</option>
                <option value="archived" className="bg-[#0A0D14]">Archived</option>
              </select>
            </div>

            <div className="text-xs font-mono text-slate-400">
              Showing <span className="text-white font-bold">{enquiries.length}</span> incoming inquiries
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className={selectedEnquiry ? "lg:col-span-7" : "lg:col-span-12"}>
              <div className="bg-[#0E1118] border border-white/10 rounded-2xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#07090F] text-slate-400 font-mono uppercase text-[10px] tracking-wider border-b border-white/10">
                      <tr>
                        <th className="py-3 px-4">Prospect</th>
                        <th className="py-3 px-4">Mandate Scope</th>
                        <th className="py-3 px-4">Timeline</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-slate-300">
                      {enquiries.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-slate-500 font-mono text-xs">
                            No incoming website enquiries found matching filters.
                          </td>
                        </tr>
                      ) : (
                        enquiries.map((enq) => {
                          const badge = statusStyles[enq.status] || "bg-slate-800 text-slate-400";
                          const isSelected = selectedEnquiry?.id === enq.id;
                          return (
                            <tr
                              key={enq.id}
                              onClick={() => setSelectedEnquiry(enq)}
                              className={`cursor-pointer transition-colors ${
                                isSelected ? "bg-white/[0.06]" : "hover:bg-white/[0.02]"
                              }`}
                            >
                              <td className="py-3 px-4">
                                <div className="font-bold text-white">{enq.full_name}</div>
                                <div className="text-[10px] font-mono text-slate-400">{enq.company}</div>
                                <div className="text-[10px] font-mono text-slate-500">{enq.email}</div>
                              </td>
                              <td className="py-3 px-4 font-mono text-slate-300">
                                <div className="font-semibold text-white">{enq.mandate_type}</div>
                                <div className="text-[10px] text-slate-500 truncate max-w-[200px]">{enq.project_brief}</div>
                              </td>
                              <td className="py-3 px-4 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                                {enq.timeline}
                              </td>
                              <td className="py-3 px-4">
                                <span className={`text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${badge}`}>
                                  {enq.status}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-right">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteEnquiry(enq.id);
                                  }}
                                  className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-white/5 transition-colors"
                                  title="Delete inquiry"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Inquiry Detail Drawer */}
            {selectedEnquiry && (
              <div className="lg:col-span-5 bg-[#0E1118] border border-white/10 rounded-2xl p-6 shadow-2xl space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <div>
                    <span className="text-[10px] font-mono uppercase text-slate-500">Inquiry Dossier</span>
                    <h3 className="text-base font-bold text-white">{selectedEnquiry.full_name}</h3>
                  </div>
                  <button
                    onClick={() => setSelectedEnquiry(null)}
                    className="p-1 rounded-lg text-slate-500 hover:text-white"
                  >
                    <XCircle className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <span className="text-[10px] font-mono text-slate-500 uppercase block">Company & Email</span>
                    <div className="font-bold text-white text-sm">{selectedEnquiry.company}</div>
                    <a href={`mailto:${selectedEnquiry.email}`} className="text-red-400 font-mono hover:underline">
                      {selectedEnquiry.email}
                    </a>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/5">
                    <div>
                      <span className="text-[10px] font-mono text-slate-500 uppercase block">Mandate Type</span>
                      <span className="font-mono text-slate-200">{selectedEnquiry.mandate_type}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-mono text-slate-500 uppercase block">Expected Timeline</span>
                      <span className="font-mono text-slate-200">{selectedEnquiry.timeline}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-white/5">
                    <span className="text-[10px] font-mono text-slate-500 uppercase block mb-1">Project Brief Details</span>
                    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 text-slate-300 leading-relaxed font-sans text-xs">
                      {selectedEnquiry.project_brief}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-white/5">
                    <span className="text-[10px] font-mono text-slate-500 uppercase block mb-1.5">Pipeline Status Transition</span>
                    <div className="flex flex-wrap gap-1.5">
                      {["new", "reviewed", "contacted", "converted", "archived"].map((st) => (
                        <button
                          key={st}
                          onClick={() => handleUpdateEnquiryStatus(selectedEnquiry.id, st)}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-mono uppercase tracking-wider transition-all border ${
                            selectedEnquiry.status === st
                              ? "bg-red-600 text-white font-bold border-red-500"
                              : "bg-white/[0.04] text-slate-400 hover:text-white border-white/10"
                          }`}
                        >
                          {st}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. TAB 2: HOMEPAGE SECTIONS */}
      {activeTab === "sections" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sections.map((sec) => (
              <div
                key={sec.id}
                className="bg-[#0E1118] border border-white/10 rounded-2xl p-6 shadow-xl space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-white/[0.04] text-slate-400 border border-white/10">
                      {sec.section_key}
                    </span>
                    <button
                      onClick={() => handleToggleSectionPublish(sec)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider border transition-colors ${
                        sec.is_published
                          ? "bg-emerald-950/80 text-emerald-400 border-emerald-800/60"
                          : "bg-slate-800 text-slate-400 border-slate-700"
                      }`}
                    >
                      {sec.is_published ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                      <span>{sec.is_published ? "Published" : "Draft"}</span>
                    </button>
                  </div>

                  <h3 className="text-base font-bold text-white tracking-tight">{sec.title}</h3>
                  {sec.subtitle && (
                    <p className="text-xs font-mono text-red-400 uppercase tracking-wider">{sec.subtitle}</p>
                  )}
                  <p className="text-xs text-slate-400 leading-relaxed line-clamp-3">
                    {sec.content_payload?.description || sec.content_payload?.headline || "Dynamic JSON content payload configured."}
                  </p>
                </div>

                <div className="pt-3 border-t border-white/5 flex items-center justify-between text-[11px] font-mono text-slate-500">
                  <span>Page: {sec.page_slug}</span>
                  <button
                    onClick={() => setEditingSection(sec)}
                    className="inline-flex items-center gap-1 text-slate-300 hover:text-white"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit Copy</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Edit Section Modal */}
          {editingSection && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
              <div className="bg-[#0E1118] border border-white/10 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <h3 className="text-base font-bold text-white">Edit Website Section: {editingSection.section_key}</h3>
                  <button onClick={() => setEditingSection(null)} className="p-1 text-slate-400 hover:text-white">
                    <XCircle className="w-5 h-5" />
                  </button>
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const form = e.target as HTMLFormElement;
                    const title = (form.elements.namedItem("secTitle") as HTMLInputElement).value;
                    const subtitle = (form.elements.namedItem("secSubtitle") as HTMLInputElement).value;
                    handleSaveSectionTitle(editingSection, title, subtitle);
                  }}
                  className="space-y-4"
                >
                  <div>
                    <label className="block text-xs font-mono font-medium text-slate-300 mb-1">Section Title *</label>
                    <input
                      name="secTitle"
                      defaultValue={editingSection.title}
                      required
                      className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-xs text-white font-mono focus:outline-none focus:border-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono font-medium text-slate-300 mb-1">Eyebrow / Subtitle</label>
                    <input
                      name="secSubtitle"
                      defaultValue={editingSection.subtitle || ""}
                      className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-xs text-white font-mono focus:outline-none focus:border-red-500"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
                    <button
                      type="button"
                      onClick={() => setEditingSection(null)}
                      className="px-4 py-2 rounded-xl text-xs font-mono text-slate-400 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold font-mono uppercase tracking-wider"
                    >
                      Save Changes
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 5. TAB 3: FAQS CATALOGUE */}
      {activeTab === "faqs" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-white/10">
            <span className="text-xs font-mono text-slate-400 uppercase tracking-wider font-semibold">
              Public FAQ Catalogue ({faqs.length})
            </span>
            <button
              onClick={() => setShowAddFaqModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold font-mono uppercase tracking-wider transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add FAQ</span>
            </button>
          </div>

          <div className="space-y-3">
            {faqs.map((faq) => (
              <div
                key={faq.id}
                className="bg-[#0E1118] border border-white/10 rounded-2xl p-5 shadow-lg space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-white/[0.04] text-slate-400 border border-white/10">
                      {faq.category}
                    </span>
                    <h4 className="text-sm font-bold text-white">{faq.question}</h4>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleFaqPublish(faq)}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider border ${
                        faq.is_published
                          ? "bg-emerald-950/80 text-emerald-400 border-emerald-800/60"
                          : "bg-slate-800 text-slate-400 border-slate-700"
                      }`}
                    >
                      {faq.is_published ? "Published" : "Draft"}
                    </button>
                    <button
                      onClick={() => handleDeleteFaq(faq.id)}
                      className="p-1 rounded text-slate-500 hover:text-red-400 hover:bg-white/5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <p className="text-xs text-slate-300 font-sans leading-relaxed pt-1">
                  {faq.answer}
                </p>
              </div>
            ))}
          </div>

          {/* Add FAQ Modal */}
          {showAddFaqModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
              <div className="bg-[#0E1118] border border-white/10 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <h3 className="text-base font-bold text-white">Add Frequently Asked Question</h3>
                  <button onClick={() => setShowAddFaqModal(false)} className="p-1 text-slate-400 hover:text-white">
                    <XCircle className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleCreateFaq} className="space-y-4">
                  <div>
                    <label className="block text-xs font-mono font-medium text-slate-300 mb-1">Category</label>
                    <select
                      value={newFaqCategory}
                      onChange={(e) => setNewFaqCategory(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-xs text-white font-mono focus:outline-none focus:border-red-500"
                    >
                      <option value="general" className="bg-[#0A0D14]">General</option>
                      <option value="matching" className="bg-[#0A0D14]">Matching</option>
                      <option value="engagement" className="bg-[#0A0D14]">Engagement</option>
                      <option value="suitability" className="bg-[#0A0D14]">Suitability</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-mono font-medium text-slate-300 mb-1">Question *</label>
                    <input
                      required
                      value={newFaqQuestion}
                      onChange={(e) => setNewFaqQuestion(e.target.value)}
                      placeholder="e.g. Can we invite multiple specialists?"
                      className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-xs text-white font-mono focus:outline-none focus:border-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono font-medium text-slate-300 mb-1">Answer *</label>
                    <textarea
                      required
                      rows={4}
                      value={newFaqAnswer}
                      onChange={(e) => setNewFaqAnswer(e.target.value)}
                      placeholder="Detailed explanation displayed on the public FAQ accordion..."
                      className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-xs text-white font-mono focus:outline-none focus:border-red-500"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
                    <button
                      type="button"
                      onClick={() => setShowAddFaqModal(false)}
                      className="px-4 py-2 rounded-xl text-xs font-mono text-slate-400 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold font-mono uppercase tracking-wider"
                    >
                      Publish FAQ
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 6. TAB 4: TESTIMONIALS */}
      {activeTab === "testimonials" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-white/10">
            <span className="text-xs font-mono text-slate-400 uppercase tracking-wider font-semibold">
              Public Testimonials & Social Proof ({testimonials.length})
            </span>
            <button
              onClick={() => setShowAddTestimonialModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold font-mono uppercase tracking-wider transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Testimonial</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {testimonials.map((t) => (
              <div
                key={t.id}
                className="bg-[#0E1118] border border-white/10 rounded-2xl p-5 shadow-xl space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-amber-400">
                      {[...Array(t.rating || 5)].map((_, i) => (
                        <Star key={i} className="w-3.5 h-3.5 fill-amber-400" />
                      ))}
                    </div>
                    <button
                      onClick={() => handleToggleTestimonialPublish(t)}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider border ${
                        t.is_published
                          ? "bg-emerald-950/80 text-emerald-400 border-emerald-800/60"
                          : "bg-slate-800 text-slate-400 border-slate-700"
                      }`}
                    >
                      {t.is_published ? "Published" : "Draft"}
                    </button>
                  </div>

                  <p className="text-xs text-slate-300 italic font-sans leading-relaxed">
                    &ldquo;{t.quote}&rdquo;
                  </p>
                </div>

                <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-white text-xs">{t.client_name}</div>
                    <div className="text-[10px] font-mono text-slate-400">{t.role}, {t.company}</div>
                  </div>
                  <button
                    onClick={() => handleDeleteTestimonial(t.id)}
                    className="p-1 rounded text-slate-500 hover:text-red-400 hover:bg-white/5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Add Testimonial Modal */}
          {showAddTestimonialModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
              <div className="bg-[#0E1118] border border-white/10 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <h3 className="text-base font-bold text-white">Add Client Endorsement</h3>
                  <button onClick={() => setShowAddTestimonialModal(false)} className="p-1 text-slate-400 hover:text-white">
                    <XCircle className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleCreateTestimonial} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-mono font-medium text-slate-300 mb-1">Client Name *</label>
                      <input
                        required
                        value={newTestimonialName}
                        onChange={(e) => setNewTestimonialName(e.target.value)}
                        placeholder="e.g. Julian Thorne"
                        className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-xs text-white font-mono focus:outline-none focus:border-red-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-mono font-medium text-slate-300 mb-1">Company *</label>
                      <input
                        required
                        value={newTestimonialCompany}
                        onChange={(e) => setNewTestimonialCompany(e.target.value)}
                        placeholder="e.g. Solaria BioSciences"
                        className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-xs text-white font-mono focus:outline-none focus:border-red-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-mono font-medium text-slate-300 mb-1">Client Role *</label>
                    <input
                      required
                      value={newTestimonialRole}
                      onChange={(e) => setNewTestimonialRole(e.target.value)}
                      placeholder="e.g. Chief Marketing Officer"
                      className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-xs text-white font-mono focus:outline-none focus:border-red-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono font-medium text-slate-300 mb-1">Endorsement Quote *</label>
                    <textarea
                      required
                      rows={4}
                      value={newTestimonialQuote}
                      onChange={(e) => setNewTestimonialQuote(e.target.value)}
                      placeholder="Client testimonial quote highlighting project outcome and experience..."
                      className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-xs text-white font-mono focus:outline-none focus:border-red-500"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
                    <button
                      type="button"
                      onClick={() => setShowAddTestimonialModal(false)}
                      className="px-4 py-2 rounded-xl text-xs font-mono text-slate-400 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold font-mono uppercase tracking-wider"
                    >
                      Publish Testimonial
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 7. TAB 5: SITE SETTINGS */}
      {activeTab === "settings" && (
        <div className="bg-[#0E1118] border border-white/10 rounded-2xl p-6 shadow-xl space-y-6 max-w-2xl">
          <div>
            <h3 className="text-base font-bold text-white">Homepage & Global Indicators</h3>
            <p className="text-xs text-slate-400 mt-1">Configure live numbers reflected across the public website hero and navbar.</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono font-medium text-slate-300 mb-1">Specialist Talent Count</label>
              <input
                type="number"
                value={heroTalentCount}
                onChange={(e) => setHeroTalentCount(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-xs text-white font-mono focus:outline-none focus:border-red-500"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">Renders as "Explore Talent ({heroTalentCount})"</span>
            </div>

            <div>
              <label className="block text-xs font-mono font-medium text-slate-300 mb-1">Creative Disciplines Count</label>
              <input
                type="number"
                value={heroDisciplinesCount}
                onChange={(e) => setHeroDisciplinesCount(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-xs text-white font-mono focus:outline-none focus:border-red-500"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">Renders in Trust Pillars as "{heroDisciplinesCount} Creative Disciplines"</span>
            </div>
          </div>

          <div className="pt-4 border-t border-white/10 flex justify-end">
            <button
              onClick={handleSaveHeroMetrics}
              className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold font-mono uppercase tracking-wider transition-colors shadow-md shadow-red-900/30"
            >
              Save Global Settings
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
