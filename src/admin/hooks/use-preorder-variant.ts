import { toast } from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { getErrorMessage } from "../lib/format"
import { sdk } from "../lib/sdk"
import type {
  AdminPreorderVariantResponse,
  AdminUpsertPreorderVariantBody,
  AdminVariantWithPreorder,
} from "../lib/types"
import { preorderQueryKeys } from "./query-keys"

export const usePreorderVariant = (
  variantId: string,
  productId: string | undefined,
) => {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const { data, isLoading, isError } = useQuery({
    queryKey: preorderQueryKeys.variant(variantId),
    queryFn: async () => {
      const { variant } = await sdk.admin.product.retrieveVariant(
        productId!,
        variantId,
        { fields: "+preorder_variant.*" },
      )
      return (variant as AdminVariantWithPreorder).preorder_variant ?? null
    },
    enabled: !!productId,
  })

  const upsertMutation = useMutation({
    mutationFn: (body: AdminUpsertPreorderVariantBody) =>
      sdk.client.fetch<AdminPreorderVariantResponse>(
        `/admin/variants/${variantId}/preorders`,
        { method: "POST", body },
      ),
    onSuccess: () => {
      // Prefix match: refreshes this variant and any order pre-order lists.
      queryClient.invalidateQueries({ queryKey: preorderQueryKeys.all })
      toast.success(t("kiji.preorder.variant.toast.saved"))
    },
    onError: (error) => {
      toast.error(
        t("kiji.preorder.variant.toast.saveError", {
          message: getErrorMessage(error, t("kiji.common.unknownError")),
        }),
      )
    },
  })

  const disableMutation = useMutation({
    mutationFn: () =>
      sdk.client.fetch<AdminPreorderVariantResponse>(
        `/admin/variants/${variantId}/preorders`,
        { method: "DELETE" },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: preorderQueryKeys.all })
      toast.success(t("kiji.preorder.variant.toast.removed"))
    },
    onError: (error) => {
      toast.error(
        t("kiji.preorder.variant.toast.removeError", {
          message: getErrorMessage(error, t("kiji.common.unknownError")),
        }),
      )
    },
  })

  return {
    // A disabled config is treated the same as no config.
    preorderVariant: data?.status === "enabled" ? data : null,
    isLoading,
    isError,
    upsertPreorder: upsertMutation.mutate,
    disablePreorder: disableMutation.mutate,
    isUpserting: upsertMutation.isPending,
    isDisabling: disableMutation.isPending,
  }
}
