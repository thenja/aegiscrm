import { NextResponse } from "next/server"

import { requireAuth } from "@/lib/auth"
import { listClients } from "@/lib/data/clients"
import { listActiveUsersForSelect } from "@/lib/data/users"

export async function GET() {
  try {
    await requireAuth()
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const [clients, users] = await Promise.all([listClients({}), listActiveUsersForSelect()])
    return NextResponse.json({
      clients: clients.map((client) => ({
        client_id: client.client_id,
        client_name: client.client_name,
      })),
      users: users.map((user) => ({
        user_id: user.user_id,
        full_name: user.full_name,
      })),
    })
  } catch {
    return NextResponse.json({ error: "Failed to load quick add options" }, { status: 500 })
  }
}
