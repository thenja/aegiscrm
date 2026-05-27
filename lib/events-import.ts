import type { EventDuplicateMode, EventGuestCategory, EventGuestRsvpStatus } from "@/types/domain"

export type ParsedGuestImportRow = {
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
}

export type DuplicateReason =
  | "same_name_company_existing"
  | "same_name_company_file"
  | "same_email_existing"
  | "same_email_file"
  | "same_phone_existing"
  | "same_phone_file"

export type DuplicateRowInfo = {
  row_number: number
  guest_name: string
  company: string | null
  reason: DuplicateReason
}

export type ImportPreviewResult = {
  file_name: string
  total_rows: number
  valid_rows: number
  invalid_rows: number
  duplicate_rows: number
  required_columns_missing: string[]
  rows: ParsedGuestImportRow[]
  duplicate_rows_info: DuplicateRowInfo[]
  invalid_rows_info: Array<{ row_number: number; error: string }>
}

const CATEGORY_VALUES = new Set<EventGuestCategory>(["VIP", "Media", "Analyst", "Management", "Guest", "Staff", "Other"])
const RSVP_VALUES = new Set<EventGuestRsvpStatus>(["Unknown", "Invited", "Confirmed", "Declined"])

const HEADER_ALIAS_MAP: Record<string, keyof ParsedGuestImportRow> = {
  guestname: "guest_name",
  name: "guest_name",
  company: "company",
  organisation: "company",
  organization: "company",
  designation: "designation",
  title: "designation",
  category: "category",
  guestcategory: "category",
  email: "email",
  phone: "phone",
  mobile: "phone",
  contactnumber: "phone",
  rsvp: "rsvp_status",
  rsvpstatus: "rsvp_status",
  tableno: "table_no",
  tablenumber: "table_no",
  table: "table_no",
  seatno: "seat_no",
  seatnumber: "seat_no",
  seat: "seat_no",
  remarks: "remarks",
  notes: "remarks",
}

function normalizeHeader(raw: string) {
  return raw.replace(/[\s_-]+/g, "").trim().toLowerCase()
}

function normalizeNullable(value: unknown) {
  if (value === null || value === undefined) return null
  const text = String(value).trim()
  return text.length > 0 ? text : null
}

function normalizeNameCompanyKey(name: string, company: string | null) {
  return `${name.trim().toLowerCase()}|${(company ?? "").trim().toLowerCase()}`
}

function normalizePhone(value: string | null) {
  if (!value) return null
  const digits = value.replace(/[^\d+]/g, "")
  return digits.length > 0 ? digits : null
}

function normalizeEmail(value: string | null) {
  if (!value) return null
  const normalized = value.trim().toLowerCase()
  return normalized.length > 0 ? normalized : null
}

function parseCategory(value: string | null): EventGuestCategory {
  if (!value) return "Guest"
  if (CATEGORY_VALUES.has(value as EventGuestCategory)) {
    return value as EventGuestCategory
  }
  return "Other"
}

function parseRsvp(value: string | null): EventGuestRsvpStatus {
  if (!value) return "Unknown"
  if (RSVP_VALUES.has(value as EventGuestRsvpStatus)) {
    return value as EventGuestRsvpStatus
  }
  return "Unknown"
}

export function buildRowFromRawRecord(rawRecord: Record<string, unknown>) {
  const normalizedRecord: Record<string, unknown> = {}
  Object.entries(rawRecord).forEach(([rawKey, rawValue]) => {
    const alias = HEADER_ALIAS_MAP[normalizeHeader(rawKey)]
    if (!alias) return
    normalizedRecord[alias] = rawValue
  })

  const guestName = normalizeNullable(normalizedRecord.guest_name)
  if (!guestName) {
    throw new Error("guest_name is required")
  }

  const category = parseCategory(normalizeNullable(normalizedRecord.category))
  const rsvpStatus = parseRsvp(normalizeNullable(normalizedRecord.rsvp_status))

  return {
    guest_name: guestName,
    company: normalizeNullable(normalizedRecord.company),
    designation: normalizeNullable(normalizedRecord.designation),
    category,
    email: normalizeEmail(normalizeNullable(normalizedRecord.email)),
    phone: normalizePhone(normalizeNullable(normalizedRecord.phone)),
    rsvp_status: rsvpStatus,
    table_no: normalizeNullable(normalizedRecord.table_no),
    seat_no: normalizeNullable(normalizedRecord.seat_no),
    remarks: normalizeNullable(normalizedRecord.remarks),
  } as ParsedGuestImportRow
}

export function detectDuplicateRows({
  rows,
  existingRows,
}: {
  rows: ParsedGuestImportRow[]
  existingRows: Array<{ guest_name: string; company: string | null; email: string | null; phone: string | null }>
}) {
  const duplicateRowsInfo: DuplicateRowInfo[] = []
  const seenNameCompany = new Set<string>()
  const seenEmail = new Set<string>()
  const seenPhone = new Set<string>()

  const existingNameCompany = new Set(existingRows.map((row) => normalizeNameCompanyKey(row.guest_name, row.company)))
  const existingEmail = new Set(existingRows.map((row) => normalizeEmail(row.email)).filter((value): value is string => Boolean(value)))
  const existingPhone = new Set(existingRows.map((row) => normalizePhone(row.phone)).filter((value): value is string => Boolean(value)))

  rows.forEach((row, index) => {
    const rowNumber = index + 2
    const nameCompanyKey = normalizeNameCompanyKey(row.guest_name, row.company)
    const emailKey = normalizeEmail(row.email)
    const phoneKey = normalizePhone(row.phone)

    if (existingNameCompany.has(nameCompanyKey)) {
      duplicateRowsInfo.push({
        row_number: rowNumber,
        guest_name: row.guest_name,
        company: row.company,
        reason: "same_name_company_existing",
      })
    } else if (seenNameCompany.has(nameCompanyKey)) {
      duplicateRowsInfo.push({
        row_number: rowNumber,
        guest_name: row.guest_name,
        company: row.company,
        reason: "same_name_company_file",
      })
    } else if (emailKey && existingEmail.has(emailKey)) {
      duplicateRowsInfo.push({
        row_number: rowNumber,
        guest_name: row.guest_name,
        company: row.company,
        reason: "same_email_existing",
      })
    } else if (emailKey && seenEmail.has(emailKey)) {
      duplicateRowsInfo.push({
        row_number: rowNumber,
        guest_name: row.guest_name,
        company: row.company,
        reason: "same_email_file",
      })
    } else if (phoneKey && existingPhone.has(phoneKey)) {
      duplicateRowsInfo.push({
        row_number: rowNumber,
        guest_name: row.guest_name,
        company: row.company,
        reason: "same_phone_existing",
      })
    } else if (phoneKey && seenPhone.has(phoneKey)) {
      duplicateRowsInfo.push({
        row_number: rowNumber,
        guest_name: row.guest_name,
        company: row.company,
        reason: "same_phone_file",
      })
    }

    seenNameCompany.add(nameCompanyKey)
    if (emailKey) seenEmail.add(emailKey)
    if (phoneKey) seenPhone.add(phoneKey)
  })

  return duplicateRowsInfo
}

export function filterRowsByDuplicateMode({
  rows,
  duplicateRowsInfo,
  duplicateMode,
}: {
  rows: ParsedGuestImportRow[]
  duplicateRowsInfo: DuplicateRowInfo[]
  duplicateMode: EventDuplicateMode
}) {
  if (duplicateMode === "Import Anyway") {
    return rows
  }

  const duplicateSet = new Set(duplicateRowsInfo.map((row) => row.row_number))
  return rows.filter((_, index) => !duplicateSet.has(index + 2))
}
