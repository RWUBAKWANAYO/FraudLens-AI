// server/src/routes/users.ts
import { Router } from "express";
import { UserController } from "../controllers/userController";
import { authenticateToken, requireRole } from "../middleware/auth";

const router = Router();

router.get("/", authenticateToken, UserController.getUsers);
router.patch(
  "/:userId/role",
  authenticateToken,
  requireRole(["ADMIN"]),
  UserController.updateUserRole
);
router.delete("/:userId", authenticateToken, requireRole(["ADMIN"]), UserController.removeUser);

export { router as usersRouter };
