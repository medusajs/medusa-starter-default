import { createCustomAdminHooks } from "medusa-react";

const {
  useAdminEntity: useAdminOnboardingState,
  useAdminUpdateMutation: useAdminUpdateOnboardingStateMutation,
} = createCustomAdminHooks("onboarding", "onboarding_state");

export { useAdminOnboardingState, useAdminUpdateOnboardingStateMutation };
