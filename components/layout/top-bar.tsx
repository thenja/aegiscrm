"use client"

import { Columns2, Columns3, LogOut, Menu, PanelLeftClose, User } from "lucide-react"
import { cn } from "@/lib/utils"
import { useEffect, useRef, useState } from "react"

import { GlobalSearch } from "@/components/layout/global-search"
import { QuickAddMenu } from "@/components/layout/quick-add-menu"
import { Button } from "@/components/ui/button"
import type { UserProfile } from "@/types/roles"

export function TopBar({
  profile,
  onToggleMobileMenu,
  sidebarMode,
  onCycleSidebarMode,
}: {
  profile: UserProfile
  onToggleMobileMenu: () => void
  sidebarMode: "full" | "compact" | "hidden"
  onCycleSidebarMode: () => void
}) {
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const profileMenuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const onClickOutside = (event: MouseEvent) => {
      if (!profileMenuRef.current) return
      if (!profileMenuRef.current.contains(event.target as Node)) {
        setProfileMenuOpen(false)
      }
    }

    document.addEventListener("mousedown", onClickOutside)
    return () => document.removeEventListener("mousedown", onClickOutside)
  }, [])

  return (
    <header
      className={cn(
        "fixed right-0 top-0 z-30 h-12 border-b border-border/80 bg-white/78 backdrop-blur-md transition-[left] duration-200",
        sidebarMode === "full" ? "md:left-64" : sidebarMode === "compact" ? "md:left-[72px]" : "md:left-0",
        "left-0"
      )}
    >
      <div className="flex h-full items-center justify-between gap-1.5 px-2.5 sm:gap-2 sm:px-3 md:px-4">
        <div className="flex min-w-0 flex-1 items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={onToggleMobileMenu}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-white text-text-secondary hover:bg-slate-50 md:hidden"
            aria-label="Open menu"
          >
            <Menu size={16} />
          </button>
          <button
            type="button"
            onClick={onCycleSidebarMode}
            className="hidden h-8 w-8 items-center justify-center rounded-md border border-border bg-white text-text-secondary hover:bg-slate-50 md:inline-flex"
            aria-label="Toggle sidebar size"
            title={sidebarMode === "full" ? "Switch to logo-only sidebar" : sidebarMode === "compact" ? "Hide sidebar" : "Show full sidebar"}
          >
            {sidebarMode === "full" ? <Columns2 size={14} /> : sidebarMode === "compact" ? <PanelLeftClose size={14} /> : <Columns3 size={14} />}
          </button>
          <GlobalSearch />
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <QuickAddMenu role={profile.role} currentUserId={profile.user_id} />

          <div ref={profileMenuRef} className="relative">
            <button
              type="button"
              onClick={() => setProfileMenuOpen((prev) => !prev)}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-white px-2 hover:bg-slate-50"
              aria-label="Open profile menu"
            >
              <User size={14} className="text-text-secondary" />
              <span className="hidden max-w-[120px] truncate text-xs font-semibold text-text-primary sm:inline">
                {profile.full_name}
              </span>
            </button>

            {profileMenuOpen ? (
              <div className="absolute right-0 top-10 z-50 w-56 rounded-lg border border-border bg-white p-2 shadow-[0_10px_24px_rgba(15,23,42,0.12)]">
                <p className="truncate text-xs font-semibold text-text-primary">{profile.full_name}</p>
                <p className="mt-0.5 truncate text-[11px] text-text-secondary">{profile.role}</p>
                <form action="/api/auth/logout" method="post" className="mt-2">
                  <Button variant="ghost" size="xs" type="submit" className="w-full justify-start gap-2">
                    <LogOut size={14} />
                    Logout
                  </Button>
                </form>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  )
}
