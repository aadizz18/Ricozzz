import type { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Explore Curated Talent — 57 Verified Creative Specialists",
  description: "Discover, evaluate, and shortlist premier Creative Directors, Brand Strategists, Typographers, and UX Architects with documented studio case studies.",
};

export default function TalentLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
