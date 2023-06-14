import { wrapHandler } from "@medusajs/utils";
import { Router } from "express";
import getOnboardingStatus from "./get-status";
import updateOnboardingStatus from "./update-status";

const route = Router();

export default (app: Router): Router => {
  app.use("/admin/onboarding", route);

  route.get("/", wrapHandler(getOnboardingStatus));
  route.post("/", wrapHandler(updateOnboardingStatus));

  return app;
};
