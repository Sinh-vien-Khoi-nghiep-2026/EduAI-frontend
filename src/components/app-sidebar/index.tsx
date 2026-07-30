import {Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarHeader} from "@/components/ui/sidebar"
import { WorkSpaceHeader } from "./sidebar-header"
import { StickySidebarFooter } from "./sidebar-footer"
import { EduSidebarGroup } from "./sidebar-group"

export default function AppSideBar(){
    return(
        <Sidebar>
            <SidebarHeader>
                <WorkSpaceHeader />
            </SidebarHeader>
            <SidebarContent>
                <EduSidebarGroup />
            </SidebarContent>


            <SidebarFooter>
                <StickySidebarFooter />
            </SidebarFooter>
        </Sidebar>
    )
}