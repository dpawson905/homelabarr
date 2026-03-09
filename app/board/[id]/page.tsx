export const dynamic = "force-dynamic"

import { notFound } from "next/navigation"
import { getBoardById, getWidgetsByBoardId } from "@/lib/db/queries"
import { WidgetGrid } from "@/components/widget-grid"
import { SystemBanner } from "@/components/system-banner"
import { AddWidgetButton } from "./add-widget-button"
import { BoardEmptyState } from "./board-empty-state"

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function BoardPage({ params }: PageProps) {
  console.log("[board/page] Rendering board page")
  const { id } = await params
  console.log(`[board/page] Board ID: ${id}`)
  const board = getBoardById(id)

  if (!board) {
    console.log(`[board/page] Board not found: ${id}`)
    notFound()
  }
  console.log(`[board/page] Board found: ${board.name}`)

  const widgets = getWidgetsByBoardId(id)

  return (
    <div className="flex flex-1 flex-col overflow-auto p-6 min-h-[calc(100svh-3rem)]">
      <SystemBanner />
      {widgets.length === 0 ? (
        <div className="mt-4">
          <BoardEmptyState boardId={id} />
        </div>
      ) : (
        <div className="mt-4">
          <WidgetGrid widgets={widgets} boardId={id} />
        </div>
      )}
      <AddWidgetButton boardId={id} />
    </div>
  )
}
