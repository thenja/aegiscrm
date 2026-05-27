"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { CalendarCheck2, CalendarDays, CheckSquare, ClipboardList, Handshake, Home, LayoutDashboard, Shield, Sun, Users, X } from "lucide-react"
import { Brand } from "@/components/layout/brand"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/daily-review", label: "Daily Review", icon: Sun },
  { href: "/weekly-review", label: "Weekly Review", icon: ClipboardList },
  { href: "/my-work", label: "My Work", icon: CheckSquare },
  { href: "/clients", label: "Clients", icon: Home },
  { href: "/external-contacts", label: "External Contacts", icon: Handshake },
  { href: "/events", label: "Events", icon: CalendarCheck2 },
  { href: "/deliverables", label: "Deliverables", icon: ClipboardList },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/approvals", label: "Approvals", icon: Shield },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
]

export function Sidebar({
  mobileOpen,
  onMobileClose,
  desktopMode,
}: {
  mobileOpen: boolean
  onMobileClose: () => void
  desktopMode: "full" | "compact" | "hidden"
}) {
  const pathname = usePathname()
  const showDesktopLabels = desktopMode === "full"
  const desktopIsHidden = desktopMode === "hidden"
  const desktopIsCompact = desktopMode === "compact"

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/30 transition-opacity md:hidden",
          mobileOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={onMobileClose}
      />

      <aside
        className={cn(
          "fixed left-0 top-0 z-50 h-screen border-r border-border/80 bg-slate-100/85 text-text-primary shadow-sm backdrop-blur-md transition-all duration-200 md:z-40",
          "w-64 -translate-x-full md:translate-x-0",
          desktopIsHidden ? "md:w-0 md:border-r-0 md:shadow-none" : desktopIsCompact ? "md:w-[72px]" : "md:w-64",
          mobileOpen ? "translate-x-0" : ""
        )}
      >
        <div className={cn("flex items-center justify-between border-b border-border p-3", desktopIsHidden && "md:hidden")}>
          <Brand className={cn("md:hidden", !desktopIsCompact && "md:flex", desktopIsCompact && "md:hidden")} />
          <Brand compact className={cn("hidden md:inline-flex", !desktopIsCompact && "md:hidden")} />
          <button type="button" onClick={onMobileClose} className="rounded p-1 text-text-secondary hover:bg-slate-100 md:hidden" aria-label="Close menu">
            <X size={16} />
          </button>
        </div>

        <nav className={cn("space-y-1 p-2 md:p-1.5", desktopIsHidden && "md:hidden", !desktopIsCompact && "md:p-3")}>
          {navItems.map((item) => {
            const Icon = item.icon
            const active = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onMobileClose}
                className={cn(
                  "flex items-center rounded-md text-sm font-medium transition-colors",
                  "px-3 py-2",
                  showDesktopLabels ? "md:justify-start md:px-3" : "md:justify-center md:px-0",
                  active
                    ? "bg-navy/10 text-navy shadow-sm ring-1 ring-navy/15"
                    : "text-text-secondary hover:bg-slate-100 hover:text-navy"
                )}
                title={item.label}
              >
                <Icon size={16} />
                <span className={cn("ml-3", showDesktopLabels ? "md:inline" : "md:hidden")}>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        <div className={cn("absolute bottom-0 w-full border-t border-border p-2 md:p-1.5", desktopIsHidden && "md:hidden", !desktopIsCompact && "md:p-3")}>
          <p className={cn("px-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-text-secondary", showDesktopLabels ? "md:block" : "md:hidden")}>Administration</p>
          <Link
            href="/admin/users"
            onClick={onMobileClose}
            className={cn(
              "flex items-center rounded-md text-sm font-medium transition-colors",
              "px-3 py-2",
              showDesktopLabels ? "md:justify-start md:px-3" : "md:justify-center md:px-0",
              pathname === "/admin/users"
                ? "bg-navy/10 text-navy shadow-sm ring-1 ring-navy/15"
                : "text-text-secondary hover:bg-slate-100 hover:text-navy"
            )}
            title="Admin Users"
          >
            <Users size={16} />
            <span className={cn("ml-3", showDesktopLabels ? "md:inline" : "md:hidden")}>Admin Users</span>
          </Link>
        </div>
      </aside>
    </>
  )
}
