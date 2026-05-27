export function displayFollowUpStatus(value: string | null | undefined) {
  if (!value) return "-"
  if (value === "No Touchpoint Yet") return "No Contact Yet"
  return value
}

export function displayClientStatus(value: string | null | undefined) {
  if (!value) return "-"
  if (value === "Healthy") return "Good"
  return value
}
