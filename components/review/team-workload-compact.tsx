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
    <div className="overflow-x-auto">
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
      {rows.length > limit ? (
        <p className="mt-1.5 text-xs text-text-secondary">Showing top {limit} of {rows.length} owners.</p>
      ) : null}
    </div>
  )
}
