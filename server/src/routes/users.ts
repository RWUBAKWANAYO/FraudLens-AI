import { Router } from "express";
import { UserController } from "../controllers/userController";
import { authenticateTokenOrApiKey, requireRole } from "../middleware/auth";

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

export { router as usersRouter };
