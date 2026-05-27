import { cn } from "@/lib/utils"

type StatusTone = "green" | "amber" | "red" | "blue" | "purple" | "grey"

const STATUS_TONE_MAP: Record<string, StatusTone> = {
  Completed: "green",
  Approved: "green",
  "In Progress": "blue",
  "Pending Internal Review": "purple",
  "Pending Client Approval": "amber",
  "Pending External Party": "amber",
  "Pending Client Data": "amber",
  Overdue: "red",
  "At Risk": "red",
  Cancelled: "grey",
  "On Hold": "grey",
  Deferred: "amber",
  "Not Started": "grey",
  "Not Required This Month": "grey",
}

const TONE_CLASS: Record<StatusTone, string> = {
  green: "border-status-green bg-status-green-bg text-status-green",
  amber: "border-status-amber bg-status-amber-bg text-status-amber",
  red: "border-status-red bg-status-red-bg text-status-red",
  blue: "border-status-blue bg-status-blue-bg text-status-blue",
  purple: "border-status-purple bg-status-purple-bg text-status-purple",
  grey: "border-status-grey bg-status-grey-bg text-text-secondary",
}

export function StatusBadge({
  status,
  compact = false,
  className,
}: {
  status: string
  compact?: boolean
  className?: string
}) {
  const tone = STATUS_TONE_MAP[status] ?? "grey"
  return (
    <span
      title={status}
      className={cn(
        "inline-flex items-center rounded-full border font-medium",
        compact ? "max-w-[150px] truncate px-1 py-0.5 text-[10px] leading-tight" : "px-2 py-0.5 text-xs",
        TONE_CLASS[tone],
        className
      )}
    >
      {status}
    </span>
  )
}
