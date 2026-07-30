import { Settings, Settings2, User2 } from "lucide-react";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";


export function StickySidebarFooter() {
    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <SidebarMenuButton className="justify-end">        
                    <Settings2 />            
                </SidebarMenuButton>
            </SidebarMenuItem>
        </SidebarMenu>
    )
}