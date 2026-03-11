"use client"

import { useState } from "react"
import Link from "next/link"
/* eslint-disable @next/next/no-img-element */
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarGroupAction,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuAction,
  SidebarRail,
} from "@/components/ui/sidebar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Settings02Icon,
  PlusSignIcon,
  Home01Icon,
  MoreHorizontalIcon,
  PencilEdit01Icon,
  Delete02Icon,
} from "@hugeicons/core-free-icons"
import type { Board } from "@/lib/db"
import {
  CreateBoardDialog,
  RenameBoardDialog,
  DeleteBoardDialog,
} from "@/components/board-dialogs"

const GROUP_LABEL_CLASS = "uppercase tracking-widest text-[0.65rem] font-semibold"

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  boards: Board[]
  activeBoardId: string
}

export function AppSidebar({ boards, activeBoardId, ...props }: AppSidebarProps) {
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [renameBoard, setRenameBoard] = useState<Board | null>(null)
  const [deleteBoard, setDeleteBoard] = useState<Board | null>(null)

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader className="p-4 group-data-[collapsible=icon]:p-2">
        <div className="flex flex-col items-center justify-center gap-1 group-data-[collapsible=icon]:gap-0">
          <img
            src="/favicon.png"
            alt="Homelabarr"
            className="h-20 w-20 group-data-[collapsible=icon]:h-7 group-data-[collapsible=icon]:w-7"
          />
          <span className="text-sm font-bold tracking-tight text-foreground group-data-[collapsible=icon]:hidden">
            Homelabarr
          </span>
        </div>
      </SidebarHeader>

      

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className={GROUP_LABEL_CLASS}>
            Boards
          </SidebarGroupLabel>
          <SidebarGroupAction title="Add Board" onClick={() => setCreateDialogOpen(true)}>
            <HugeiconsIcon icon={PlusSignIcon} strokeWidth={2} />
            <span className="sr-only">Add Board</span>
          </SidebarGroupAction>
          <SidebarGroupContent>
            <SidebarMenu>
              {boards.map((board) => (
                <SidebarMenuItem key={board.id}>
                  <SidebarMenuButton
                    asChild
                    isActive={board.id === activeBoardId}
                    tooltip={board.name}
                    className="data-[active=true]:bg-primary/10 data-[active=true]:text-primary"
                  >
                    <Link href={`/board/${board.id}`}>
                      <HugeiconsIcon icon={Home01Icon} strokeWidth={2} />
                      <span>{board.name}</span>
                    </Link>
                  </SidebarMenuButton>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <SidebarMenuAction showOnHover>
                        <HugeiconsIcon icon={MoreHorizontalIcon} strokeWidth={2} />
                        <span className="sr-only">Board actions</span>
                      </SidebarMenuAction>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent side="right" align="start">
                      <DropdownMenuItem onClick={() => setRenameBoard(board)}>
                        <HugeiconsIcon icon={PencilEdit01Icon} strokeWidth={2} />
                        <span>Rename</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => setDeleteBoard(board)}
                      >
                        <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} />
                        <span>Delete</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className={GROUP_LABEL_CLASS}>
            System
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Settings">
                  <Link href="/settings">
                    <HugeiconsIcon icon={Settings02Icon} strokeWidth={2} />
                    <span>Settings</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <div className="px-2 py-1">
          <span className="text-[0.6rem] text-muted-foreground/50">v{process.env.NEXT_PUBLIC_APP_VERSION}</span>
        </div>
      </SidebarFooter>

      <SidebarRail />

      <CreateBoardDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} />
      <RenameBoardDialog
        board={renameBoard}
        open={!!renameBoard}
        onOpenChange={(open) => !open && setRenameBoard(null)}
      />
      <DeleteBoardDialog
        board={deleteBoard}
        open={!!deleteBoard}
        onOpenChange={(open) => !open && setDeleteBoard(null)}
        boardCount={boards.length}
      />
    </Sidebar>
  )
}
