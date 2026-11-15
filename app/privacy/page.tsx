import React from "react";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Shield, Lock, FileText, CheckCircle2 } from "lucide-react";
import { EditorialStar, ContourFlourish } from "@/components/ui/EditorialDecorations";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Notice — RICOZ",
  description: "Learn how RICOZ collects, utilizes, and protects enterprise mandate data and specialist information.",
};

export default function PrivacyPage() {
  const lastUpdated = "November 14, 2026";

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground selection:bg-accent selection:text-[#FFF9F3]">
      <Navbar />

      <main className="flex-1 py-12 md:py-20 relative overflow-hidden">
        <ContourFlourish className="absolute -top-16 -right-16 w-80 h-80 text-taupe/15 pointer-events-none" />
        <ContourFlourish className="absolute top-1/2 -left-20 w-72 h-72 text-taupe/15 pointer-events-none rotate-90" />

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          {/* HEADER */}
          <div className="mb-12 space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-mono font-medium bg-[#FFF9F3] text-accent border border-[#E6D8CF] shadow-xs">
              <EditorialStar size={13} className="text-accent" />
              <span>DATA GOVERNANCE & PRIVACY</span>
            </div>

            <h1 className="font-serif text-3xl sm:text-5xl font-normal tracking-tight text-espresso leading-[1.15]">
              RICOZ Privacy Notice
            </h1>

            <p className="text-xs sm:text-sm text-taupe font-mono">
              Last updated: {lastUpdated} • Version 1.2
            </p>

            <p className="text-base text-muted leading-relaxed font-sans pt-2">
              RICOZ Collective Inc. (&quot;RICOZ&quot;, &quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) operates the creative matchmaking and project operations platform at ricoz.io. This Privacy Notice describes how we collect, store, process, and protect information submitted by enterprise clients, prospective partners, and creative specialists.
            </p>
          </div>

          {/* CONTENT SECTIONS */}
          <div className="space-y-10 text-espresso font-sans text-sm sm:text-base leading-relaxed bg-white border border-[#E6D8CF] rounded-3xl p-6 sm:p-10 shadow-xs">
            {/* 1. Information We Collect */}
            <section className="space-y-3">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-espresso tracking-tight flex items-center gap-2">
                <span className="font-mono text-accent text-lg">01.</span>
                <span>Information We Collect</span>
              </h2>
              <p className="text-muted text-sm leading-relaxed">
                We only collect data strictly necessary to facilitate creative matching, project scoping, and platform governance:
              </p>
              <ul className="space-y-2 pt-2 text-sm text-espresso">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                  <span>
                    <strong>Enterprise Mandate Inquiries:</strong> Full name, corporate email address, company name, mandate focus, timeline expectations, budget range, and project brief requirements submitted via our Concierge Briefing flow or Project Scoping tool.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                  <span>
                    <strong>Specialist Profile Information:</strong> Documented studio case studies, discipline proficiencies, verified career tenures, portfolio imagery, and rate benchmarks.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                  <span>
                    <strong>Technical & Security Metadata:</strong> IP addresses (recorded in secure audit logs for rate limiting and fraud prevention), browser user agents, and security session cookies for administrative staff.
                  </span>
                </li>
              </ul>
            </section>

            <hr className="border-[#E6D8CF]" />

            {/* 2. How Information is Utilized */}
            <section className="space-y-3">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-espresso tracking-tight flex items-center gap-2">
                <span className="font-mono text-accent text-lg">02.</span>
                <span>How We Use Your Information</span>
              </h2>
              <p className="text-muted text-sm leading-relaxed">
                Collected information is processed exclusively for the following business purposes:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-sm text-espresso">
                <li>Deterministic matching of verified Creative Directors and Design Teams to enterprise briefs.</li>
                <li>Facilitating mutual Non-Disclosure Agreements (NDAs) prior to confidential brief exchanges.</li>
                <li>Providing customer support, answering mandate inquiries, and coordinating sprint reviews.</li>
                <li>Preventing malicious bot activity, abuse, and denial-of-service through distributed rate limiting.</li>
                <li>Maintaining an immutable operational audit log for platform accountability.</li>
              </ul>
            </section>

            <hr className="border-[#E6D8CF]" />

            {/* 3. Confidentiality & Non-Disclosure */}
            <section className="space-y-3">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-espresso tracking-tight flex items-center gap-2">
                <span className="font-mono text-accent text-lg">03.</span>
                <span>Confidentiality & NDA Protections</span>
              </h2>
              <p className="text-muted text-sm leading-relaxed">
                All client mandate briefs, proprietary product specifications, and pre-release strategic positioning frameworks are treated with strict commercial confidentiality. Prior to sensitive asset sharing, bilateral mutual NDAs protect all disclosures. We do not sell, rent, or trade client information to advertisers or third-party data brokers.
              </p>
            </section>

            <hr className="border-[#E6D8CF]" />

            {/* 4. Data Security & Storage */}
            <section className="space-y-3">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-espresso tracking-tight flex items-center gap-2">
                <span className="font-mono text-accent text-lg">04.</span>
                <span>Security Infrastructure</span>
              </h2>
              <p className="text-muted text-sm leading-relaxed">
                Data is housed in encrypted PostgreSQL databases managed with Row-Level Security (RLS). Public visitors can never query private inquiries or administrative logs. Administrative access requires cryptographically signed session tokens and strict Role-Based Access Control (RBAC).
              </p>
            </section>

            <hr className="border-[#E6D8CF]" />

            {/* 5. Contact & Data Rights */}
            <section className="space-y-3">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-espresso tracking-tight flex items-center gap-2">
                <span className="font-mono text-accent text-lg">05.</span>
                <span>Your Rights & Inquiries</span>
              </h2>
              <p className="text-muted text-sm leading-relaxed">
                You may request a copy of the inquiry data we hold about your company or request deletion of past briefing submissions at any time by contacting our curatorial team at{" "}
                <a href="mailto:concierge@ricoz.io" className="text-accent underline font-semibold hover:text-[#3E1012]">
                  concierge@ricoz.io
                </a>
                .
              </p>
            </section>
          </div>

          <div className="mt-8 text-center">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-xs font-mono font-semibold text-accent hover:underline"
            >
              &larr; Return to Overview
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
