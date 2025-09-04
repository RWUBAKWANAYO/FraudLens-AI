"use client";

import * as React from "react";

import { NavMain } from "@/components/dashboard/nav-main";
import logo from "@/../public/assets/logo.svg";
import { Sidebar, SidebarContent, SidebarHeader } from "@/components/ui/sidebar";
import Image from "next/image";
import { NavItem } from "@/config/sidebar";

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  navItems: NavItem[];
}

export function AppSidebar({ navItems, ...props }: AppSidebarProps) {
  console.log(navItems);
  return (
    <Sidebar collapsible="icon" {...props} className="border-none">
      <SidebarHeader className="flex flex-row justify-center items-center py-6">
        <Image src={logo} alt="logo small" width={32} height={32} className="w-[32px]" />
        <h1 className="text-primary text-xl font-bold group-data-[collapsible=icon]:hidden">
          FraudList
        </h1>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navItems} />
      </SidebarContent>
    </Sidebar>
  );
}

