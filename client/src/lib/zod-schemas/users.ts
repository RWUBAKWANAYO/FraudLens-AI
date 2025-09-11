import { z } from "zod";

export const inviteUserSchema = z.object({
  email: z.string().email("Invalid email address"),
  role: z.enum(["ADMIN", "MANAGER", "MEMBER"]),
});

export const editUserRoleSchema = z.object({
  role: z.enum(["ADMIN", "MANAGER", "MEMBER"]),
});

export type InviteUserFormData = z.infer<typeof inviteUserSchema>;
export type EditUserRoleFormData = z.infer<typeof editUserRoleSchema>;
