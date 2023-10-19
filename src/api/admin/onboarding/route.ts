import { AnalyticsConfigService, type MedusaRequest, type MedusaResponse } from "@medusajs/medusa";
import { EntityManager } from "typeorm";
import { track } from "medusa-telemetry"

import OnboardingService from "../../../services/onboarding";

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const onboardingService: OnboardingService =
    req.scope.resolve("onboardingService");

  const status = await onboardingService.retrieve();

  res.status(200).json({ status });
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const onboardingService: OnboardingService =
    req.scope.resolve("onboardingService");
  const manager: EntityManager = req.scope.resolve("manager");

  const status = await manager.transaction(async (transactionManager) => {
    return await onboardingService
      .withTransaction(transactionManager)
      .update(req.body);
  });

  const analyticsConfigService = req.scope.resolve<
    AnalyticsConfigService
  >("analyticsConfigService")

  const userAnalytics = await analyticsConfigService.retrieve(req.user?.userId)

  if (!userAnalytics.opt_out) {
    track("CMA_ONBOARDING", {
      userId: req.user.userId,
      status: status.current_step,
      complete: status.is_complete
    })
  }

  res.status(200).json({ status });
}
