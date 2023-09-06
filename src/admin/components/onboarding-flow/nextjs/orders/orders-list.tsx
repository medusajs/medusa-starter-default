import React from "react";
import { useAdminProduct } from "medusa-react";
import { useAdminCreateDraftOrder, useCreateCart } from "medusa-react";
import { useAdminShippingOptions } from "medusa-react";
import { useAdminRegions } from "medusa-react";
import { useMedusa } from "medusa-react";
import { StepContentProps } from "../../../../widgets/onboarding-flow/onboarding-flow";
import { Button, Text } from "@medusajs/ui";

const OrdersListNextjs = ({ onNext, isComplete, data }: StepContentProps) => {
  const { product } = useAdminProduct(data.product_id);
  const { mutateAsync: createDraftOrder, isLoading } =
    useAdminCreateDraftOrder();
  const { mutateAsync: createCart, isLoading: cartIsLoading } = useCreateCart()
  const { client } = useMedusa();

  const { regions } = useAdminRegions();
  const { shipping_options } = useAdminShippingOptions();

  const createOrder = async () => {
    const variant = product.variants[0] ?? null;
    try {
      const { draft_order } = await createDraftOrder({
        email: "customer@medusajs.com",
        items: [
          variant
            ? {
                quantity: 1,
                variant_id: variant.id,
              }
            : {
                quantity: 1,
                title: product.title,
                unit_price: 50,
              },
        ],
        shipping_methods: [
          {
            option_id: shipping_options[0].id,
          },
        ],
        region_id: regions[0].id,
      });

      const { order } = await client.admin.draftOrders.markPaid(draft_order.id);

      onNext(order);
    } catch (e) {
      console.error(e);
    }
  }

  const prepareNextjsCheckout = async () => {
    const variant = product.variants[0] ?? null;
    try {
      const { cart } = await createCart({
        region_id: regions[0].id,
        items: [
          {
            variant_id: variant.id,
            quantity: 1
          }
        ]
      })

      window.open(`http://localhost:8000/checkout?cart_id=${cart.id}&onboarding=true`, "_blank")
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <>
      <div className="mb-6">
        <Text className="mb-2">
          The last step is to create a sample order using the product(s) you just created. You can then view your order’s details, process its payment, fulfillment, inventory, and more.
        </Text>
        <Text>
          You can either create an order using the Next.js starter, or we can create a sample order for you. By clicking the “Create a Sample Order” button, we’ll generate an order using the product you created and default configurations.
        </Text>
      </div>
      <div className="flex gap-2">
        {!isComplete && (
          <>
            <Button
              variant="primary"
              size="base"
              onClick={() => prepareNextjsCheckout()}
              isLoading={cartIsLoading}
            >
              Create an order with the Next.js starter
            </Button>
            <Button
              variant="secondary"
              size="base"
              onClick={() => createOrder()}
              isLoading={isLoading}
            >
              Create a sample order
            </Button>
          </>
        )}
      </div>
    </>
  );
};

export default OrdersListNextjs
