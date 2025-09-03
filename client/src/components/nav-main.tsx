"use client";

import {
  LayoutGrid,
  KeyRound,
  Users,
  Webhook,
  FileUp,
  CloudUpload,
  History,
  ShieldAlert,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import clsx from "clsx";

const iconMap: Record<string, LucideIcon> = {
  LayoutGrid,
  KeyRound,
  Users,
  Webhook,
  FileUp,
  CloudUpload,
  History,
  ShieldAlert,
};

export function NavMain({
  items,
}: {
  items: {
    title: string;
    url: string;
    iconName?: string;
    items?: {
      title: string;
      url: string;
    }[];
  }[];
}) {
  const pathname = usePathname();

  return (
    <SidebarGroup className="px-6">
      <SidebarMenu>
        {items.map((item) => {
          const hasSubItems = item.items && item.items.length > 0;

          const activeChild = item.items?.find((sub) => pathname === sub.url);
          const isParentActive = pathname === item.url && !activeChild;
          const IconComponent = item.iconName ? iconMap[item.iconName] : undefined;

          if (hasSubItems) {
            return (
              <Collapsible
                key={item.title}
                asChild
                defaultOpen={true}
                className="group/collapsible"
              >
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                      tooltip={item.title}
                      className={clsx(
                        "px-4 py-6 mb-1 rounded-lg font-medium",
                        isParentActive &&
                          "bg-colored-primary text-white hover:bg-colored-primary hover:text-white"
                      )}
                    >
                      {IconComponent && <IconComponent />}
                      <span>{item.title}</span>
                      <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {item.items?.map((subItem) => {
                        const isSubActive = pathname === subItem.url;
                        return (
                          <SidebarMenuSubItem key={subItem.title}>
                            <SidebarMenuSubButton
                              asChild
                              className={clsx(
                                "px-4 py-6 mb-1 rounded-lg font-medium",
                                isSubActive &&
                                  "bg-colored-primary text-white hover:bg-colored-primary hover:text-white "
                              )}
                            >
                              <a href={subItem.url}>
                                <span>{subItem.title}</span>
                              </a>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        );
                      })}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            );
          }

          return (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                tooltip={item.title}
                asChild
                className={clsx(
                  "px-4 py-6 mb-1 rounded-lg font-medium",
                  isParentActive &&
                    "bg-colored-primary text-white hover:bg-colored-primary hover:text-white "
                )}
              >
                <a href={item.url} className="flex items-center w-full">
                  {IconComponent && <IconComponent />}
                  <span>{item.title}</span>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}

