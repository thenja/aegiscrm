import Link from "next/link"

import { Button } from "@/components/ui/button"
import { ActionBar } from "@/components/ui/patterns"

const PRESETS = [
  { key: "my_overdue", label: "My Overdue" },
  { key: "my_due_today", label: "My Due Today" },
  { key: "pending_client", label: "Pending Client" },
  { key: "no_contact_yet", label: "No Contact Yet" },
  { key: "no_work_planned", label: "No Work Planned" },
  { key: "due_this_week", label: "Due This Week" },
] as const

export function ReviewPresetBar({
  basePath,
  activePreset,
  preserveParams,
}: {
  basePath: string
  activePreset?: string
  preserveParams?: Record<string, string | undefined>
}) {
  const buildHref = (preset?: string) => {
    const params = new URLSearchParams()
    Object.entries(preserveParams ?? {}).forEach(([key, value]) => {
      if (!value) return
      params.set(key, value)
    })
    if (preset) params.set("preset", preset)
    const query = params.toString()
    return query ? `${basePath}?${query}` : basePath
  }

  return (
    <ActionBar className="gap-1.5">
      {PRESETS.map((preset) => (
        <Link key={preset.key} href={buildHref(preset.key)}>
          <Button
            type="button"
            variant={activePreset === preset.key ? "default" : "ghost"}
            size="sm"
            className="h-7 px-2 text-xs"
          >
            {preset.label}
          </Button>
        </Link>
      ))}
      <Link href={buildHref(undefined)}>
        <Button type="button" variant="secondary" size="sm" className="h-7 px-2 text-xs">
          Reset
        </Button>
      </Link>
    </ActionBar>
  )
}
