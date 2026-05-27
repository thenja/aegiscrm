"use client"

import { ReactNode, useEffect, useState } from "react"
import { cn } from "@/lib/utils"

import { Sidebar } from "@/components/layout/sidebar"
import { TopBar } from "@/components/layout/top-bar"
import type { UserProfile } from "@/types/roles"

export function AppShell({ children, profile }: { children: ReactNode; profile: UserProfile }) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [desktopSidebarMode, setDesktopSidebarMode] = useState<"full" | "compact" | "hidden">("full")

  useEffect(() => {
    const saved = window.localStorage.getItem("aegis-sidebar-mode")
    if (saved === "full" || saved === "compact" || saved === "hidden") {
      setDesktopSidebarMode(saved)
    }
  }, [])

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 768) {
        setMobileSidebarOpen(false)
      }
    }
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [])

  const cycleDesktopSidebarMode = () => {
    setDesktopSidebarMode((current) => {
      const next = current === "full" ? "compact" : current === "compact" ? "hidden" : "full"
      window.localStorage.setItem("aegis-sidebar-mode", next)
      return next
    })
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-page-bg">
      <div className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(circle_at_15%_15%,rgba(37,99,235,0.10),transparent_45%),radial-gradient(circle_at_85%_20%,rgba(20,184,166,0.10),transparent_40%),linear-gradient(150deg,#f8fafc_0%,#f3f6fb_55%,#eef2ff_100%)]" />
      <div className="pointer-events-none absolute -left-24 top-20 z-0 h-72 w-72 rounded-full bg-status-blue/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 top-1/3 z-0 h-80 w-80 rounded-full bg-status-green/10 blur-3xl" />
      <div className="pointer-events-none absolute inset-0 z-0 opacity-25 [background-image:linear-gradient(rgba(148,163,184,0.14)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.14)_1px,transparent_1px)] [background-size:32px_32px]" />

      <Sidebar
        mobileOpen={mobileSidebarOpen}
        onMobileClose={() => setMobileSidebarOpen(false)}
        desktopMode={desktopSidebarMode}
      />
      <TopBar
        profile={profile}
        onToggleMobileMenu={() => setMobileSidebarOpen((prev) => !prev)}
        sidebarMode={desktopSidebarMode}
        onCycleSidebarMode={cycleDesktopSidebarMode}
      />
      <main
        className={cn(
          "relative z-10 pt-12 transition-[padding] duration-200",
          desktopSidebarMode === "full"
            ? "md:pl-64"
            : desktopSidebarMode === "compact"
              ? "md:pl-[72px]"
              : "md:pl-0"
        )}
      >
        <div className="px-3 py-4 sm:px-4 md:px-5 xl:px-6">{children}</div>
      </main>
    </div>
  )
}
