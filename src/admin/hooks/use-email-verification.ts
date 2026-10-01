import { toast } from "@medusajs/ui"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { getErrorMessage } from "../lib/format"
import { sdk } from "../lib/sdk"
import type { AdminSetEmailVerifiedResponse } from "../lib/types"
import { customerDetailQueryKey } from "./query-keys"

export const useEmailVerification = (customerId: string) => {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const setVerifiedMutation = useMutation({
    mutationFn: (verified: boolean) =>
      sdk.client.fetch<AdminSetEmailVerifiedResponse>(
        `/admin/customers/${customerId}/email-verified`,
        { method: "POST", body: { verified } },
      ),
    onSuccess: (_, verified) => {
      toast.success(
        verified
          ? t("kiji.emailVerify.toast.markedVerified")
          : t("kiji.emailVerify.toast.verificationRemoved"),
      )
      // Refetch the dashboard's customer detail query so the widget's
      // `data.metadata.email_verified` reflects the new state.
      queryClient.invalidateQueries({
        queryKey: customerDetailQueryKey(customerId),
      })
    },
    onError: (error) => {
      toast.error(
        t("kiji.emailVerify.toast.updateError", {
          message: getErrorMessage(error, t("kiji.common.unknownError")),
        }),
      )
    },
  })

  const resendMutation = useMutation({
    mutationFn: () =>
      sdk.client.fetch<{ sent: boolean }>(
        `/admin/customers/${customerId}/resend-verification`,
        { method: "POST" },
      ),
    onSuccess: () => {
      toast.success(t("kiji.emailVerify.toast.resent"))
    },
    onError: (error) => {
      toast.error(
        t("kiji.emailVerify.toast.resendError", {
          message: getErrorMessage(error, t("kiji.common.unknownError")),
        }),
      )
    },
  })

  return {
    setVerified: setVerifiedMutation.mutate,
    resendVerification: resendMutation.mutate,
    isSettingVerified: setVerifiedMutation.isPending,
    isResending: resendMutation.isPending,
  }
}
