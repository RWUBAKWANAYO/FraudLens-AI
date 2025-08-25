// server/src/types/auth.ts
import { UserRole } from "@prisma/client";
export interface JwtPayload {
  userId: string;
  email: string;
  companyId: string;
  role: string;
}

export interface RegisterRequest {
  fullName: string;
  email: string;
  password: string;
  companyName: string;
  companySlug: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface InviteUserRequest {
  email: string;
  role: UserRole;
}

export interface UpdateUserRoleRequest {
  userId: string;
  role: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
}
