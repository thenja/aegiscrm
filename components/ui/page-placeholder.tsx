import { EmptyState, PageHeader, SectionCard } from "@/components/ui/patterns"

export function PagePlaceholder({ title, description }: { title: string; description: string }) {
  return (
    <div className="space-y-6">
      <PageHeader title={title} description={description} />
      <SectionCard>
        <EmptyState title="Coming in future sprint" description="This module has not been implemented yet." />
      </SectionCard>
    </div>
  )
}
