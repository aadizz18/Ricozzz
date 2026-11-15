import React from "react";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Scale, CheckCircle2, ShieldCheck } from "lucide-react";
import { EditorialStar, ContourFlourish } from "@/components/ui/EditorialDecorations";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — RICOZ",
  description: "Enterprise mandate terms, milestone sprint structures, mutual NDA safeguards, and intellectual property transfer guidelines.",
};

export default function TermsPage() {
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
              <span>COMMERCIAL TERMS & STANDARDS</span>
            </div>

            <h1 className="font-serif text-3xl sm:text-5xl font-normal tracking-tight text-espresso leading-[1.15]">
              RICOZ Terms of Service
            </h1>

            <p className="text-xs sm:text-sm text-taupe font-mono">
              Last updated: {lastUpdated} • Version 1.2
            </p>

            <p className="text-base text-muted leading-relaxed font-sans pt-2">
              These Terms of Service (&quot;Terms&quot;) govern the use of the RICOZ platform and services provided by RICOZ Collective Inc. (&quot;RICOZ&quot;, &quot;we&quot;, or &quot;us&quot;) to enterprise clients (&quot;Clients&quot;) and verified independent creative directors and specialists (&quot;Specialists&quot;).
            </p>
          </div>

          {/* TERMS BODY */}
          <div className="space-y-10 text-espresso font-sans text-sm sm:text-base leading-relaxed bg-white border border-[#E6D8CF] rounded-3xl p-6 sm:p-10 shadow-xs">
            {/* 1. Platform Purpose */}
            <section className="space-y-3">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-espresso tracking-tight flex items-center gap-2">
                <span className="font-mono text-accent text-lg">01.</span>
                <span>Platform Purpose & Engagement Model</span>
              </h2>
              <p className="text-muted text-sm leading-relaxed">
                RICOZ is a curated creative operations platform connecting enterprise organizations with premier independent Creative Directors, Brand Strategists, and Specialized Design Teams for high-impact brand, packaging, and digital product mandates.
              </p>
              <p className="text-muted text-sm leading-relaxed">
                Specialists operate as independent studio principals and creative professionals. RICOZ provides deterministic matching, milestone structuring, mutual NDA facilitation, and operational governance tools.
              </p>
            </section>

            <hr className="border-[#E6D8CF]" />

            {/* 2. Mutual NDA & Confidential Briefing */}
            <section className="space-y-3">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-espresso tracking-tight flex items-center gap-2">
                <span className="font-mono text-accent text-lg">02.</span>
                <span>Confidential Briefings & Mutual NDA</span>
              </h2>
              <p className="text-muted text-sm leading-relaxed">
                All client project briefs submitted via our concierge onboarding flow are governed by standardized bilateral non-disclosure provisions. Specialists shortlisted for private briefs execute mutual NDAs prior to receiving unannounced corporate information, pre-IPO market positioning, or proprietary trade secrets.
              </p>
            </section>

            <hr className="border-[#E6D8CF]" />

            {/* 3. 100% Intellectual Property Assignment */}
            <section className="space-y-3">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-espresso tracking-tight flex items-center gap-2">
                <span className="font-mono text-accent text-lg">03.</span>
                <span>100% Intellectual Property Transfer</span>
              </h2>
              <p className="text-muted text-sm leading-relaxed">
                Upon completion of agreed milestone deliverables and final invoice settlement, 100% full, worldwide, exclusive copyright, trademark rights, and production source files (including raw vectors, Figma component libraries, token hierarchies, and dielines) transfer entirely to the Client.
              </p>
              <div className="p-4 rounded-2xl bg-[#FFF9F3] border border-[#E6D8CF] flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-accent shrink-0 mt-0.5" />
                <span className="text-xs text-[#76665F]">
                  Specialists retain only the standard, non-commercial attribution right to display completed, publicly launched work within their verified portfolio dossier unless prohibited by explicit written agreement.
                </span>
              </div>
            </section>

            <hr className="border-[#E6D8CF]" />

            {/* 4. Sprint Milestones & Transparent Rates */}
            <section className="space-y-3">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-espresso tracking-tight flex items-center gap-2">
                <span className="font-mono text-accent text-lg">04.</span>
                <span>Milestone Sprints & Clear Pricing</span>
              </h2>
              <p className="text-muted text-sm leading-relaxed">
                Projects proceed through defined milestone sprint reviews (e.g., Discovery & Strategy &rarr; Conceptual Architecture &rarr; Tokenized System &rarr; Delivery). Specialists specify transparent hourly and sprint rate benchmarks without hidden agency markups or junior bait-and-switch staffing.
              </p>
            </section>

            <hr className="border-[#E6D8CF]" />

            {/* 5. Contact & Questions */}
            <section className="space-y-3">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-espresso tracking-tight flex items-center gap-2">
                <span className="font-mono text-accent text-lg">05.</span>
                <span>Inquiries & Legal Questions</span>
              </h2>
              <p className="text-muted text-sm leading-relaxed">
                Questions regarding platform terms, bespoke master services agreements (MSAs), or compliance frameworks may be directed to{" "}
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
