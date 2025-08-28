// server/src/types/express.d.ts
import { UserRole } from "@prisma/client";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        companyId: string;
        role: UserRole;
        authMethod: "jwt" | "api_key";
      };
    }
  }
}
