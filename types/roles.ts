export const APP_ROLES = ["Director", "Team Lead", "Team Member", "Admin"] as const

export type AppRole = (typeof APP_ROLES)[number]

export type UserProfile = {
  user_id: string
  full_name: string
  email: string
  role: AppRole
  department: string | null
  is_active: boolean
}
