import type { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Start a Project — Mandate Scoping & Squad Matching",
  description: "Define your enterprise rebranding objectives, required specialist disciplines, and budget tiers to assemble a curated squad in minutes.",
};

export default function StartProjectLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
