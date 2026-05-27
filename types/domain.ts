import type { AppRole } from "@/types/roles"

export const CLIENT_STATUSES = ["Active", "Dormant", "Prospect", "Terminated"] as const
export const ENGAGEMENT_TYPES = ["IPO", "Retainer", "Ad Hoc", "Annual Report", "Event Only"] as const
export const CLIENT_TYPES = [
  "IPO Client",
  "Listed Company Retainer",
  "Monthly PR Retainer",
  "Project-Only Client",
  "Dormant Client",
] as const
export const MARKET_TYPES = ["Main", "ACE", "LEAP", "Not Listed"] as const
export const HEALTH_STATUSES = ["Healthy", "At Risk", "Critical"] as const
export const SERVICING_FREQUENCIES = ["2-3x Per Week", "Weekly", "Fortnightly", "Monthly", "As Needed"] as const
export const CONTACT_TYPES = ["Client", "Sponsor", "Adviser", "Lawyer", "Auditor", "Printer", "Banker", "Other"] as const
export const EXTERNAL_CONTACT_TYPES = ["Media", "Analyst", "Investor", "Other"] as const
export const ATTENDANCE_EVENT_TYPES = [
  "IPO Prospectus Launch",
  "Bursa Listing Ceremony",
  "Analyst Briefing",
  "Media Event",
  "Other",
] as const
export const ATTENDANCE_SEATING_MODES = ["With Table", "Without Table"] as const
export const ATTENDANCE_EVENT_STATUSES = ["Draft", "Active", "Closed"] as const
export const EVENT_GUEST_CATEGORIES = ["VIP", "Media", "Analyst", "Management", "Guest", "Staff", "Other"] as const
export const EVENT_GUEST_ATTENDANCE_STATUSES = ["Not Arrived", "Attended"] as const
export const EVENT_GUEST_RSVP_STATUSES = ["Unknown", "Invited", "Confirmed", "Declined"] as const
export const EVENT_ATTENDANCE_ACTIONS = ["Check In", "Undo Check In", "Edit Guest"] as const
export const EVENT_ACTION_SOURCES = ["Kiosk", "Internal"] as const
export const EVENT_IMPORT_STATUSES = ["Previewed", "Imported", "Failed", "Cancelled"] as const
export const EVENT_DUPLICATE_MODES = ["Skip Duplicate", "Import Anyway"] as const
export const COMM_CHANNELS = ["WhatsApp", "Email", "Phone Call", "Video Call", "In-Person Meeting", "Client Visit", "Other"] as const
export const COMM_DIRECTIONS = ["Outbound", "Inbound"] as const
export const PRIORITY_LEVELS = ["Critical", "High", "Medium", "Low"] as const
export const CATEGORY_TYPES = [
  "PR",
  "IR",
  "IPO",
  "Annual Report",
  "Event",
  "Media",
  "Investor Deck",
  "Factsheet",
  "Analyst Briefing",
  "Other",
] as const
export const RECURRENCE_TYPES = ["Weekly", "Fortnightly", "Monthly", "Quarterly", "Annually", "One-Off"] as const
export const REVIEW_STATUSES = ["Pending Review", "Approved", "Returned for Amendment"] as const
export const CONFIRMATION_STATUSES = ["Confirmed", "Not Yet Confirmed", "Not Required"] as const
export const DELIVERABLE_STATUSES = [
  "Not Started",
  "In Progress",
  "Pending Internal Review",
  "Pending Client Approval",
  "Pending External Party",
  "At Risk",
  "Overdue",
  "Completed",
  "Not Required This Month",
  "Deferred",
  "Pending Client Data",
  "Cancelled",
  "On Hold",
] as const
export const TASK_STATUSES = [
  "Not Started",
  "In Progress",
  "Pending Internal Review",
  "Pending Client Approval",
  "Pending External Party",
  "At Risk",
  "Overdue",
  "Completed",
  "Cancelled",
  "On Hold",
] as const
export const EXTERNAL_INVOLVEMENT_PURPOSES = [
  "Analyst Briefing",
  "Media Interview",
  "Press Release",
  "RSVP",
  "Follow-up",
  "Coverage",
  "Other",
] as const
export const EXTERNAL_INVOLVEMENT_STATUSES = [
  "Invited",
  "Confirmed",
  "Attended",
  "Scheduled",
  "Done",
  "Follow-up Needed",
  "Declined",
  "Cancelled",
] as const

export type ClientStatus = (typeof CLIENT_STATUSES)[number]
export type EngagementType = (typeof ENGAGEMENT_TYPES)[number]
export type ClientType = (typeof CLIENT_TYPES)[number]
export type MarketType = (typeof MARKET_TYPES)[number]
export type HealthStatus = (typeof HEALTH_STATUSES)[number]
export type ServicingFrequency = (typeof SERVICING_FREQUENCIES)[number]
export type ContactType = (typeof CONTACT_TYPES)[number]
export type ExternalContactType = (typeof EXTERNAL_CONTACT_TYPES)[number]
export type AttendanceEventType = (typeof ATTENDANCE_EVENT_TYPES)[number]
export type AttendanceSeatingMode = (typeof ATTENDANCE_SEATING_MODES)[number]
export type AttendanceEventStatus = (typeof ATTENDANCE_EVENT_STATUSES)[number]
export type EventGuestCategory = (typeof EVENT_GUEST_CATEGORIES)[number]
export type EventGuestAttendanceStatus = (typeof EVENT_GUEST_ATTENDANCE_STATUSES)[number]
export type EventGuestRsvpStatus = (typeof EVENT_GUEST_RSVP_STATUSES)[number]
export type EventAttendanceAction = (typeof EVENT_ATTENDANCE_ACTIONS)[number]
export type EventActionSource = (typeof EVENT_ACTION_SOURCES)[number]
export type EventImportStatus = (typeof EVENT_IMPORT_STATUSES)[number]
export type EventDuplicateMode = (typeof EVENT_DUPLICATE_MODES)[number]
export type CommChannel = (typeof COMM_CHANNELS)[number]
export type CommDirection = (typeof COMM_DIRECTIONS)[number]
export type PriorityLevel = (typeof PRIORITY_LEVELS)[number]
export type CategoryType = (typeof CATEGORY_TYPES)[number]
export type RecurrenceType = (typeof RECURRENCE_TYPES)[number]
export type ReviewStatus = (typeof REVIEW_STATUSES)[number]
export type ConfirmationStatus = (typeof CONFIRMATION_STATUSES)[number]
export type DeliverableStatus = (typeof DELIVERABLE_STATUSES)[number]
export type TaskStatus = (typeof TASK_STATUSES)[number]
export type ExternalInvolvementPurpose = (typeof EXTERNAL_INVOLVEMENT_PURPOSES)[number]
export type ExternalInvolvementStatus = (typeof EXTERNAL_INVOLVEMENT_STATUSES)[number]

export type UserRow = {
  user_id: string
  full_name: string
  email: string
  role: AppRole
  department: string | null
  is_active: boolean
  created_at?: string
}

export type ClientRow = {
  client_id: string
  client_name: string
  stock_code: string | null
  market: MarketType | null
  sector: string | null
  engagement_type: EngagementType
  client_type: ClientType
  status: ClientStatus
  internal_pic_id: string
  backup_pic_id: string | null
  scope_of_work: string
  health_status: HealthStatus
  servicing_frequency: ServicingFrequency
  required_monthly_contacts: number
  last_client_touchpoint: string | null
  next_scheduled_touchpoint: string | null
  touchpoint_overdue_days: number
  contract_start: string | null
  contract_end: string | null
  monthly_fee: number | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type ContactRow = {
  contact_id: string
  client_id: string
  contact_name: string
  designation: string | null
  email: string | null
  phone: string | null
  contact_type: ContactType
  is_primary: boolean
  notes: string | null
  created_at: string
}

export type ClientCommunicationLogRow = {
  comm_log_id: string
  client_id: string
  comm_date: string
  channel: CommChannel
  summary: string
  counterpart_name: string
  counterpart_designation: string | null
  direction: CommDirection
  logged_by: string
  reference_type: "Deliverable" | "Task" | "Approval" | "None" | null
  reference_id: string | null
  attachments: string | null
  created_at: string
}

export type DeliverableRow = {
  deliverable_id: string
  client_id: string
  deliverable_name: string
  category: CategoryType
  recurrence: RecurrenceType
  due_date: string
  pic_id: string
  status: DeliverableStatus
  priority: PriorityLevel
  requires_client_approval: boolean
  requires_internal_review: boolean
  exception_reason: string | null
  deferred_to_date: string | null
  pending_data_comm_log_id: string | null
  reviewer_id: string | null
  review_deadline: string | null
  review_status: ReviewStatus | null
  review_comments: string | null
  version_number: string | null
  completion_date: string | null
  final_file_link: string | null
  sent_date: string | null
  sent_by_id: string | null
  sent_to_name: string | null
  client_confirmation: ConfirmationStatus | null
  proof_link: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type TaskRow = {
  task_id: string
  client_id: string | null
  task_title: string
  description: string | null
  requester: string | null
  pic_id: string
  priority: PriorityLevel
  due_date: string
  status: TaskStatus
  category: CategoryType | null
  requires_client_approval: boolean
  requires_internal_review: boolean
  reviewer_id: string | null
  review_deadline: string | null
  review_status: ReviewStatus | null
  review_comments: string | null
  version_number: string | null
  completion_date: string | null
  final_file_link: string | null
  sent_date: string | null
  sent_by_id: string | null
  sent_to_name: string | null
  client_confirmation: ConfirmationStatus | null
  proof_link: string | null
  attachments: string | null
  created_at: string
  updated_at: string
}

export type ExternalContactRow = {
  external_contact_id: string
  name: string
  organisation: string | null
  contact_type: ExternalContactType
  designation: string | null
  email: string | null
  phone: string | null
  sector_beat: string | null
  language: string | null
  country_market: string | null
  relationship_status: string | null
  notes: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export type WorkItemExternalContactRow = {
  link_id: string
  client_id: string
  external_contact_id: string
  deliverable_id: string | null
  task_id: string | null
  purpose: ExternalInvolvementPurpose
  involvement_status: ExternalInvolvementStatus
  scheduled_date: string | null
  completed_date: string | null
  outcome: string | null
  notes: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export type EventRow = {
  event_id: string
  client_id: string
  event_name: string
  event_date: string
  venue: string | null
  event_type: AttendanceEventType
  seating_mode: AttendanceSeatingMode
  event_code: string
  status: AttendanceEventStatus
  starts_at: string | null
  ends_at: string | null
  notes: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export type EventGuestRow = {
  guest_id: string
  event_id: string
  guest_name: string
  company: string | null
  designation: string | null
  category: EventGuestCategory
  email: string | null
  phone: string | null
  rsvp_status: EventGuestRsvpStatus
  table_no: string | null
  seat_no: string | null
  remarks: string | null
  attendance_status: EventGuestAttendanceStatus
  checked_in_at: string | null
  checked_in_by_nickname: string | null
  checked_in_session_id: string | null
  created_at: string
  updated_at: string
}

export type EventAttendanceLogRow = {
  attendance_log_id: string
  event_id: string
  guest_id: string
  action: EventAttendanceAction
  staff_nickname: string
  acted_by_user_id: string | null
  acted_at: string
  notes: string | null
  session_id: string | null
  device_info: string | null
  source: EventActionSource
}

export type EventImportBatchRow = {
  import_batch_id: string
  event_id: string
  uploaded_by: string
  file_name: string
  status: EventImportStatus
  total_rows: number
  valid_rows: number
  duplicate_rows: number
  imported_rows: number
  skipped_rows: number
  duplicate_mode: EventDuplicateMode | null
  summary: Record<string, unknown>
  created_at: string
}

