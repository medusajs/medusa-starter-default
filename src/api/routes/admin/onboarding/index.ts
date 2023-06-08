import { authenticate } from "@medusajs/medusa";
import { wrapHandler } from "@medusajs/utils";
import cors from "cors";
import { Router } from "express";
import getOnboardingStatus from "./get-status";
import updateOnboardingStatus from "./update-status";

const route = Router();

export default (app: Router, corsOptions): Router => {
  app.use("/admin/onboarding", route);

  route.options("/", cors(corsOptions));
  route.get(
    "/",
    cors(corsOptions),
    authenticate(),
    wrapHandler(getOnboardingStatus)
  );
  route.post(
    "/",
    cors(corsOptions),
    authenticate(),
    wrapHandler(updateOnboardingStatus)
  );

  return app;
};
