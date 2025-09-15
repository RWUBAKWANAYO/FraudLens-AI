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

export const formatThreatType = (threatType: string) => {
  if (!threatType) return "";
  return threatType.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
};

export const getSeverity = (score: number) => {
  let severity: "critical" | "high" | "medium" | "low";
  let className: string;

  if (score >= 0.9) {
    severity = "critical";
    className = "text-primary-red";
  } else if (score >= 0.7) {
    severity = "high";
    className = "text-colored-primary";
  } else if (score >= 0.4) {
    severity = "medium";
    className = "text-primary-green";
  } else {
    severity = "low";
    className = "text-primary-blue";
  }

  return { severity, className };
};

export function formatAmount(amountString?: string | number): string {
  if (!amountString) return "";

  amountString = amountString.toString();

  const numericMatch = amountString.match(/-?\d+\.?\d*/);
  if (!numericMatch) return amountString;

  const amount = parseFloat(numericMatch[0]);

  const currencyMatch = amountString.match(/[A-Z]{3}/);
  const currency = currencyMatch ? currencyMatch[0] : "GBP";

  const formatter = new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return formatter.format(amount);
}

