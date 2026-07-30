import {
    SidebarGroup,
    SidebarGroupContent,
    SidebarMenu,
    SidebarMenuItem,
    SidebarMenuButton,
} from "@/components/ui/sidebar"

export function EduSidebarGroup() {
    const datas = [
        "Dashboard",
        "Courses",
        "AI Chat",
        "Exercises",
        "Assignments",
        "Analytics"
    ]

    return (
        <SidebarGroup>
            <SidebarGroupContent>
                <SidebarMenu className="space-y-1">
                    {datas.map((d) => (
                        <SidebarMenuItem key={d}>
                            <SidebarMenuButton
                                className="
                                    h-10
                                    rounded-md
                                    px-3
                                    text-sm
                                    hover:bg-[#333333]
                                    hover:text-white
                                    transition-colors
                                "
                            >
                                {d}
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    ))}
                </SidebarMenu>
            </SidebarGroupContent>
        </SidebarGroup>
    )
}