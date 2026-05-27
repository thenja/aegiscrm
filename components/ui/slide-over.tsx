"use client"

import { type ReactNode, useEffect, useState } from "react"
import { createPortal } from "react-dom"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function SlideOver({
  open,
  title,
  subtitle,
  onClose,
  children,
}: {
  open: boolean
  title: string
  subtitle?: string
  onClose: () => void
  children: ReactNode
}) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose()
      }
    }

    window.addEventListener("keydown", onKeyDown)
    return () => {
      window.removeEventListener("keydown", onKeyDown)
    }
  }, [open, onClose])

  if (!mounted) return null

  return createPortal(
    <div
      className={cn(
        "fixed inset-0 z-50 transition-opacity",
        open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
      )}
      aria-hidden={!open}
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/25"
        onClick={onClose}
        aria-label="Close details panel"
      />
      <aside
        className={cn(
          "absolute right-0 top-0 h-full w-full max-w-xl transform overflow-y-auto border-l border-border bg-white shadow-[0_16px_36px_rgba(15,23,42,0.2)] transition-transform",
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="sticky top-0 z-10 border-b border-border/80 bg-white/78 px-4 py-3 backdrop-blur-md">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate text-base font-semibold text-navy">{title}</h3>
              {subtitle ? <p className="mt-0.5 text-xs text-text-secondary">{subtitle}</p> : null}
            </div>
            <Button type="button" variant="ghost" size="xs" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
        <div className="p-4 md:p-5">{children}</div>
      </aside>
    </div>,
    document.body
  )
}
