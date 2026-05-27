export type FeedbackType = "success" | "error"

type FeedbackExtraParams = Record<string, string | undefined>

export function safeReturnTo(value: string | null | undefined, fallback: string) {
  if (!value) return fallback
  if (!value.startsWith("/")) return fallback
  return value
}

export function withFeedback(
  returnTo: string,
  type: FeedbackType,
  message: string,
  extraParams?: FeedbackExtraParams
) {
  const [path, query = ""] = returnTo.split("?")
  const params = new URLSearchParams(query)
  params.set("feedback", type)
  params.set("message", message)

  if (extraParams) {
    Object.entries(extraParams).forEach(([key, value]) => {
      if (!value) return
      params.set(key, value)
    })
  }

  const qs = params.toString()
  return qs.length > 0 ? `${path}?${qs}` : path
}
