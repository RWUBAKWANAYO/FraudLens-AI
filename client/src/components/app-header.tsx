"use client";

import React from "react";
import { NavUser } from "./nav-user";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ModeToggle } from "./mode-toggle";
import { NavItem } from "@/config/sidebar";
import { usePathname } from "next/navigation";
import { findNavItemByUrl } from "@/lib/utils";
import moment from "moment";

export const Header = ({ navItems }: { navItems: NavItem[] }) => {
  const pathname = usePathname();
  const currentNavItem = findNavItemByUrl(navItems, pathname);

  const user = {
    name: "Rwubakwanayo Olivier",
    email: "rwubakwanayoolivier@gmail.com",
    avatar:
      "https://willieandkim.com/wp-content/uploads/sites/10110/2024/06/LinkedIn-Profile-Photo-Mistakes-Professionals-Should-Avoid.jpg",
  };

  return (
    <div className="flex flex-row items-center justify-between gap-2 px-4 py-0 h-[90px] w-full bg-foreground">
      <div className="flex items-center gap-x-8">
        <SidebarTrigger className="bg-accent hover:text-primary w-9 h-9" />
        <div className="hidden lg:block">
          <h1 className="text-primary text-xl font-extrabold">{currentNavItem?.caption}</h1>
          <p className="text-primary-foreground text-sm mt-1">{moment().format("MMM Do YYYY")}</p>
        </div>
      </div>
      <div className="flex items-center gap-8">
        <ModeToggle />
        <NavUser user={user} />
      </div>
    </div>
  );
};
