import React from "react";
import Button from "../../shared/button";
import { useAdminCreateProduct, useAdminCreateCollection } from "medusa-react";
import { useAdminRegions } from "medusa-react";
import { StepContentProps } from "../../../widgets/onboarding-flow/onboarding-flow";

// Needed for sample product creation — not exported by anything importable here
enum ProductStatus {
  PUBLISHED = "published",
}

const ProductsList = ({ onNext, isComplete }: StepContentProps) => {
  const { mutateAsync: createCollection, isLoading: collectionLoading } =
    useAdminCreateCollection();
  const { mutateAsync: createProduct, isLoading: productLoading } =
    useAdminCreateProduct();
  const { regions } = useAdminRegions();

  const isLoading = collectionLoading || productLoading;

  const createSample = async () => {
    try {
      const { collection } = await createCollection({
        title: "Merch",
        handle: "merch",
      });
      const { product } = await createProduct({
        title: "Medusa T-Shirt",
        description: "Comfy t-shirt with Medusa logo",
        subtitle: "Black",
        is_giftcard: false,
        discountable: false,
        options: [{ title: "Size" }],
        images: [
          "https://medusa-public-images.s3.eu-west-1.amazonaws.com/tee-black-front.png",
          "https://medusa-public-images.s3.eu-west-1.amazonaws.com/tee-black-back.png",
        ],
        collection_id: collection.id,
        variants: [
          {
            title: "Small",
            inventory_quantity: 25,
            manage_inventory: true,
            prices: regions.map(region => ({
              amount: 5000,
              currency_code: region.currency_code,
            })),
            options: [{ value: "S" }],
          },
          {
            title: "Medium",
            inventory_quantity: 10,
            manage_inventory: true,
            prices: regions.map(region => ({
              amount: 5000,
              currency_code: region.currency_code,
            })),
            options: [{ value: "M" }],
          },
          {
            title: "Large",
            inventory_quantity: 17,
            manage_inventory: true,
            prices: regions.map(region => ({
              amount: 5000,
              currency_code: region.currency_code,
            })),
            options: [{ value: "L" }],
          },
          {
            title: "Extra Large",
            inventory_quantity: 22,
            manage_inventory: true,
            prices: regions.map(region => ({
              amount: 5000,
              currency_code: region.currency_code,
            })),
            options: [{ value: "XL" }],
          },
        ],
        status: ProductStatus.PUBLISHED,
      });
      onNext(product);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div>
      <p>
        Create a product and set its general details such as title and
        description, its price, options, variants, images, and more. You'll then
        use the product to create a sample order.
      </p>
      <p>
        If you're not ready to create a product, we can create a sample product
        for you.
      </p>
      {!isComplete && (
        <div className="flex gap-2 mt-4">
          <Button
            variant="secondary"
            size="small"
            onClick={() => createSample()}
            loading={isLoading}
          >
            Create sample product
          </Button>
        </div>
      )}
    </div>
  );
};

export default ProductsList;
