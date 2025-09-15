"use client";

import * as React from "react";

import { NavMain } from "@/components/dashboard/nav-main";
import logo from "@/../public/assets/logo.svg";
import { Sidebar, SidebarContent, SidebarHeader } from "@/components/ui/sidebar";
import Image from "next/image";
import { NavItem } from "@/config/sidebar";
import Link from "next/link";

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  navItems: NavItem[];
}

export function AppSidebar({ navItems, ...props }: AppSidebarProps) {
  return (
    <Sidebar collapsible="icon" {...props} className="border-none">
      <Link href={"/dashboard"}>
        <SidebarHeader className="flex flex-row justify-start items-center py-6">
          <Image src={logo} alt="logo small" width={32} height={32} className="w-[32px]" />
          <h1 className="text-primary text-xl font-bold group-data-[collapsible=icon]:hidden">
            FraudLens AI
          </h1>
        </SidebarHeader>
      </Link>
      <SidebarContent>
        <NavMain items={navItems} />
      </SidebarContent>
    </Sidebar>
  );
}

