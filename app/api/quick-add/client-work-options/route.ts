import { NextRequest, NextResponse } from "next/server"

import { requireAuth } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    await requireAuth()
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const clientId = (request.nextUrl.searchParams.get("client_id") ?? "").trim()
  if (!clientId) {
    return NextResponse.json({ deliverables: [], tasks: [] })
  }

  try {
    const supabase = await createClient()

    const [{ data: deliverables, error: deliverablesError }, { data: tasks, error: tasksError }] = await Promise.all([
      supabase
        .from("deliverables")
        .select("deliverable_id, deliverable_name")
        .eq("client_id", clientId)
        .order("due_date", { ascending: true })
        .limit(100),
      supabase
        .from("tasks")
        .select("task_id, task_title")
        .eq("client_id", clientId)
        .order("due_date", { ascending: true })
        .limit(100),
    ])

    if (deliverablesError || tasksError) {
      throw new Error(deliverablesError?.message ?? tasksError?.message ?? "Failed to load work options")
    }

    return NextResponse.json({
      deliverables: (deliverables ?? []).map((row) => ({
        id: row.deliverable_id as string,
        name: row.deliverable_name as string,
      })),
      tasks: (tasks ?? []).map((row) => ({
        id: row.task_id as string,
        name: row.task_title as string,
      })),
    })
  } catch {
    return NextResponse.json({ error: "Failed to load client work options" }, { status: 500 })
  }
}
