"use client"

import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"

import { createClient } from "@/lib/supabase/browser"

export function EventBackendLiveSync({ eventId }: { eventId: string }) {
  const router = useRouter()
  const refreshTimerRef = useRef<number | null>(null)

  useEffect(() => {
    const scheduleRefresh = () => {
      if (refreshTimerRef.current) {
        window.clearTimeout(refreshTimerRef.current)
      }
      refreshTimerRef.current = window.setTimeout(() => {
        router.refresh()
      }, 220)
    }

    const supabase = createClient()
    const channel = supabase
      .channel(`event-backend-sync-${eventId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "event_guests", filter: `event_id=eq.${eventId}` },
        scheduleRefresh
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "event_guests", filter: `event_id=eq.${eventId}` },
        scheduleRefresh
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "event_guests", filter: `event_id=eq.${eventId}` },
        scheduleRefresh
      )
      .subscribe()

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        scheduleRefresh()
      }
    }

    document.addEventListener("visibilitychange", onVisible)
    window.addEventListener("focus", scheduleRefresh)

    return () => {
      if (refreshTimerRef.current) {
        window.clearTimeout(refreshTimerRef.current)
      }
      document.removeEventListener("visibilitychange", onVisible)
      window.removeEventListener("focus", scheduleRefresh)
      void supabase.removeChannel(channel)
    }
  }, [eventId, router])

  return null
}
