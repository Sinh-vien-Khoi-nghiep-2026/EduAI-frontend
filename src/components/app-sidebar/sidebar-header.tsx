import { BookOpenCheckIcon } from "lucide-react";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

export function WorkSpaceHeader() {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          className="h-14 rounded-lg px-3 hover:bg-accent">
          <div className="flex items-center gap-3 ">
            <BookOpenCheckIcon size={22} />
            <span className="text-lg font-bold">EduAI</span>
          </div>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
