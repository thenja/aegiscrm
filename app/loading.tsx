export default function RootLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-page-bg">
      <div className="flex items-center gap-3 rounded-lg border border-border bg-white px-4 py-3 text-sm text-text-secondary shadow-sm">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-navy" />
        Loading page...
      </div>
    </div>
  )
}
