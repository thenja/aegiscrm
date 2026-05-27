import { EmptyState } from "@/components/ui/patterns"
import type { TeamWorkloadRow } from "@/lib/data/dashboard"

export function TeamWorkloadCompact({
  rows,
  limit = 10,
}: {
  rows: TeamWorkloadRow[]
  limit?: number
}) {
  if (rows.length === 0) {
    return <EmptyState title="No team workload data" description="No open work items found for current scope." />
  }

  return (
    <>
      <div className="space-y-2 sm:hidden">
        {rows.slice(0, limit).map((row) => (
          <article key={row.picId} className="rounded-md border border-border/90 bg-white/90 p-2.5">
            <p className="text-sm font-semibold text-text-primary">{row.picName}</p>
            <p className="mt-1 text-xs text-text-secondary">
              Open: <span className="font-medium text-text-primary">{row.openCount}</span>
              {" | "}Overdue: <span className="font-medium text-text-primary">{row.overdueCount}</span>
              {" | "}Due Week: <span className="font-medium text-text-primary">{row.dueThisWeekCount}</span>
              {" | "}Pending: <span className="font-medium text-text-primary">{row.pendingCount}</span>
            </p>
          </article>
        ))}
      </div>

      <div className="hidden overflow-x-auto sm:block">
        <table className="min-w-full text-sm">
        <thead className="bg-slate-100 text-left text-[11px] uppercase tracking-wide text-text-secondary">
          <tr>
            <th className="px-2.5 py-1.5">Owner</th>
            <th className="px-2.5 py-1.5">Open</th>
            <th className="px-2.5 py-1.5">Overdue</th>
            <th className="px-2.5 py-1.5">Due Week</th>
            <th className="px-2.5 py-1.5">Pending</th>
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, limit).map((row) => (
            <tr key={row.picId} className="border-b border-border">
              <td className="px-2.5 py-2 font-medium text-text-primary">{row.picName}</td>
              <td className="px-2.5 py-2">{row.openCount}</td>
              <td className="px-2.5 py-2">{row.overdueCount}</td>
              <td className="px-2.5 py-2">{row.dueThisWeekCount}</td>
              <td className="px-2.5 py-2">{row.pendingCount}</td>
            </tr>
          ))}
        </tbody>
        </table>
      </div>
      {rows.length > limit ? (
        <p className="mt-1.5 text-xs text-text-secondary">Showing top {limit} of {rows.length} owners.</p>
      ) : null}
    </>
  )
}
