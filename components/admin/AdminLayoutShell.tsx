"use client";

import React, { useEffect, useState, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AdminSidebar } from "./AdminSidebar";
import { AdminHeader } from "./AdminHeader";
import { AdminUser } from "@/lib/admin/types";
import { adminApi } from "@/lib/admin/apiClient";

interface AdminLayoutShellProps {
  children: React.ReactNode;
}

export const AdminLayoutShell: React.FC<AdminLayoutShellProps> = ({ children }) => {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [badgeCounts, setBadgeCounts] = useState<{
    overdueTasks?: number;
    openTickets?: number;
    pendingVendors?: number;
    unreadNotifications?: number;
  }>({});

  const isLoginPage = pathname === "/admin/login" || pathname === "/admin/login/";

  const refreshSessionAndBadges = useCallback(async () => {
    if (isLoginPage) {
      setLoading(false);
      return;
    }

    try {
      // 1. Authoritative Session Verification against InsForge PostgreSQL
      const meRes = await adminApi.auth.me();
      if (meRes.success && meRes.user) {
        setUser(meRes.user);
        // Sync cache for fast subsequent client renders
        if (typeof window !== "undefined") {
          localStorage.setItem("ricoz_demo_auth_session", JSON.stringify(meRes.user));
        }

        // 2. Fetch live badge counts
        try {
          const badgeRes = await adminApi.dashboard.getBadges();
          if (badgeRes.success && badgeRes.counts) {
            setBadgeCounts(badgeRes.counts);
          }
        } catch {
          // Non-critical badge count failure
        }
      } else {
        setUser(null);
        router.push(`/admin/login?from=${encodeURIComponent(pathname)}`);
      }
    } catch {
      setUser(null);
      if (!isLoginPage) {
        router.push(`/admin/login?from=${encodeURIComponent(pathname)}`);
      }
    } finally {
      setLoading(false);
    }
  }, [pathname, isLoginPage, router]);

  useEffect(() => {
    // Force dark theme styling inside the admin portal
    document.documentElement.style.backgroundColor = "#07080C";
    document.documentElement.style.color = "#F5F5F0";
    document.body.style.backgroundColor = "#07080C";
    document.body.style.color = "#F5F5F0";

    refreshSessionAndBadges();

    // Listen for custom refresh events across modules
    const handleRefresh = () => {
      refreshSessionAndBadges();
    };

    window.addEventListener("ricoz_admin_refresh", handleRefresh);

    return () => {
      window.removeEventListener("ricoz_admin_refresh", handleRefresh);
    };
  }, [refreshSessionAndBadges]);

  // If on login page, render clean page without sidebar/header
  if (isLoginPage) {
    return <>{children}</>;
  }

  // Loading state while verifying authoritative admin session
  if (loading) {
    return (
      <div className="min-h-screen bg-[#07080C] text-slate-300 flex flex-col items-center justify-center p-4">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-mono tracking-wider uppercase text-slate-400">
            Verifying Administrative Session...
          </span>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect via refreshSessionAndBadges
  }

  return (
    <div className="min-h-screen bg-[#07080C] text-[#F5F5F0] flex flex-col font-sans selection:bg-red-600 selection:text-white">
      {/* Sidebar */}
      <AdminSidebar
        user={user}
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
        badgeCounts={badgeCounts}
      />

      {/* Main Content Area */}
      <div className="lg:pl-64 flex flex-col flex-1 min-w-0">
        <AdminHeader
          user={user}
          onOpenMobileMenu={() => setMobileSidebarOpen(true)}
          unreadNotificationCount={badgeCounts.unreadNotifications}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
};
