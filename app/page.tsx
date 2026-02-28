import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { ThemeToggle } from "@/components/theme-toggle"
import { Separator } from "@/components/ui/separator"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb"
import { HugeiconsIcon } from "@hugeicons/react"
import { LayoutIcon } from "@hugeicons/core-free-icons"

export default function Page() {
  return (
    <SidebarProvider defaultOpen>
      <AppSidebar />
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-12 shrink-0 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur-md transition-[width,height] ease-linear">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbPage>Default Board</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </header>
        <div className="flex flex-1 flex-col items-center justify-center overflow-auto p-6 min-h-[calc(100svh-3rem)]">
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
      </SidebarInset>
    </SidebarProvider>
  )
}
