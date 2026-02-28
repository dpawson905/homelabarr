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
        <header className="sticky top-0 z-10 flex h-12 shrink-0 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur-sm transition-[width,height] ease-linear">
          <div className="flex items-center gap-2">
            <SidebarTrigger />
            <Separator
              orientation="vertical"
              className="mr-2 h-4 data-[orientation=vertical]:h-4"
            />
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
        <div className="flex flex-1 flex-col items-center justify-center p-6">
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-muted-foreground/25 p-12 text-center">
            <HugeiconsIcon
              icon={LayoutIcon}
              strokeWidth={2}
              className="size-10 text-muted-foreground/50"
            />
            <p className="text-lg font-medium text-muted-foreground">
              No widgets yet
            </p>
            <p className="text-sm text-muted-foreground/70">
              Widgets will appear here once you start adding them.
            </p>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
