import {
  CATEGORY_TYPES,
  CLIENT_STATUSES,
  CLIENT_TYPES,
  COMM_CHANNELS,
  COMM_DIRECTIONS,
  CONFIRMATION_STATUSES,
  CONTACT_TYPES,
  DELIVERABLE_STATUSES,
  ENGAGEMENT_TYPES,
  EVENT_ATTENDANCE_ACTIONS,
  EVENT_DUPLICATE_MODES,
  EVENT_GUEST_ATTENDANCE_STATUSES,
  EVENT_GUEST_CATEGORIES,
  EVENT_GUEST_RSVP_STATUSES,
  EVENT_IMPORT_STATUSES,
  EVENT_ACTION_SOURCES,
  ATTENDANCE_EVENT_STATUSES,
  ATTENDANCE_EVENT_TYPES,
  ATTENDANCE_SEATING_MODES,
  EXTERNAL_CONTACT_TYPES,
  EXTERNAL_INVOLVEMENT_PURPOSES,
  EXTERNAL_INVOLVEMENT_STATUSES,
  HEALTH_STATUSES,
  MARKET_TYPES,
  PRIORITY_LEVELS,
  RECURRENCE_TYPES,
  REVIEW_STATUSES,
  SERVICING_FREQUENCIES,
  TASK_STATUSES,
} from "@/types/domain"
import { APP_ROLES } from "@/types/roles"
import { getSingaporeTodayIsoDate } from "@/lib/date"

type Parseable<T> = {
  parse: (input: unknown) => T
}

function isRecord(input: unknown): input is Record<string, unknown> {
  return typeof input === "object" && input !== null
}

function getString(input: Record<string, unknown>, key: string, required = false) {
  const value = input[key]
  const str = typeof value === "string" ? value.trim() : ""
  if (required && str.length === 0) {
    throw new Error(`${key} is required`)
  }
  return str
}

function getNullableString(input: Record<string, unknown>, key: string) {
  const value = getString(input, key, false)
  return value.length > 0 ? value : null
}

function getBoolean(input: Record<string, unknown>, key: string) {
  const value = input[key]
  if (typeof value !== "boolean") {
    throw new Error(`${key} must be boolean`)
  }
  return value
}

function getBooleanDefaultFalse(input: Record<string, unknown>, key: string) {
  const value = input[key]
  if (typeof value === "boolean") return value
  return false
}

function getNumber(input: Record<string, unknown>, key: string, min?: number) {
  const value = input[key]
  if (typeof value !== "number" || Number.isNaN(value)) {
    throw new Error(`${key} must be number`)
  }
  if (min !== undefined && value < min) {
    throw new Error(`${key} must be >= ${min}`)
  }
  return value
}

function getEnumValue<T extends readonly string[]>(
  input: Record<string, unknown>,
  key: string,
  values: T,
  nullable = false
): T[number] | null {
  const value = input[key]
  if (nullable && value === null) {
    return null
  }
  if (typeof value !== "string") {
    throw new Error(`${key} must be string`)
  }
  if (!values.includes(value)) {
    throw new Error(`${key} has invalid value`)
  }
  return value as T[number]
}

function getEnumOrDefault<T extends readonly string[]>(
  input: Record<string, unknown>,
  key: string,
  values: T,
  fallback: T[number]
): T[number] {
  const value = input[key]
  if (typeof value !== "string" || value.length === 0) {
    return fallback
  }
  if (!values.includes(value)) {
    throw new Error(`${key} has invalid value`)
  }
  return value as T[number]
}

export type AdminUserCreateInput = {
  email: string
  full_name: string
  role: (typeof APP_ROLES)[number]
  department: string | null
  temporary_password: string
}

export type AdminUserUpdateInput = {
  user_id: string
  full_name: string
  role: (typeof APP_ROLES)[number]
  department: string | null
  is_active: boolean
}

export type ClientInput = {
  client_name: string
  stock_code: string | null
  market: (typeof MARKET_TYPES)[number] | null
  sector: string | null
  engagement_type: (typeof ENGAGEMENT_TYPES)[number]
  client_type: (typeof CLIENT_TYPES)[number]
  status: (typeof CLIENT_STATUSES)[number]
  internal_pic_id: string
  backup_pic_id: string | null
  scope_of_work: string
  health_status: (typeof HEALTH_STATUSES)[number]
  servicing_frequency: (typeof SERVICING_FREQUENCIES)[number]
  required_monthly_contacts: number
  touchpoint_overdue_days: number
  contract_start: string | null
  contract_end: string | null
  monthly_fee: number | null
  notes: string | null
}

export type ContactInput = {
  client_id: string
  contact_name: string
  designation: string | null
  email: string | null
  phone: string | null
  contact_type: (typeof CONTACT_TYPES)[number]
  is_primary: boolean
  notes: string | null
}

export type DeliverableInput = {
  client_id: string
  deliverable_name: string
  category: (typeof CATEGORY_TYPES)[number]
  recurrence: (typeof RECURRENCE_TYPES)[number]
  due_date: string
  pic_id: string
  status: (typeof DELIVERABLE_STATUSES)[number]
  priority: (typeof PRIORITY_LEVELS)[number]
  requires_client_approval: boolean
  requires_internal_review: boolean
  exception_reason: string | null
  deferred_to_date: string | null
  pending_data_comm_log_id: string | null
  reviewer_id: string | null
  review_deadline: string | null
  review_status: (typeof REVIEW_STATUSES)[number] | null
  review_comments: string | null
  version_number: string | null
  completion_date: string | null
  final_file_link: string | null
  sent_date: string | null
  sent_by_id: string | null
  sent_to_name: string | null
  client_confirmation: (typeof CONFIRMATION_STATUSES)[number] | null
  proof_link: string | null
  notes: string | null
}

export type TaskInput = {
  client_id: string | null
  task_title: string
  description: string | null
  requester: string | null
  pic_id: string
  priority: (typeof PRIORITY_LEVELS)[number]
  due_date: string
  status: (typeof TASK_STATUSES)[number]
  category: (typeof CATEGORY_TYPES)[number] | null
  requires_client_approval: boolean
  requires_internal_review: boolean
  reviewer_id: string | null
  review_deadline: string | null
  review_status: (typeof REVIEW_STATUSES)[number] | null
  review_comments: string | null
  version_number: string | null
  completion_date: string | null
  final_file_link: string | null
  sent_date: string | null
  sent_by_id: string | null
  sent_to_name: string | null
  client_confirmation: (typeof CONFIRMATION_STATUSES)[number] | null
  proof_link: string | null
  attachments: string | null
}

export type CommunicationLogInput = {
  client_id: string
  communication_date: string
  channel: (typeof COMM_CHANNELS)[number]
  direction: (typeof COMM_DIRECTIONS)[number]
  counterpart_name: string
  counterpart_designation: string | null
  summary: string
  related_deliverable_id: string | null
  related_task_id: string | null
  attachment_link: string | null
}

export type ExternalContactInput = {
  name: string
  organisation: string | null
  contact_type: (typeof EXTERNAL_CONTACT_TYPES)[number]
  designation: string | null
  email: string | null
  phone: string | null
  sector_beat: string | null
  language: string | null
  country_market: string | null
  relationship_status: string | null
  notes: string | null
  is_active: boolean
}

export type WorkItemExternalContactInput = {
  client_id: string
  external_contact_id: string
  deliverable_id: string | null
  task_id: string | null
  purpose: (typeof EXTERNAL_INVOLVEMENT_PURPOSES)[number]
  involvement_status: (typeof EXTERNAL_INVOLVEMENT_STATUSES)[number]
  scheduled_date: string | null
  completed_date: string | null
  outcome: string | null
  notes: string | null
}

export type EventInput = {
  client_id: string
  event_name: string
  event_date: string
  venue: string | null
  event_type: (typeof ATTENDANCE_EVENT_TYPES)[number]
  seating_mode: (typeof ATTENDANCE_SEATING_MODES)[number]
  event_code: string
  status: (typeof ATTENDANCE_EVENT_STATUSES)[number]
  starts_at: string | null
  ends_at: string | null
  notes: string | null
}

export type EventGuestInput = {
  event_id: string
  guest_name: string
  company: string | null
  designation: string | null
  category: (typeof EVENT_GUEST_CATEGORIES)[number]
  email: string | null
  phone: string | null
  rsvp_status: (typeof EVENT_GUEST_RSVP_STATUSES)[number]
  table_no: string | null
  seat_no: string | null
  remarks: string | null
  attendance_status: (typeof EVENT_GUEST_ATTENDANCE_STATUSES)[number]
}

export const adminUserCreateSchema: Parseable<AdminUserCreateInput> = {
  parse(input: unknown) {
    if (!isRecord(input)) throw new Error("Invalid payload")
    const email = getString(input, "email", true)
    const fullName = getString(input, "full_name", true)
    const role = getEnumValue(input, "role", APP_ROLES)
    const department = getNullableString(input, "department")
    const tempPassword = getString(input, "temporary_password", true)

    if (!email.includes("@")) throw new Error("email is invalid")
    if (tempPassword.length < 8) throw new Error("temporary_password must be at least 8 chars")

    return {
      email,
      full_name: fullName,
      role: role!,
      department,
      temporary_password: tempPassword,
    }
  },
}

export const adminUserUpdateSchema: Parseable<AdminUserUpdateInput> = {
  parse(input: unknown) {
    if (!isRecord(input)) throw new Error("Invalid payload")
    const userId = getString(input, "user_id", true)
    const fullName = getString(input, "full_name", true)
    const role = getEnumValue(input, "role", APP_ROLES)
    const department = getNullableString(input, "department")
    const isActive = getBoolean(input, "is_active")

    return {
      user_id: userId,
      full_name: fullName,
      role: role!,
      department,
      is_active: isActive,
    }
  },
}

export const clientSchema: Parseable<ClientInput> = {
  parse(input: unknown) {
    if (!isRecord(input)) throw new Error("Invalid payload")
    return {
      client_name: getString(input, "client_name", true),
      stock_code: getNullableString(input, "stock_code"),
      market: getEnumValue(input, "market", MARKET_TYPES, true),
      sector: getNullableString(input, "sector"),
      engagement_type: getEnumValue(input, "engagement_type", ENGAGEMENT_TYPES)!,
      client_type: getEnumValue(input, "client_type", CLIENT_TYPES)!,
      status: getEnumValue(input, "status", CLIENT_STATUSES)!,
      internal_pic_id: getString(input, "internal_pic_id", true),
      backup_pic_id: getNullableString(input, "backup_pic_id"),
      scope_of_work: getString(input, "scope_of_work", true),
      health_status: getEnumValue(input, "health_status", HEALTH_STATUSES)!,
      servicing_frequency: getEnumValue(input, "servicing_frequency", SERVICING_FREQUENCIES)!,
      required_monthly_contacts: getNumber(input, "required_monthly_contacts", 0),
      touchpoint_overdue_days: getNumber(input, "touchpoint_overdue_days", 1),
      contract_start: getNullableString(input, "contract_start"),
      contract_end: getNullableString(input, "contract_end"),
      monthly_fee: input.monthly_fee === null ? null : getNumber(input, "monthly_fee", 0),
      notes: getNullableString(input, "notes"),
    }
  },
}

export const contactSchema: Parseable<ContactInput> = {
  parse(input: unknown) {
    if (!isRecord(input)) throw new Error("Invalid payload")
    return {
      client_id: getString(input, "client_id", true),
      contact_name: getString(input, "contact_name", true),
      designation: getNullableString(input, "designation"),
      email: getNullableString(input, "email"),
      phone: getNullableString(input, "phone"),
      contact_type: getEnumValue(input, "contact_type", CONTACT_TYPES)!,
      is_primary: getBoolean(input, "is_primary"),
      notes: getNullableString(input, "notes"),
    }
  },
}

export const deliverableSchema: Parseable<DeliverableInput> = {
  parse(input: unknown) {
    if (!isRecord(input)) throw new Error("Invalid payload")

    return {
      client_id: getString(input, "client_id", true),
      deliverable_name: getString(input, "deliverable_name", true),
      category: getEnumOrDefault(input, "category", CATEGORY_TYPES, "Other"),
      recurrence: getEnumOrDefault(input, "recurrence", RECURRENCE_TYPES, "Monthly"),
      due_date: getString(input, "due_date", true),
      pic_id: getString(input, "pic_id", true),
      status: getEnumValue(input, "status", DELIVERABLE_STATUSES)!,
      priority: getEnumValue(input, "priority", PRIORITY_LEVELS)!,
      requires_client_approval: getBooleanDefaultFalse(input, "requires_client_approval"),
      requires_internal_review: getBooleanDefaultFalse(input, "requires_internal_review"),
      exception_reason: getNullableString(input, "exception_reason"),
      deferred_to_date: getNullableString(input, "deferred_to_date"),
      pending_data_comm_log_id: getNullableString(input, "pending_data_comm_log_id"),
      reviewer_id: getNullableString(input, "reviewer_id"),
      review_deadline: getNullableString(input, "review_deadline"),
      review_status: getEnumValue(input, "review_status", REVIEW_STATUSES, true),
      review_comments: getNullableString(input, "review_comments"),
      version_number: getNullableString(input, "version_number"),
      completion_date: getNullableString(input, "completion_date"),
      final_file_link: getNullableString(input, "final_file_link"),
      sent_date: getNullableString(input, "sent_date"),
      sent_by_id: getNullableString(input, "sent_by_id"),
      sent_to_name: getNullableString(input, "sent_to_name"),
      client_confirmation: getEnumValue(input, "client_confirmation", CONFIRMATION_STATUSES, true),
      proof_link: getNullableString(input, "proof_link"),
      notes: getNullableString(input, "notes"),
    }
  },
}

export const taskSchema: Parseable<TaskInput> = {
  parse(input: unknown) {
    if (!isRecord(input)) throw new Error("Invalid payload")

    return {
      client_id: getNullableString(input, "client_id"),
      task_title: getString(input, "task_title", true),
      description: getNullableString(input, "description"),
      requester: getNullableString(input, "requester"),
      pic_id: getString(input, "pic_id", true),
      priority: getEnumValue(input, "priority", PRIORITY_LEVELS)!,
      due_date: getString(input, "due_date", true),
      status: getEnumValue(input, "status", TASK_STATUSES)!,
      category: getEnumValue(input, "category", CATEGORY_TYPES, true),
      requires_client_approval: getBooleanDefaultFalse(input, "requires_client_approval"),
      requires_internal_review: getBooleanDefaultFalse(input, "requires_internal_review"),
      reviewer_id: getNullableString(input, "reviewer_id"),
      review_deadline: getNullableString(input, "review_deadline"),
      review_status: getEnumValue(input, "review_status", REVIEW_STATUSES, true),
      review_comments: getNullableString(input, "review_comments"),
      version_number: getNullableString(input, "version_number"),
      completion_date: getNullableString(input, "completion_date"),
      final_file_link: getNullableString(input, "final_file_link"),
      sent_date: getNullableString(input, "sent_date"),
      sent_by_id: getNullableString(input, "sent_by_id"),
      sent_to_name: getNullableString(input, "sent_to_name"),
      client_confirmation: getEnumValue(input, "client_confirmation", CONFIRMATION_STATUSES, true),
      proof_link: getNullableString(input, "proof_link"),
      attachments: getNullableString(input, "attachments"),
    }
  },
}

function toUtcDateOnly(value: string) {
  const [year, month, day] = value.split("-").map(Number)
  if (!year || !month || !day) return NaN
  return Date.UTC(year, month - 1, day)
}

export const communicationLogSchema: Parseable<CommunicationLogInput> = {
  parse(input: unknown) {
    if (!isRecord(input)) throw new Error("Invalid payload")

    const communicationDate = getString(input, "communication_date", true)
    const todayIso = getSingaporeTodayIsoDate()
    const inputDateValue = toUtcDateOnly(communicationDate)
    const todayValue = toUtcDateOnly(todayIso)

    if (Number.isNaN(inputDateValue)) {
      throw new Error("communication_date is invalid")
    }

    if (inputDateValue > todayValue) {
      throw new Error("communication_date cannot be in the future")
    }

    return {
      client_id: getString(input, "client_id", true),
      communication_date: communicationDate,
      channel: getEnumValue(input, "channel", COMM_CHANNELS)!,
      direction: getEnumValue(input, "direction", COMM_DIRECTIONS)!,
      counterpart_name: getString(input, "counterpart_name", true),
      counterpart_designation: getNullableString(input, "counterpart_designation"),
      summary: getString(input, "summary", true),
      related_deliverable_id: getNullableString(input, "related_deliverable_id"),
      related_task_id: getNullableString(input, "related_task_id"),
      attachment_link: getNullableString(input, "attachment_link"),
    }
  },
}

export const externalContactSchema: Parseable<ExternalContactInput> = {
  parse(input: unknown) {
    if (!isRecord(input)) throw new Error("Invalid payload")

    const email = getNullableString(input, "email")
    if (email && !email.includes("@")) {
      throw new Error("email is invalid")
    }

    return {
      name: getString(input, "name", true),
      organisation: getNullableString(input, "organisation"),
      contact_type: getEnumValue(input, "contact_type", EXTERNAL_CONTACT_TYPES)!,
      designation: getNullableString(input, "designation"),
      email,
      phone: getNullableString(input, "phone"),
      sector_beat: getNullableString(input, "sector_beat"),
      language: getNullableString(input, "language"),
      country_market: getNullableString(input, "country_market"),
      relationship_status: getNullableString(input, "relationship_status"),
      notes: getNullableString(input, "notes"),
      is_active: getBooleanDefaultFalse(input, "is_active") || input.is_active === undefined,
    }
  },
}

export const workItemExternalContactSchema: Parseable<WorkItemExternalContactInput> = {
  parse(input: unknown) {
    if (!isRecord(input)) throw new Error("Invalid payload")

    const deliverableId = getNullableString(input, "deliverable_id")
    const taskId = getNullableString(input, "task_id")

    if (!deliverableId && !taskId) {
      throw new Error("Either deliverable_id or task_id is required")
    }
    if (deliverableId && taskId) {
      throw new Error("Only one work item target is allowed per People Involved link")
    }

    return {
      client_id: getString(input, "client_id", true),
      external_contact_id: getString(input, "external_contact_id", true),
      deliverable_id: deliverableId,
      task_id: taskId,
      purpose: getEnumOrDefault(input, "purpose", EXTERNAL_INVOLVEMENT_PURPOSES, "Other"),
      involvement_status: getEnumOrDefault(input, "involvement_status", EXTERNAL_INVOLVEMENT_STATUSES, "Invited"),
      scheduled_date: getNullableString(input, "scheduled_date"),
      completed_date: getNullableString(input, "completed_date"),
      outcome: getNullableString(input, "outcome"),
      notes: getNullableString(input, "notes"),
    }
  },
}

export const eventSchema: Parseable<EventInput> = {
  parse(input: unknown) {
    if (!isRecord(input)) throw new Error("Invalid payload")

    const eventCode = getString(input, "event_code", true).toUpperCase()
    if (!/^[A-Z0-9-]{6,24}$/.test(eventCode)) {
      throw new Error("event_code format is invalid")
    }

    return {
      client_id: getString(input, "client_id", true),
      event_name: getString(input, "event_name", true),
      event_date: getString(input, "event_date", true),
      venue: getNullableString(input, "venue"),
      event_type: getEnumValue(input, "event_type", ATTENDANCE_EVENT_TYPES)!,
      seating_mode: getEnumValue(input, "seating_mode", ATTENDANCE_SEATING_MODES)!,
      event_code: eventCode,
      status: getEnumValue(input, "status", ATTENDANCE_EVENT_STATUSES)!,
      starts_at: getNullableString(input, "starts_at"),
      ends_at: getNullableString(input, "ends_at"),
      notes: getNullableString(input, "notes"),
    }
  },
}

export const eventGuestSchema: Parseable<EventGuestInput> = {
  parse(input: unknown) {
    if (!isRecord(input)) throw new Error("Invalid payload")
    const email = getNullableString(input, "email")
    if (email && !email.includes("@")) {
      throw new Error("email is invalid")
    }

    return {
      event_id: getString(input, "event_id", true),
      guest_name: getString(input, "guest_name", true),
      company: getNullableString(input, "company"),
      designation: getNullableString(input, "designation"),
      category: getEnumValue(input, "category", EVENT_GUEST_CATEGORIES)!,
      email,
      phone: getNullableString(input, "phone"),
      rsvp_status: getEnumOrDefault(input, "rsvp_status", EVENT_GUEST_RSVP_STATUSES, "Unknown"),
      table_no: getNullableString(input, "table_no"),
      seat_no: getNullableString(input, "seat_no"),
      remarks: getNullableString(input, "remarks"),
      attendance_status: getEnumOrDefault(
        input,
        "attendance_status",
        EVENT_GUEST_ATTENDANCE_STATUSES,
        "Not Arrived"
      ),
    }
  },
}

export type EventAttendanceLogInput = {
  event_id: string
  guest_id: string
  action: (typeof EVENT_ATTENDANCE_ACTIONS)[number]
  staff_nickname: string
  acted_by_user_id: string | null
  notes: string | null
  session_id: string | null
  device_info: string | null
  source: (typeof EVENT_ACTION_SOURCES)[number]
}

export const eventAttendanceLogSchema: Parseable<EventAttendanceLogInput> = {
  parse(input: unknown) {
    if (!isRecord(input)) throw new Error("Invalid payload")
    return {
      event_id: getString(input, "event_id", true),
      guest_id: getString(input, "guest_id", true),
      action: getEnumValue(input, "action", EVENT_ATTENDANCE_ACTIONS)!,
      staff_nickname: getString(input, "staff_nickname", true),
      acted_by_user_id: getNullableString(input, "acted_by_user_id"),
      notes: getNullableString(input, "notes"),
      session_id: getNullableString(input, "session_id"),
      device_info: getNullableString(input, "device_info"),
      source: getEnumValue(input, "source", EVENT_ACTION_SOURCES)!,
    }
  },
}

export type EventImportBatchInput = {
  event_id: string
  uploaded_by: string
  file_name: string
  status: (typeof EVENT_IMPORT_STATUSES)[number]
  total_rows: number
  valid_rows: number
  duplicate_rows: number
  imported_rows: number
  skipped_rows: number
  duplicate_mode: (typeof EVENT_DUPLICATE_MODES)[number] | null
  summary: Record<string, unknown>
}

export const eventImportBatchSchema: Parseable<EventImportBatchInput> = {
  parse(input: unknown) {
    if (!isRecord(input)) throw new Error("Invalid payload")
    return {
      event_id: getString(input, "event_id", true),
      uploaded_by: getString(input, "uploaded_by", true),
      file_name: getString(input, "file_name", true),
      status: getEnumValue(input, "status", EVENT_IMPORT_STATUSES)!,
      total_rows: getNumber(input, "total_rows", 0),
      valid_rows: getNumber(input, "valid_rows", 0),
      duplicate_rows: getNumber(input, "duplicate_rows", 0),
      imported_rows: getNumber(input, "imported_rows", 0),
      skipped_rows: getNumber(input, "skipped_rows", 0),
      duplicate_mode: getEnumValue(input, "duplicate_mode", EVENT_DUPLICATE_MODES, true),
      summary: isRecord(input.summary) ? input.summary : {},
    }
  },
}
