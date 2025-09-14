export interface INavEntity {
  title: string;
  caption: string;
  url: string;
  iconName?: string;
  roles?: string[];
  isActive?: boolean;
}
export interface NavItem extends INavEntity {
  items?: NavItem[];
}

export const adminLinks: NavItem[] = [
  {
    title: "Dashboard",
    caption: "Company Overview",
    url: "/dashboard",
    iconName: "LayoutGrid",
    roles: ["admin", "manager", "member"],
    isActive: true,
  },
  {
    title: "API Keys",
    caption: "Connect other apps",
    url: "/dashboard/api-keys",
    iconName: "KeyRound",
    roles: ["admin", "manager"],
  },
  {
    title: "Users",
    caption: "Company members on Platform",
    url: "/dashboard/users",
    iconName: "Users",
    roles: ["admin", "manager"],
  },
  {
    title: "Webhooks",
    caption: "Notificy to external work spaces",
    url: "/dashboard/webhooks",
    iconName: "Webhook",
    roles: ["admin", "manager"],
  },
  {
    title: "Uploads",
    caption: "Upload File or Data",
    url: "/dashboard/upload/create",
    iconName: "CloudUpload",
    roles: ["admin", "manager", "member"],
    items: [
      {
        title: "Run a scan",
        caption: "Run a scan on a file",
        url: "/dashboard/upload/create",
        iconName: "FileUp",
        roles: ["admin", "manager", "member"],
      },
      {
        title: "History",
        caption: "History of Uploaded Files",
        url: "/dashboard/upload/history",
        iconName: "History",
        roles: ["admin", "manager", "member"],
      },
    ],
  },
  {
    title: "Threats List",
    caption: "List of Threats Detected",
    url: "/dashboard/threats",
    iconName: "ShieldAlert",
    roles: ["admin", "manager", "member"],
  },
];

export const getNavigationLinks = (role: string): NavItem[] => {
  const roleSpecificLinks = role === "admin" ? adminLinks : [];
  return [...roleSpecificLinks].filter((link) => !link.roles || link.roles.includes(role));
};
