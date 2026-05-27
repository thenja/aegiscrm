export function formatDisplayDate(dateValue?: string | null) {
  if (!dateValue) return "-"

  const parsed = new Date(dateValue)
  if (Number.isNaN(parsed.getTime())) return dateValue

  return parsed.toLocaleDateString("en-MY", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

const SG_TIMEZONE = "Asia/Singapore"

export type TouchpointHealth = "On Track" | "Due Soon" | "Overdue" | "No Touchpoint Yet"

export function getSingaporeTodayIsoDate() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: SG_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date())

  const year = parts.find((part) => part.type === "year")?.value ?? "0000"
  const month = parts.find((part) => part.type === "month")?.value ?? "01"
  const day = parts.find((part) => part.type === "day")?.value ?? "01"

  return `${year}-${month}-${day}`
}

function isoToUtcMillis(isoDate: string) {
  const [year, month, day] = isoDate.split("-").map(Number)
  return Date.UTC(year, month - 1, day)
}

export function daysSinceDateInSingapore(dateValue?: string | null) {
  if (!dateValue) return null
  const isoDate = dateValue.slice(0, 10)
  const todayIso = getSingaporeTodayIsoDate()
  const diffMs = isoToUtcMillis(todayIso) - isoToUtcMillis(isoDate)
  return Math.floor(diffMs / (1000 * 60 * 60 * 24))
}

export function getTouchpointHealth(
  lastTouchpoint: string | null,
  touchpointOverdueDays: number,
  dueSoonBufferDays = 2
): TouchpointHealth {
  const daysSince = daysSinceDateInSingapore(lastTouchpoint)

  if (daysSince === null) {
    return "No Touchpoint Yet"
  }

  if (daysSince > touchpointOverdueDays) {
    return "Overdue"
  }

  if (daysSince >= Math.max(0, touchpointOverdueDays - dueSoonBufferDays)) {
    return "Due Soon"
  }

  return "On Track"
}
