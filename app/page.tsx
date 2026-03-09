import { redirect } from "next/navigation"
import { getDefaultBoardId } from "@/lib/db/queries"

export const dynamic = "force-dynamic"

export default function Page() {
  const defaultBoardId = getDefaultBoardId()
  console.log(`[root/page] Default board ID: ${defaultBoardId}`)

  if (defaultBoardId) {
    console.log(`[root/page] Redirecting to /board/${defaultBoardId}`)
    redirect(`/board/${defaultBoardId}`)
  }

  return (
    <div className="flex min-h-svh items-center justify-center">
      <p className="text-muted-foreground">No boards found</p>
    </div>
  )
}
