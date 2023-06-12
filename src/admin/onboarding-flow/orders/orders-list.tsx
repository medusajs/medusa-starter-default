import React from "react";
import Button from "../../shared/button";
import { useAdminProduct } from "medusa-react";
import { useAdminCreateDraftOrder } from "medusa-react";
import { useAdminShippingOptions } from "medusa-react";
import { useAdminRegions } from "medusa-react";
import { useMedusa } from "medusa-react";
import { StepContentProps } from "../onboarding-flow";

const OrdersList = ({ onNext, isComplete, data }: StepContentProps) => {
  const { product } = useAdminProduct(data.product_id);
  const { mutate: createDraftOrder, isLoading } = useAdminCreateDraftOrder();
  const { client } = useMedusa();

  const { regions } = useAdminRegions();
  const { shipping_options } = useAdminShippingOptions();

  const createOrder = () => {
    // TODO: Maybe use a specific product instead of taking first one?
    // Issues could arise if first one doesn't have variant etc
    const variant = product.variants[0] ?? null;

    createDraftOrder(
      {
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
      },
      {
        onSuccess: async ({ draft_order }) => {
          const { order } = await client.admin.draftOrders.markPaid(
            draft_order.id
          );
          onNext(order);
        },
      }
    );
  };
  return (
    <>
      <div className="py-4">
        <p>We can now create an order.</p>
        <p>
          With a Product created, we can now place an Order. Click the button
          below to create a sample order.
        </p>
      </div>
      <div className="flex gap-2">
        {!isComplete && (
          <Button
            variant="primary"
            size="small"
            onClick={() => createOrder()}
            loading={isLoading}
          >
            Create a sample order
          </Button>
        )}
      </div>
    </>
  );
};

export default OrdersList;
