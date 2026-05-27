"use client"

import { useFormStatus } from "react-dom"

import { Button } from "@/components/ui/button"

type FormSubmitButtonProps = {
  idleLabel: string
  pendingLabel: string
  className?: string
  variant?: "default" | "secondary" | "ghost" | "danger"
  size?: "default" | "sm" | "xs" | "lg"
}

export function FormSubmitButton({
  idleLabel,
  pendingLabel,
  className,
  variant = "default",
  size = "sm",
}: FormSubmitButtonProps) {
  const { pending } = useFormStatus()

  return (
    <Button type="submit" className={className} variant={variant} size={size} disabled={pending} aria-busy={pending}>
      {pending ? pendingLabel : idleLabel}
    </Button>
  )
}
