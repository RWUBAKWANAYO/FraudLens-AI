export interface User {
  id: string;
  fullName: string;
  email: string;
  role: "ADMIN" | "MANAGER" | "MEMBER";
  avatarUrl?: string;
  avatarPublicId?: string;
  createdAt: string;
  updatedAt: string;
  lastLogin: string;
  status: "active" | "inactive" | "suspended";
  company?: { id: string; name: string; slug: string };
}
