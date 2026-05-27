"use client"

import type { ReactNode } from "react"

import { SlideOver } from "@/components/ui/slide-over"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useState, type ReactElement } from "react"

export function SlideOverPanel({
  open,
  onClose,
  title,
  subtitle,
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  children: ReactNode
}) {
  return (
    <SlideOver open={open} onClose={onClose} title={title} subtitle={subtitle}>
      {children}
    </SlideOver>
  )
}

export const DetailDrawer = SlideOverPanel
export const ResponsiveOverlay = SlideOverPanel

export function ModalForm({
  triggerLabel,
  title,
  subtitle,
  children,
  triggerClassName,
}: {
  triggerLabel: string
  title: string
  subtitle?: string
  children: ReactNode
  triggerClassName?: string
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button type="button" className={triggerClassName} onClick={() => setOpen(true)}>
        {triggerLabel}
      </Button>
      <ResponsiveOverlay open={open} onClose={() => setOpen(false)} title={title} subtitle={subtitle}>
        {children}
      </ResponsiveOverlay>
    </>
  )
}

export function ConfirmDialog({
  triggerLabel,
  title,
  description,
  confirmNode,
  triggerVariant = "ghost",
}: {
  triggerLabel: string
  title: string
  description: string
  confirmNode: ReactElement
  triggerVariant?: "default" | "secondary" | "ghost" | "danger"
}) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button type="button" variant={triggerVariant} size="xs" onClick={() => setOpen(true)}>
        {triggerLabel}
      </Button>
      <div
        className={cn(
          "fixed inset-0 z-50 transition-opacity",
          open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        )}
      >
        <button type="button" className="absolute inset-0 bg-black/25" onClick={() => setOpen(false)} aria-label="Close confirmation" />
        <div className="absolute left-1/2 top-1/2 w-[92vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border/90 bg-white/90 p-4 shadow-[0_12px_28px_rgba(15,23,42,0.18)] backdrop-blur-sm">
          <h4 className="text-sm font-semibold text-navy">{title}</h4>
          <p className="mt-1 text-xs text-text-secondary">{description}</p>
          <div className="mt-4 flex justify-end gap-2">
            <Button type="button" variant="ghost" size="xs" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            {confirmNode}
          </div>
        </div>
      </div>
    </>
  )
}

export function DrawerHeader({
  title,
  badge,
  subtitle,
}: {
  title: ReactNode
  badge?: ReactNode
  subtitle?: ReactNode
}) {
  return (
    <div className="space-y-1 rounded-lg border border-border bg-slate-50 p-2.5">
      <div className="flex items-start justify-between gap-3">
        <h4 className="text-sm font-semibold text-navy">{title}</h4>
        {badge}
      </div>
      {subtitle ? <div className="text-xs text-text-secondary">{subtitle}</div> : null}
    </div>
  )
}

export function DrawerMetaRow({
  items,
  className,
}: {
  items: Array<{ label: string; value: ReactNode }>
  className?: string
}) {
  return (
    <p className={cn("text-xs text-text-secondary", className)}>
      {items.map((item, index) => (
        <span key={item.label}>
          {item.label}: <span className="font-medium text-text-primary">{item.value}</span>
          {index < items.length - 1 ? " | " : ""}
        </span>
      ))}
    </p>
  )
}

export function DrawerSection({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <section className="space-y-2 rounded-lg border border-border/90 bg-white/92 p-3">
      <h5 className="text-sm font-semibold text-navy">{title}</h5>
      {description ? <p className="text-xs text-text-secondary">{description}</p> : null}
      {children}
    </section>
  )
}

export function DrawerActions({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center gap-1.5">{children}</div>
}
