import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import AppSideBar from "@/components/app-sidebar"
import { Outlet } from "react-router-dom"
import { GlobalHeader } from "@/components/header"

export function RootLayout() {
  return (
    <SidebarProvider>
      <AppSideBar />
      <main className="flex flex-col flex-1 min-h-screen">
        <GlobalHeader />

        <div className="flex-1 p-4">
        <Outlet />
        </div>
      </main>
    </SidebarProvider>
  )
}
