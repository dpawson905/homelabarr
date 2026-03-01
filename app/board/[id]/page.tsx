import { notFound } from "next/navigation"
import { getBoardById, getWidgetsByBoardId } from "@/lib/db/queries"
import { WidgetGrid } from "@/components/widget-grid"
import { AddWidgetButton } from "./add-widget-button"
import { BoardEmptyState } from "./board-empty-state"

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
        <BoardEmptyState boardId={id} />
      ) : (
        <WidgetGrid widgets={widgets} boardId={id} />
      )}
      <AddWidgetButton boardId={id} />
    </div>
  )
}
