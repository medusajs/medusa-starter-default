import { Request, Response } from "express";
import { EntityManager } from "typeorm";
import OnboardingService from "../../../../services/onboarding";

export default async function updateOnboardingStatus(
  req: Request,
  res: Response
) {
  const onboardingService: OnboardingService =
    req.scope.resolve("onboardingService");
  const manager: EntityManager = req.scope.resolve("manager");

  const status = await manager.transaction(async transactionManager => {
    return await onboardingService
      .withTransaction(transactionManager)
      .update(req.body);
  });

  res.status(200).json({ status });
}
