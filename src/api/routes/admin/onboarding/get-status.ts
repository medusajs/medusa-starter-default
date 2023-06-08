import { Request, Response } from "express";
import OnboardingService from "../../../../services/onboarding";

export default async function getOnboardingStatus(req: Request, res: Response) {
  const onboardingService: OnboardingService =
    req.scope.resolve("onboardingService");

  const status = await onboardingService.retrieve();

  res.status(200).json({ status });
}
