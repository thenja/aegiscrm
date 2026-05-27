"use client"

import Link from "next/link"
import { Search } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"

import type { GlobalSearchResult } from "@/lib/data/search"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

type SearchResponse = {
  results: GlobalSearchResult[]
}

const TYPE_ORDER: GlobalSearchResult["type"][] = [
  "Client",
  "Contact",
  "External Contact",
  "Event",
  "Event Guest",
  "Deliverable",
  "Task",
  "Communication",
]

function typeLabel(type: GlobalSearchResult["type"]) {
  if (type === "Communication") return "Communication Logs"
  if (type === "External Contact") return "External Contacts"
  if (type === "Event") return "Events"
  if (type === "Event Guest") return "Event Guests"
  return `${type}s`
}

export function GlobalSearch() {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<GlobalSearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const onClickOutside = (event: MouseEvent) => {
      if (!rootRef.current) return
      if (!rootRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", onClickOutside)
    return () => document.removeEventListener("mousedown", onClickOutside)
  }, [])

  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) {
      setResults([])
      setLoading(false)
      return
    }

    setLoading(true)
    const timeout = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(q)}`, {
          method: "GET",
          credentials: "same-origin",
        })
        if (!response.ok) {
          throw new Error("Search failed")
        }
        const payload = (await response.json()) as SearchResponse
        setResults(payload.results ?? [])
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 220)

    return () => {
      window.clearTimeout(timeout)
    }
  }, [query])

  const grouped = useMemo(() => {
    const map = new Map<GlobalSearchResult["type"], GlobalSearchResult[]>()
    TYPE_ORDER.forEach((type) => map.set(type, []))
    results.forEach((row) => {
      const bucket = map.get(row.type)
      if (!bucket) return
      bucket.push(row)
    })
    return map
  }, [results])

  return (
    <div ref={rootRef} className="relative min-w-0 flex-1">
      <div className="flex min-w-0 items-center gap-2 rounded-md border border-border bg-white px-2 shadow-sm">
        <Search size={15} className="shrink-0 text-text-secondary" />
        <Input
          className="h-8 min-w-0 flex-1 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
          placeholder="Search..."
          aria-label="Global Search"
          value={query}
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            setQuery(event.target.value)
            setOpen(true)
          }}
        />
      </div>

      <div
        className={cn(
          "absolute left-0 right-0 top-10 z-40 rounded-lg border border-border bg-white shadow-[0_12px_26px_rgba(15,23,42,0.14)]",
          open ? "block" : "hidden"
        )}
      >
        {query.trim().length < 2 ? (
          <p className="px-3 py-2 text-xs text-text-secondary">Type at least 2 characters to search.</p>
        ) : loading ? (
          <p className="px-3 py-2 text-xs text-text-secondary">Searching...</p>
        ) : results.length === 0 ? (
          <p className="px-3 py-2 text-xs text-text-secondary">No matching results.</p>
        ) : (
          <div className="max-h-[65vh] overflow-y-auto p-2">
            {TYPE_ORDER.map((type) => {
              const rows = grouped.get(type) ?? []
              if (rows.length === 0) return null
              return (
                <div key={type} className="mb-2 last:mb-0">
                  <p className="px-1 py-1 text-[11px] font-semibold uppercase tracking-wide text-text-secondary">
                    {typeLabel(type)}
                  </p>
                  <div className="space-y-1">
                    {rows.map((row) => (
                      <Link
                        key={`${row.type}-${row.id}`}
                        href={row.href}
                        className="block rounded-md border border-transparent px-2 py-1.5 hover:border-border hover:bg-slate-50"
                        onClick={() => setOpen(false)}
                      >
                        <p className="text-sm font-medium text-navy">{row.title}</p>
                        <p className="text-xs text-text-secondary">
                          {row.type}
                          {row.clientName
                            ? row.type === "External Contact"
                              ? ` | Organisation: ${row.clientName}`
                              : ` | Client: ${row.clientName}`
                            : ""}
                          {row.picName ? ` | PIC: ${row.picName}` : ""}
                          {row.status ? ` | Status: ${row.status}` : ""}
                        </p>
                      </Link>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
