import bodyParser from "body-parser";
import cors from "cors";
import { Router } from "express";
import { authenticate } from "@medusajs/medusa";
import onboardingRoutes from "./onboarding";

const adminRouter = Router();

export function getAdminRouter(adminCorsOptions): Router {
  adminRouter.use(
    /\/admin\/((?!auth).*)/,
    cors(adminCorsOptions),
    bodyParser.json(),
    authenticate()
  );

  onboardingRoutes(adminRouter);

  return adminRouter;
}
