"use client";

import React from "react";
import { NavUser } from "./nav-user";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ModeToggle } from "../common/mode-toggle";
import { NavItem } from "@/config/sidebar";
import { usePathname } from "next/navigation";
import { findNavItemByUrl } from "@/lib/utils";
import moment from "moment";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { HeaderProfileSkeleton } from "../ui/skeletons/common";

export const Header = ({ navItems }: { navItems: NavItem[] }) => {
  const pathname = usePathname();
  const currentNavItem = findNavItemByUrl(navItems, pathname);
  const { user, loading } = useRequireAuth();

  return (
    <div className="flex flex-row items-center justify-between gap-2 px-4 sm:px-6 py-0 h-[70px] w-full bg-foreground">
      <div className="flex items-center gap-x-8">
        <SidebarTrigger className="bg-accent hover:text-primary w-9 h-9" />
        <div className="hidden lg:block">
          <h1 className="text-primary text-xl font-extrabold">{currentNavItem?.caption}</h1>
          <p className="text-primary-foreground text-sm mt-1">{moment().format("MMM Do YYYY")}</p>
        </div>
      </div>
      <div className="flex items-center gap-8">
        <ModeToggle />
        {loading && <HeaderProfileSkeleton />}
        {!loading && user && (
          <NavUser
            user={{
              name: user.fullName,
              email: user.email,
              avatar: user.avatar || "",
            }}
          />
        )}
      </div>
    </div>
  );
};
