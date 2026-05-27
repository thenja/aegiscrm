export function PageLoading({ label = "Loading page..." }: { label?: string }) {
  return (
    <div className="flex min-h-[40vh] items-center justify-center px-4 py-10">
      <div className="flex items-center gap-3 rounded-lg border border-border bg-white px-4 py-3 shadow-sm">
        <span
          className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-navy"
          aria-hidden="true"
        />
        <p className="text-sm font-medium text-text-secondary">{label}</p>
      </div>
    </div>
  )
}
