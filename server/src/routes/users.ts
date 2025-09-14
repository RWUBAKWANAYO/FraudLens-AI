import { Router } from "express";
import { UserController } from "../controllers/userController";
import { authenticateTokenOrApiKey, requireRole } from "../middleware/auth";
import { multerConfig } from "../middleware/multer";

const router = Router();

router.get("/", authenticateTokenOrApiKey, UserController.getUsers);
router.patch(
  "/:userId/role",
  authenticateTokenOrApiKey,
  requireRole(["ADMIN"]),
  UserController.updateUserRole
);
router.delete(
  "/:userId",
  authenticateTokenOrApiKey,
  requireRole(["ADMIN"]),
  UserController.removeUser
);

router.post("/me/avatar", authenticateTokenOrApiKey, multerConfig, UserController.uploadAvatar);

router.delete("/me/avatar", authenticateTokenOrApiKey, UserController.deleteAvatar);

export { router as usersRouter };
