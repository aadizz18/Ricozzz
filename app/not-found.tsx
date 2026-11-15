import React from "react";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ArrowRight, Compass, Home } from "lucide-react";
import { EditorialStar, ContourFlourish } from "@/components/ui/EditorialDecorations";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground selection:bg-accent selection:text-[#FFF9F3]">
      <Navbar />

      <main className="flex-1 flex items-center justify-center py-16 sm:py-24 px-4 sm:px-6 relative overflow-hidden">
        <ContourFlourish className="absolute -top-16 -right-16 w-80 h-80 text-taupe/15 pointer-events-none" />
        <ContourFlourish className="absolute -bottom-16 -left-16 w-72 h-72 text-taupe/15 pointer-events-none rotate-180" />

        <div className="w-full max-w-xl text-center space-y-6 relative z-10 bg-white border border-[#E6D8CF] rounded-3xl p-8 sm:p-12 shadow-card">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-mono font-medium bg-[#FFF9F3] text-accent border border-[#E6D8CF] shadow-xs">
            <EditorialStar size={12} className="text-accent" />
            <span>ERROR 404 // DISPATCH NOTICE</span>
          </div>

          <div className="space-y-3">
            <h1 className="font-serif text-5xl sm:text-6xl font-normal tracking-tight text-espresso leading-none">
              404
            </h1>
            <h2 className="font-serif text-xl sm:text-2xl font-normal text-espresso">
              Page Not Found
            </h2>
            <p className="text-sm text-muted max-w-md mx-auto leading-relaxed font-sans">
              The creative dossier, mandate page, or resource you are looking for has been relocated or does not exist on the platform.
            </p>
          </div>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3.5">
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3 rounded-full bg-accent text-[#FFF9F3] font-semibold text-xs hover:bg-[#3E1012] transition-all shadow-burgundy active:scale-95"
            >
              <Home className="w-4 h-4" />
              <span>Return to Overview</span>
            </Link>

            <Link
              href="/talent"
              className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3 rounded-full bg-[#FFF9F3] hover:bg-[#FAF2EA] text-espresso border border-[#E6D8CF] font-semibold text-xs transition-colors"
            >
              <Compass className="w-4 h-4 text-accent" />
              <span>Explore Talent</span>
              <ArrowRight className="w-3.5 h-3.5 text-taupe" />
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
