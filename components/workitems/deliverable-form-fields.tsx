import {
  CATEGORY_TYPES,
  CONFIRMATION_STATUSES,
  DELIVERABLE_STATUSES,
  PRIORITY_LEVELS,
  RECURRENCE_TYPES,
  REVIEW_STATUSES,
  type DeliverableRow,
} from "@/types/domain"
import { Input } from "@/components/ui/input"
import { CollapsibleEditSection } from "@/components/ui/patterns"

type UserOption = {
  user_id: string
  full_name: string
}

type ClientOption = {
  client_id: string
  client_name: string
}

type Props = {
  users: UserOption[]
  clients?: ClientOption[]
  includeClientSelect: boolean
  defaultValues?: Partial<DeliverableRow>
  fixedClientId?: string
}

export function DeliverableFormFields({ users, clients, includeClientSelect, defaultValues, fixedClientId }: Props) {
  return (
    <>
      {includeClientSelect ? (
        <select name="client_id" defaultValue={defaultValues?.client_id ?? ""} required className="h-10 rounded-md border border-border px-3 text-sm">
          <option value="">Select Client</option>
          {(clients ?? []).map((c) => (
            <option key={c.client_id} value={c.client_id}>{c.client_name}</option>
          ))}
        </select>
      ) : (
        <input type="hidden" name="client_id" value={fixedClientId ?? defaultValues?.client_id ?? ""} />
      )}

      <Input name="deliverable_name" placeholder="Deliverable Name" defaultValue={defaultValues?.deliverable_name ?? ""} required />

      <select name="category" defaultValue={defaultValues?.category ?? "Other"} className="h-10 rounded-md border border-border px-3 text-sm">
        <option value="">Category (Optional)</option>
        {CATEGORY_TYPES.map((v) => <option key={v} value={v}>{v}</option>)}
      </select>

      <select name="pic_id" defaultValue={defaultValues?.pic_id ?? ""} required className="h-10 rounded-md border border-border px-3 text-sm">
        <option value="">Select PIC / Owner</option>
        {users.map((u) => <option key={u.user_id} value={u.user_id}>{u.full_name}</option>)}
      </select>

      <Input name="due_date" type="date" defaultValue={defaultValues?.due_date ?? ""} required />

      <select name="priority" defaultValue={defaultValues?.priority ?? PRIORITY_LEVELS[1]} required className="h-10 rounded-md border border-border px-3 text-sm">
        {PRIORITY_LEVELS.map((v) => <option key={v} value={v}>{v}</option>)}
      </select>

      <select name="status" defaultValue={defaultValues?.status ?? DELIVERABLE_STATUSES[0]} required className="h-10 rounded-md border border-border px-3 text-sm">
        {DELIVERABLE_STATUSES.map((v) => <option key={v} value={v}>{v}</option>)}
      </select>

      <textarea
        name="notes"
        placeholder="Remarks / Latest Update"
        defaultValue={defaultValues?.notes ?? ""}
        className="min-h-[90px] rounded-md border border-border px-3 py-2 text-sm md:col-span-2"
      />

      <div className="md:col-span-2">
        <CollapsibleEditSection title="Advanced Details / Optional Tracking">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <select name="recurrence" defaultValue={defaultValues?.recurrence ?? "Monthly"} className="h-10 rounded-md border border-border px-3 text-sm">
              {RECURRENCE_TYPES.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>

            <select name="requires_client_approval" defaultValue={defaultValues?.requires_client_approval ? "true" : "false"} className="h-10 rounded-md border border-border px-3 text-sm">
              <option value="false">No Client Approval</option>
              <option value="true">Requires Client Approval</option>
            </select>

            <select name="requires_internal_review" defaultValue={defaultValues?.requires_internal_review ? "true" : "false"} className="h-10 rounded-md border border-border px-3 text-sm">
              <option value="false">No Internal Review</option>
              <option value="true">Requires Internal Review</option>
            </select>

            <select name="reviewer_id" defaultValue={defaultValues?.reviewer_id ?? ""} className="h-10 rounded-md border border-border px-3 text-sm">
              <option value="">Reviewer (Optional)</option>
              {users.map((u) => <option key={u.user_id} value={u.user_id}>{u.full_name}</option>)}
            </select>

            <Input name="review_deadline" type="date" defaultValue={defaultValues?.review_deadline ?? ""} />

            <select name="review_status" defaultValue={defaultValues?.review_status ?? ""} className="h-10 rounded-md border border-border px-3 text-sm">
              <option value="">Review Status (Optional)</option>
              {REVIEW_STATUSES.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>

            <Input name="version_number" placeholder="Version Number" defaultValue={defaultValues?.version_number ?? ""} />
            <Input name="completion_date" type="date" defaultValue={defaultValues?.completion_date ?? ""} />
            <Input name="final_file_link" placeholder="Final File Link" defaultValue={defaultValues?.final_file_link ?? ""} />
            <Input name="proof_link" placeholder="Proof Link" defaultValue={defaultValues?.proof_link ?? ""} />
            <Input name="sent_date" type="date" defaultValue={defaultValues?.sent_date ?? ""} />
            <Input name="sent_to_name" placeholder="Sent To Name" defaultValue={defaultValues?.sent_to_name ?? ""} />

            <select name="client_confirmation" defaultValue={defaultValues?.client_confirmation ?? ""} className="h-10 rounded-md border border-border px-3 text-sm">
              <option value="">Client Confirmation (Optional)</option>
              {CONFIRMATION_STATUSES.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>

            <Input name="deferred_to_date" type="date" defaultValue={defaultValues?.deferred_to_date ?? ""} />
            <Input name="pending_data_comm_log_id" placeholder="Pending Data Comm Log ID" defaultValue={defaultValues?.pending_data_comm_log_id ?? ""} />
            <textarea name="exception_reason" placeholder="Exception Reason" defaultValue={defaultValues?.exception_reason ?? ""} className="min-h-[70px] rounded-md border border-border px-3 py-2 text-sm md:col-span-2" />
            <textarea name="review_comments" placeholder="Review Comments" defaultValue={defaultValues?.review_comments ?? ""} className="min-h-[70px] rounded-md border border-border px-3 py-2 text-sm md:col-span-2" />
          </div>
        </CollapsibleEditSection>
      </div>
    </>
  )
}
