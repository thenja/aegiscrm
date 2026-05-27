"use client"

import Image from "next/image"
import { useMemo, useState } from "react"

import { cn } from "@/lib/utils"

export function Brand({
  compact = false,
  darkMode = false,
  logoWidth = 180,
  className,
}: {
  compact?: boolean
  darkMode?: boolean
  logoWidth?: number
  className?: string
}) {
  const sources = useMemo(() => (darkMode ? ["/logo-white.png", "/logo.png"] : ["/logo.png"]), [darkMode])
  const [sourceIndex, setSourceIndex] = useState(0)
  const [logoUnavailable, setLogoUnavailable] = useState(false)

  const src = sources[sourceIndex]
  const hasLogo = Boolean(src) && !logoUnavailable

  if (compact) {
    return (
      <div
        className={cn(
          "inline-flex h-9 w-9 items-center justify-center overflow-hidden rounded-md border",
          darkMode ? "border-white/20 bg-white/10" : "border-border bg-white",
          className
        )}
      >
        {hasLogo ? (
          <Image
            src={src}
            alt="Aegis"
            width={36}
            height={36}
            className="h-full w-full object-contain p-1"
            onError={() =>
              setSourceIndex((current) => {
                if (current < sources.length - 1) {
                  return current + 1
                }
                setLogoUnavailable(true)
                return current
              })
            }
          />
        ) : (
          <span className={cn("text-xs font-semibold", darkMode ? "text-white" : "text-navy")}>Aegis</span>
        )}
      </div>
    )
  }

  if (hasLogo) {
    return (
      <div className={cn("flex min-w-0 flex-col", className)}>
        <Image
          src={src}
          alt="Aegis"
          width={logoWidth}
          height={40}
          className="h-9 w-auto max-w-full object-contain"
          priority
          onError={() =>
            setSourceIndex((current) => {
              if (current < sources.length - 1) {
                return current + 1
              }
              setLogoUnavailable(true)
              return current
            })
          }
        />
      </div>
    )
  }

  return (
    <div className={cn("flex min-w-0 flex-col", className)}>
      <p className={cn("truncate text-xs font-bold uppercase tracking-[0.08em]", darkMode ? "text-slate-100" : "text-navy")}>
        Aegis
      </p>
    </div>
  )
}
