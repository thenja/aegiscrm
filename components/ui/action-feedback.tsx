import { cn } from "@/lib/utils"

export function ActionFeedback({
  feedback,
  message,
}: {
  feedback?: string
  message?: string
}) {
  if (!feedback || !message) return null

  const isSuccess = feedback === "success"
  const text = isSuccess ? message : "Something went wrong. Please try again."

  return (
    <div
      className={cn(
        "rounded-md border px-4 py-3 text-sm",
        isSuccess
          ? "border-status-green bg-status-green-bg text-status-green"
          : "border-status-red bg-status-red-bg text-status-red"
      )}
      role="status"
      aria-live="polite"
    >
      {text}
    </div>
  )
}
