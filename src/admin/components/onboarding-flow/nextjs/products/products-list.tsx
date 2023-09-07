import React from "react";
import { useAdminCreateProduct, useAdminCreateCollection } from "medusa-react";
import { useAdminRegions } from "medusa-react";
import { StepContentProps } from "../../../../widgets/onboarding-flow/onboarding-flow";
import { Button, Text } from "@medusajs/ui";
import { AdminPostProductsReq, Product } from "@medusajs/medusa";
import getSampleProducts from "../../../../utils/sample-products";

const ProductsListNextjs = ({ onNext, isComplete }: StepContentProps) => {
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

      const tryCreateProduct = async (sampleProduct: AdminPostProductsReq): Promise<Product | null> => {
        try {
          return (await createProduct(sampleProduct)).product
        } catch {
          // ignore if product already exists
          return null
        }
      }

      let product: Product
      const sampleProducts = getSampleProducts({
        regions,
        collection_id: collection.id
      })
      await Promise.all(
        sampleProducts.map(async (sampleProduct, index) => {
          const createdProduct = await tryCreateProduct(sampleProduct)
          if (index === 0 && createProduct) {
            product = createdProduct
          }
        })
      )
      onNext(product);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div>
      <Text className="mb-2">
        Create a product and set its general details such as title and description, its price, 
        options, variants, images, and more. You'll then use the product to create a sample order.
      </Text>
      <Text>
      You can create a product by clicking the “New Product” button at the top right of the overview below this setup. 
      If you’re not ready to create a product, we can create some sample products that will
      help you explore Medusa and the Next.js storefront better.
      </Text>
      {!isComplete && (
        <div className="flex gap-2 mt-6">
          <Button
            variant="primary"
            size="base"
            onClick={() => createSample()}
            isLoading={isLoading}
          >
            Create sample products
          </Button>
        </div>
      )}
    </div>
  );
};

export default ProductsListNextjs;
