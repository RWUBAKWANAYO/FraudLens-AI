// server/src/services/authService.ts
import { prisma } from "../config/db";
import { AuthUtils } from "../utils/auth";
import { EmailService } from "../utils/email";
import {
  RegisterRequest,
  InviteUserRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
} from "../types/auth";

export class AuthService {
  static async registerUser(data: RegisterRequest) {
    // Check if company slug already exists
    const existingCompany = await prisma.company.findUnique({
      where: { slug: data.companySlug },
    });

    if (existingCompany) {
      throw new Error("Company slug already exists");
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new Error("Email already registered");
    }

    // Create company and user in transaction (without email)
    const result = await prisma.$transaction(async (tx) => {
      const company = await tx.company.create({
        data: {
          name: data.companyName,
          slug: data.companySlug,
        },
      });

      // Hash the password with proper error handling
      let hashedPassword: string;
      try {
        hashedPassword = await AuthUtils.hashPassword(data.password);
      } catch (error) {
        console.error("Password hashing failed:", error);
        throw new Error("Failed to process password");
      }

      const verificationToken = AuthUtils.generateRandomToken();

      const user = await tx.user.create({
        data: {
          email: data.email,
          password: hashedPassword,
          fullName: data.fullName,
          companyId: company.id,
          role: "ADMIN",
          verificationToken,
        },
      });

      return { user, company, verificationToken };
    });

    // Send verification email OUTSIDE the transaction
    try {
      await EmailService.sendVerificationEmail(data.email, result.verificationToken, data.fullName);
    } catch (emailError) {
      console.error("Failed to send verification email:", emailError);
      // Don't throw error here - user is already created, just log it
    }

    return result;
  }

  static async verifyEmail(token: string) {
    const user = await prisma.user.findFirst({
      where: { verificationToken: token },
    });

    if (!user) {
      throw new Error("Invalid verification token");
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        isVerified: true,
        verificationToken: null,
      },
    });

    return user;
  }

  static async inviteUser(inviterId: string, data: InviteUserRequest) {
    const inviter = await prisma.user.findUnique({
      where: { id: inviterId },
      include: { company: true },
    });

    if (!inviter) {
      throw new Error("Inviter not found");
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new Error("User already exists");
    }

    // Check if invitation already exists
    const existingInvitation = await prisma.invitation.findFirst({
      where: {
        email: data.email,
        companyId: inviter.companyId,
        accepted: false,
        expiresAt: { gt: new Date() },
      },
    });

    if (existingInvitation) {
      throw new Error("Active invitation already exists");
    }

    const token = AuthUtils.generateRandomToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Create invitation in transaction
    const invitation = await prisma.$transaction(async (tx) => {
      return await tx.invitation.create({
        data: {
          email: data.email,
          companyId: inviter.companyId,
          invitedById: inviterId,
          role: data.role,
          token,
          expiresAt,
        },
      });
    });

    // Send invitation email OUTSIDE the transaction
    try {
      await EmailService.sendInvitationEmail(
        data.email,
        token,
        inviter.fullName,
        inviter.company.name
      );
    } catch (emailError) {
      console.error("Failed to send invitation email:", emailError);
      // Don't throw error here - invitation is already created
    }

    return invitation;
  }

  static async acceptInvitation(token: string, password: string) {
    const invitation = await prisma.invitation.findFirst({
      where: {
        token,
        expiresAt: { gt: new Date() },
        accepted: false,
      },
      include: { company: true, invitedBy: true },
    });

    if (!invitation) {
      throw new Error("Invalid or expired invitation");
    }

    const hashedPassword = await AuthUtils.hashPassword(password);

    return await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: invitation.email,
          password: hashedPassword,
          fullName: invitation.email.split("@")[0], // Default name
          companyId: invitation.companyId,
          role: invitation.role,
          isVerified: true,
          invitedById: invitation.invitedById,
        },
      });

      await tx.invitation.update({
        where: { id: invitation.id },
        data: { accepted: true },
      });

      return user;
    });
  }
  static async forgotPassword(data: ForgotPasswordRequest) {
    const user = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (!user) {
      // Don't reveal that the email doesn't exist for security
      return { message: "If the email exists, a password reset link has been sent" };
    }

    // Generate reset token
    const resetToken = AuthUtils.generateRandomToken();
    const resetTokenExpiry = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetTokenExpiry,
      },
    });

    // Send password reset email
    try {
      await EmailService.sendPasswordResetEmail(user.email, resetToken, user.fullName);
    } catch (emailError) {
      console.error("Failed to send password reset email:", emailError);
      // Don't throw error - the reset token is still created
    }

    return { message: "If the email exists, a password reset link has been sent" };
  }

  static async resetPassword(data: ResetPasswordRequest) {
    const user = await prisma.user.findFirst({
      where: {
        resetToken: data.token,
        resetTokenExpiry: { gt: new Date() },
      },
    });

    if (!user) {
      throw new Error("Invalid or expired reset token");
    }

    const hashedPassword = await AuthUtils.hashPassword(data.password);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    return { message: "Password reset successfully" };
  }
}
