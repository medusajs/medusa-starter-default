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
        <p>You can now create an order.</p>
        <p>
          To create an order, you can choose to create a sample order, use
          Swagger UI to simulate the necessary API requests to create an order,
          or use Medusa's Next.js Storefront Starter.
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
        <a
          href="https://docs.medusajs.com/starters/nextjs-medusa-starter"
          target="_blank"
        >
          <Button variant="secondary" size="small">
            Install Next.js Starter Storefront
          </Button>
        </a>
      </div>
    </>
  );
};

export default OrdersList;
