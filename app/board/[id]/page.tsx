export const dynamic = "force-dynamic"

import { notFound, redirect } from "next/navigation"
import { getBoardById, getWidgetsByBoardId, getDefaultBoardId } from "@/lib/db/queries"
import { WidgetGrid } from "@/components/widget-grid"
import { SystemBanner } from "@/components/system-banner"
import { AddWidgetButton } from "./add-widget-button"
import { BoardEmptyState } from "./board-empty-state"

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function BoardPage({ params }: PageProps) {
  const { id } = await params
  const board = getBoardById(id)

  if (!board) {
    const fallbackId = getDefaultBoardId()
    if (fallbackId && fallbackId !== id) {
      redirect(`/board/${fallbackId}`)
    }
    notFound()
  }

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
