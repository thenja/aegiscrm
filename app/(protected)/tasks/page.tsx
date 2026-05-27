import Link from "next/link"

import { createTaskAction } from "@/app/actions/tasks"
import { TaskFormFields } from "@/components/workitems/task-form-fields"
import { WorkItemsListWithDrawer, type WorkItemDrawerRow } from "@/components/workitems/work-items-list-with-drawer"
import { ActionFeedback } from "@/components/ui/action-feedback"
import { Button } from "@/components/ui/button"
import { ModalForm } from "@/components/ui/detail-drawer"
import {
  EmptyState,
  FilterBar,
  FormSection,
  PageHeader,
  SectionCard,
} from "@/components/ui/patterns"
import { requireAuth } from "@/lib/auth"
import { getSingaporeTodayIsoDate } from "@/lib/date"
import { getUsersForClientAssignments, listClients } from "@/lib/data/clients"
import { listTasks, type TaskFilters } from "@/lib/data/tasks"
import {
  listExternalContactsForSelect,
  listPeopleInvolvedByWorkItems,
} from "@/lib/data/external-contacts"
import { hasRole } from "@/lib/permissions"
import { CATEGORY_TYPES, PRIORITY_LEVELS, TASK_STATUSES } from "@/types/domain"

type SearchParams = {
  preset?: string
  status?: string
  priority?: string
  pic_id?: string
  client_id?: string
  category?: string
  feedback?: string
  message?: string
  reset_create_task?: string
}

const PRESET_OPTIONS = [
  { key: "overdue", label: "Overdue" },
  { key: "due_today", label: "Due Today" },
  { key: "due_this_week", label: "Due This Week" },
  { key: "pending_client", label: "Pending Client" },
  { key: "in_progress", label: "In Progress" },
  { key: "completed", label: "Completed" },
  { key: "my_items", label: "My Items" },
] as const

const NON_ACTIVE_STATUSES = new Set(["Completed", "Cancelled", "On Hold"])

function buildPresetHref(searchParams: SearchParams | undefined, preset: string) {
  const params = new URLSearchParams()
  if (searchParams?.status) params.set("status", searchParams.status)
  if (searchParams?.priority) params.set("priority", searchParams.priority)
  if (searchParams?.pic_id) params.set("pic_id", searchParams.pic_id)
  if (searchParams?.client_id) params.set("client_id", searchParams.client_id)
  if (searchParams?.category) params.set("category", searchParams.category)
  params.set("preset", preset)
  return `/tasks?${params.toString()}`
}

function getWeekWindow(todayIso: string) {
  const [year, month, day] = todayIso.split("-").map(Number)
  const todayDate = new Date(Date.UTC(year, month - 1, day))
  const dayOfWeek = todayDate.getUTCDay()
  const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  const mondayDate = new Date(todayDate)
  mondayDate.setUTCDate(todayDate.getUTCDate() - mondayOffset)
  const sundayDate = new Date(mondayDate)
  sundayDate.setUTCDate(mondayDate.getUTCDate() + 6)
  const toIso = (d: Date) => {
    const y = d.getUTCFullYear()
    const m = String(d.getUTCMonth() + 1).padStart(2, "0")
    const da = String(d.getUTCDate()).padStart(2, "0")
    return `${y}-${m}-${da}`
  }
  return { weekStart: toIso(mondayDate), weekEnd: toIso(sundayDate) }
}

export default async function TasksPage({ searchParams }: { searchParams?: SearchParams }) {
  const auth = await requireAuth()

  const filters: TaskFilters = {
    status: searchParams?.status,
    priority: searchParams?.priority,
    pic_id: searchParams?.pic_id,
    client_id: searchParams?.client_id,
  }

  const [tasks, users, clients, externalContactOptions] = await Promise.all([
    listTasks(filters),
    getUsersForClientAssignments(),
    listClients({}),
    listExternalContactsForSelect(),
  ])
  const todayIso = getSingaporeTodayIsoDate()
  const { weekStart, weekEnd } = getWeekWindow(todayIso)
  const canWrite = hasRole(auth.profile.role, ["Director", "Team Lead", "Team Member"])
  const preset = searchParams?.preset
  const filteredTasks = tasks.filter((item) => {
    if (searchParams?.category && item.category !== searchParams.category) return false

    if (!preset) return true

    if (preset === "overdue") {
      return !NON_ACTIVE_STATUSES.has(item.status) && item.due_date < todayIso
    }
    if (preset === "due_today") {
      return !NON_ACTIVE_STATUSES.has(item.status) && item.due_date === todayIso
    }
    if (preset === "due_this_week") {
      return !NON_ACTIVE_STATUSES.has(item.status) && item.due_date >= weekStart && item.due_date <= weekEnd
    }
    if (preset === "pending_client") {
      return item.status === "Pending Client Approval"
    }
    if (preset === "in_progress") {
      return item.status === "In Progress"
    }
    if (preset === "completed") {
      return item.status === "Completed"
    }
    if (preset === "my_items") {
      return item.pic_id === auth.profile.user_id
    }

    return true
  })

  const rows: WorkItemDrawerRow[] = filteredTasks.map((item) => ({
    itemType: "Task",
    itemId: item.task_id,
    itemName: item.task_title,
    clientId: item.client_id,
    clientName: item.client_name ?? "Global Internal",
    picId: item.pic_id,
    picName: item.pic_name,
    dueDate: item.due_date,
    status: item.status,
    priority: item.priority,
    category: item.category,
    latestUpdate: item.description,
  }))
  const peopleInvolvedByWorkItem = await listPeopleInvolvedByWorkItems({
    deliverableIds: [],
    taskIds: filteredTasks.map((item) => item.task_id),
  })

  return (
    <div className="space-y-6">
      <ActionFeedback feedback={searchParams?.feedback} message={searchParams?.message} />

      <PageHeader title="Tasks" description="Track status, owner, due date, and latest updates." />

      <SectionCard title="Quick Presets">
        <div className="flex flex-wrap gap-2">
          {PRESET_OPTIONS.map((option) => (
            <Link
              key={option.key}
              href={buildPresetHref(searchParams, option.key)}
              className={
                preset === option.key
                  ? "inline-flex items-center rounded-full border border-status-blue bg-status-blue-bg px-3 py-1 text-xs font-medium text-status-blue"
                  : "inline-flex items-center rounded-full border border-border bg-white px-3 py-1 text-xs font-medium text-text-secondary hover:bg-slate-100"
              }
            >
              {option.label}
            </Link>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Filters" description="Filter tasks by client, category, status, priority, and owner.">
        <details open={Boolean(searchParams?.status || searchParams?.priority || searchParams?.pic_id || searchParams?.client_id || searchParams?.category)}>
          <summary className="cursor-pointer text-sm font-medium text-navy">Show filters</summary>
          <div className="mt-3">
            <FilterBar>
              <form method="get" className="grid grid-cols-1 gap-3 md:grid-cols-3 xl:grid-cols-5">
                {searchParams?.preset ? <input type="hidden" name="preset" value={searchParams.preset} /> : null}
                <select name="client_id" defaultValue={searchParams?.client_id ?? ""} className="h-10 rounded-md border border-border px-3 text-sm">
                  <option value="">All Clients</option>
                  {clients.map((c) => <option key={c.client_id} value={c.client_id}>{c.client_name}</option>)}
                </select>
                <select name="category" defaultValue={searchParams?.category ?? ""} className="h-10 rounded-md border border-border px-3 text-sm">
                  <option value="">All Categories</option>
                  {CATEGORY_TYPES.map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
                <select name="status" defaultValue={searchParams?.status ?? ""} className="h-10 rounded-md border border-border px-3 text-sm">
                  <option value="">All Status</option>
                  {TASK_STATUSES.map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
                <select name="priority" defaultValue={searchParams?.priority ?? ""} className="h-10 rounded-md border border-border px-3 text-sm">
                  <option value="">All Priority</option>
                  {PRIORITY_LEVELS.map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
                <select name="pic_id" defaultValue={searchParams?.pic_id ?? ""} className="h-10 rounded-md border border-border px-3 text-sm">
                  <option value="">All PIC</option>
                  {users.map((u) => <option key={u.user_id} value={u.user_id}>{u.full_name}</option>)}
                </select>
                <div className="flex gap-2 md:col-span-3 xl:col-span-5">
                  <Button type="submit" variant="secondary">Apply Filters</Button>
                  <Button type="button" variant="ghost" asChild><a href="/tasks">Reset</a></Button>
                </div>
              </form>
            </FilterBar>
          </div>
        </details>
      </SectionCard>

      <SectionCard
        title="Tasks List"
        description="Track status, owner, due date, and latest updates."
        action={
          canWrite ? (
            <ModalForm triggerLabel="+ New Task" title="Create New Task" subtitle="Add core fields first. Optional tracking fields are available in Advanced Details.">
              <FormSection title="Create New Task">
                <form
                  key={searchParams?.reset_create_task ?? "create-task-form"}
                  action={createTaskAction}
                  className="grid grid-cols-1 gap-3 md:grid-cols-2"
                >
                  <input type="hidden" name="return_to" value="/tasks" />
                  <input type="hidden" name="client_context" value="false" />
                  <input type="hidden" name="sent_by_id" value={auth.profile.user_id} />
                  <TaskFormFields
                    users={users.map((u) => ({ user_id: u.user_id, full_name: u.full_name }))}
                    clients={clients.map((c) => ({ client_id: c.client_id, client_name: c.client_name }))}
                    includeClientSelect
                  />
                  <div className="md:col-span-2"><Button type="submit">Create Task</Button></div>
                </form>
              </FormSection>
            </ModalForm>
          ) : null
        }
      >
        {filteredTasks.length === 0 ? (
          <EmptyState title="No tasks found" description="Create a task or adjust filters to see results." />
        ) : (
          <WorkItemsListWithDrawer
            rows={rows}
            emptyTitle="No tasks found"
            emptyDescription="Create a task or adjust filters to see results."
            canWrite={canWrite}
            returnTo="/tasks"
            statusOptions={Array.from(TASK_STATUSES)}
            desktopTwoColumn
            peopleInvolvedByWorkItem={peopleInvolvedByWorkItem}
            externalContactOptions={externalContactOptions}
            canManagePeopleInvolved={canWrite}
          />
        )}
      </SectionCard>
    </div>
  )
}
