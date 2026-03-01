import { notFound } from "next/navigation"
import { getBoardById, getWidgetsByBoardId } from "@/lib/db/queries"
import { HugeiconsIcon } from "@hugeicons/react"
import { LayoutIcon } from "@hugeicons/core-free-icons"
import { WidgetGrid } from "@/components/widget-grid"

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function BoardPage({ params }: PageProps) {
  const { id } = await params
  const board = getBoardById(id)

  if (!board) {
    notFound()
  }

  const widgets = getWidgetsByBoardId(id)

  return (
    <div className="flex flex-1 flex-col overflow-auto p-6 min-h-[calc(100svh-3rem)]">
      {widgets.length === 0 ? (
        <div className="flex flex-1 items-center justify-center">
          <div className="flex max-w-md flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-muted-foreground/20 bg-gradient-to-b from-muted/30 to-transparent p-12 text-center">
            <HugeiconsIcon
              icon={LayoutIcon}
              strokeWidth={1.5}
              className="size-14 text-muted-foreground/30"
            />
            <p className="text-lg font-medium text-muted-foreground">
              No widgets yet
            </p>
            <p className="text-sm text-muted-foreground/70">
              Widgets will appear here once you start adding them.
            </p>
            <p className="text-xs text-muted-foreground/40">
              Drag and drop widgets to build your dashboard
            </p>
          </div>
        </div>
      ) : (
        <WidgetGrid widgets={widgets} boardId={id} />
      )}
    </div>
  )
}
