import Link from "next/link"
import { ReactNode } from "react"

import { cn } from "@/lib/utils"

export function PageHeader({
  title,
  description,
  action,
  className,
}: {
  title: string
  description?: string
  action?: ReactNode
  className?: string
}) {
  return (
    <section className={cn("rounded-xl border border-border/90 bg-white/90 p-4 shadow-[0_6px_18px_rgba(15,23,42,0.06)] backdrop-blur-sm", className)}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-navy md:text-2xl">{title}</h1>
          {description ? <p className="mt-1 text-sm text-text-secondary">{description}</p> : null}
        </div>
        {action ? <div>{action}</div> : null}
      </div>
    </section>
  )
}

export function SectionCard({
  title,
  description,
  action,
  className,
  children,
}: {
  title?: string
  description?: string
  action?: ReactNode
  className?: string
  children: ReactNode
}) {
  return (
    <section className={cn("rounded-xl border border-border/90 bg-white/90 p-4 shadow-[0_6px_18px_rgba(15,23,42,0.06)] backdrop-blur-sm", className)}>
      {title || description || action ? (
        <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            {title ? <h2 className="text-base font-semibold text-navy md:text-lg">{title}</h2> : null}
            {description ? <p className="mt-1 text-sm text-text-secondary">{description}</p> : null}
          </div>
          {action ? <div>{action}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  )
}

export function ActionBar({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("flex flex-wrap items-center gap-2", className)}>{children}</div>
}

export function FilterBar({ children }: { children: ReactNode }) {
  return <div className="rounded-lg border border-border/80 bg-white/78 p-2.5 backdrop-blur-md">{children}</div>
}

export function FormSection({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <div className="rounded-lg border border-border/90 bg-white/90 p-3.5">
      <h3 className="text-sm font-semibold text-navy md:text-base">{title}</h3>
      {description ? <p className="mt-1 text-sm text-text-secondary">{description}</p> : null}
      <div className="mt-3">{children}</div>
    </div>
  )
}

export function CollapsibleEditSection({
  title = "Edit Details",
  description,
  children,
}: {
  title?: string
  description?: string
  children: ReactNode
}) {
  return (
    <details className="rounded-md border border-border/90 bg-white/90 p-3">
      <summary className="cursor-pointer text-sm font-semibold text-navy">{title}</summary>
      {description ? <p className="mt-1 text-xs text-text-secondary">{description}</p> : null}
      <div className="mt-3">{children}</div>
    </details>
  )
}

export function QuickActionPanel({
  title = "Update Work Status",
  description = "Update status and latest remarks only.",
  children,
}: {
  title?: string
  description?: string
  children: ReactNode
}) {
  return (
    <div className="rounded-lg border border-border bg-slate-50 p-2.5">
      <h4 className="text-sm font-semibold text-navy">{title}</h4>
      <p className="mt-1 text-xs text-text-secondary">{description}</p>
      <div className="mt-2">{children}</div>
    </div>
  )
}

export function ItemCard({
  title,
  status,
  metaLine,
  subLine,
  children,
}: {
  title: ReactNode
  status?: ReactNode
  metaLine?: ReactNode
  subLine?: ReactNode
  children?: ReactNode
}) {
  return (
    <article className="space-y-2.5 rounded-lg border border-border/90 bg-white/90 p-3 shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-navy">{title}</h3>
          {status}
        </div>
        {metaLine ? <p className="text-sm text-text-secondary">{metaLine}</p> : null}
        {subLine ? <p className="text-sm text-text-secondary">{subLine}</p> : null}
      </div>
      {children}
    </article>
  )
}

export const DataCard = ItemCard

export function EmptyState({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-slate-50 p-4 text-center">
      <h3 className="text-sm font-semibold text-navy md:text-base">{title}</h3>
      <p className="mt-1 text-xs text-text-secondary md:text-sm">{description}</p>
    </div>
  )
}

export function MetricCard({
  label,
  value,
}: {
  label: string
  value: ReactNode
}) {
  return (
    <div className="rounded-lg border border-border/90 bg-white/90 p-2.5 shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
      <p className="text-[11px] uppercase tracking-wide text-text-secondary">{label}</p>
      <p className="mt-1 text-base font-semibold text-navy">{value}</p>
    </div>
  )
}

export function TabsBar({
  tabs,
}: {
  tabs: { key: string; label: string; href: string; active?: boolean }[]
}) {
  return (
    <div className="no-scrollbar overflow-x-auto border-b border-border pb-2">
      <div className="flex min-w-max flex-nowrap gap-1.5">
        {tabs.map((tab) => (
          <Link
            key={tab.key}
            href={tab.href}
            className={cn(
              "whitespace-nowrap rounded-md px-2.5 py-1.5 text-xs font-semibold",
              tab.active ? "bg-navy text-white shadow-sm" : "text-navy hover:bg-slate-100"
            )}
          >
            {tab.label}
          </Link>
        ))}
      </div>
    </div>
  )
}

export function PillBadge({
  label,
  tone = "neutral",
  compact = false,
}: {
  label: string
  tone?: "neutral" | "blue" | "green" | "red" | "amber"
  compact?: boolean
}) {
  const toneClass =
    tone === "blue"
      ? "border-status-blue bg-status-blue-bg text-status-blue"
      : tone === "green"
        ? "border-status-green bg-status-green-bg text-status-green"
        : tone === "red"
          ? "border-status-red bg-status-red-bg text-status-red"
          : tone === "amber"
            ? "border-status-amber bg-status-amber-bg text-status-amber"
            : "border-status-grey bg-status-grey-bg text-text-secondary"

  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-full border font-medium",
        compact ? "px-1.5 py-0 text-[11px]" : "px-2 py-0.5 text-xs",
        toneClass
      )}
    >
      {label}
    </span>
  )
}
