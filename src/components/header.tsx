import { Bell, Search, Settings } from "lucide-react"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function GlobalHeader() {
  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center gap-4 flex-1 max-w-md">
        <SidebarTrigger className="-ml-1" />
        <div className="hidden h-4 w-px bg-border md:block" />
        <div className="relative w-full hidden sm:block">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Tìm kiếm khóa học, tài liệu..."
            className="w-full pl-8 bg-muted/50 focus-visible:bg-background"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="sm:hidden">
          <Search className="h-5 w-5" />
        </Button>

        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          <span className="absolute top-1.5 right-1.5 flex h-2 w-2 rounded-full bg-destructive" />
        </Button>

        <Button variant="ghost" size="icon" className="hidden h-9 w-9 sm:flex">
          <Settings className="h-5 w-5" />
        </Button>

        <div className="h-5 w-px bg-border mx-1" />

    
      </div>
    </header>
  )
}
