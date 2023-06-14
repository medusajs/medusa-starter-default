import { wrapHandler } from "@medusajs/utils";
import { Router } from "express";
import getOnboardingStatus from "./get-status";
import updateOnboardingStatus from "./update-status";

const router = Router();

export default (adminRouter: Router) => {
  adminRouter.use("/onboarding", router);

  router.get("/", wrapHandler(getOnboardingStatus));
  router.post("/", wrapHandler(updateOnboardingStatus));
};
