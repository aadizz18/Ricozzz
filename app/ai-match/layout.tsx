import type { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "AI Match Engine — Multi-Dimensional Talent Calibration",
  description: "Input your project brief to receive algorithmic recommendations for specialized creative squads calibrated to your domain in seconds.",
};

export default function AIMatchLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
