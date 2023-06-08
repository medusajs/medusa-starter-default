import bodyParser from "body-parser";
import cors from "cors";
import { Router } from "express";
import onboardingRoutes from "./onboarding";

const adminRouter = Router();

export function getAdminRouter(adminCorsOptions): Router {
  adminRouter.use(cors(adminCorsOptions), bodyParser.json());

  onboardingRoutes(adminRouter, adminCorsOptions);

  return adminRouter;
}
