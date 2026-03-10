import { redirect } from "next/navigation"
import { getDefaultBoardId } from "@/lib/db/queries"

export const dynamic = "force-dynamic"

export default function Page() {
  const defaultBoardId = getDefaultBoardId()

  if (defaultBoardId) {
    redirect(`/board/${defaultBoardId}`)
  }

  return (
    <div className="flex min-h-svh items-center justify-center">
      <p className="text-muted-foreground">No boards found</p>
    </div>
  )
}
