"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

import { Brand } from "@/components/layout/brand"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { createClient } from "@/lib/supabase/browser"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })

    if (signInError) {
      setError(signInError.message)
      setLoading(false)
      return
    }

    router.push("/")
    router.refresh()
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-100 px-4 py-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(37,99,235,0.18),transparent_45%),radial-gradient(circle_at_80%_10%,rgba(20,184,166,0.16),transparent_40%),linear-gradient(135deg,#eef2ff_0%,#f8fafc_55%,#ecfeff_100%)]" />
      <div className="pointer-events-none absolute -left-28 top-20 h-72 w-72 rounded-full bg-status-blue/15 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 bottom-8 h-80 w-80 rounded-full bg-status-green/15 blur-3xl" />
      <div className="pointer-events-none absolute inset-0 opacity-25 [background-image:linear-gradient(rgba(148,163,184,0.22)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.22)_1px,transparent_1px)] [background-size:28px_28px]" />

      <form
        onSubmit={onSubmit}
        className="relative z-10 w-full max-w-md space-y-4 rounded-2xl border border-white/70 bg-white/92 p-6 shadow-[0_18px_48px_rgba(15,23,42,0.16)] backdrop-blur"
      >
        <div className="space-y-3">
          <Brand className="items-center" logoWidth={220} />
          <div className="text-center">
            <p className="text-sm text-text-secondary">Sign in with your company account</p>
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium text-text-primary">Email</label>
          <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>

        <div className="space-y-2">
          <label htmlFor="password" className="text-sm font-medium text-text-primary">Password</label>
          <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>

        {error ? <p className="text-sm text-status-red">{error}</p> : null}

        <Button type="submit" className="h-10 w-full" disabled={loading}>
          {loading ? "Signing in..." : "Sign In"}
        </Button>
      </form>
    </main>
  )
}
