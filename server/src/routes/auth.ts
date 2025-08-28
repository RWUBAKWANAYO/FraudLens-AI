import { Router } from "express";
import { AuthController } from "../controllers/authController";
import {
  validateRequest,
  registerValidation,
  loginValidation,
  inviteUserValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
} from "../middleware/validation";
import { authenticateToken, requireRole } from "../middleware/auth";

const router = Router();

router.post("/register", registerValidation, validateRequest, AuthController.register);
router.get("/verify-email", AuthController.verifyEmail);
router.post("/login", loginValidation, validateRequest, AuthController.login);
router.post(
  "/invite",
  authenticateToken,
  requireRole(["ADMIN", "MANAGER"]),
  inviteUserValidation,
  validateRequest,
  AuthController.inviteUser
);
router.post("/accept-invitation", AuthController.acceptInvitation);

router.post(
  "/forgot-password",
  forgotPasswordValidation,
  validateRequest,
  AuthController.forgotPassword
);
router.post(
  "/reset-password",
  resetPasswordValidation,
  validateRequest,
  AuthController.resetPassword
);

router.get("/me", authenticateToken, AuthController.getCurrentUser);

export { router as authRouter };
