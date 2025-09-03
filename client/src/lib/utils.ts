import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { NavItem } from "@/config/sidebar";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function flattenNavItems(navItems: NavItem[]): NavItem[] {
  return navItems.flatMap((item) => (item.items ? [item, ...flattenNavItems(item.items)] : [item]));
}

export function findNavItemByUrl(navItems: NavItem[], currentUrl: string): NavItem | undefined {
  const flattened = flattenNavItems(navItems);
  return flattened.find((item) => item.url === currentUrl);
}

