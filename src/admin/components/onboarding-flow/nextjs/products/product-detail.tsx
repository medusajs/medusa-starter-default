import React from "react";
import { useAdminProduct } from "medusa-react";
import { StepContentProps } from "../../../../widgets/onboarding-flow/onboarding-flow";
import { Button, Text } from "@medusajs/ui";

const ProductDetailNextjs = ({ onNext, isComplete, data }: StepContentProps) => {
  const { product, isLoading: productIsLoading } = useAdminProduct(data?.product_id)
  return (
    <div>
      <Text>On this page, you can view your product's details and edit them.</Text>
      <Text>
        You can preview your product using Medusa's Store APIs. You can copy any
        of the following code snippets to try it out.
      </Text>
      <div className="flex gap-2">
        <a
          href={`http://localhost:8000/products/${product?.handle}`}
          target="_blank"
        >
          <Button variant="primary" size="base" isLoading={productIsLoading}>
            Open preview in Next.js Storefront
          </Button>
        </a>
        {!isComplete && (
          <Button variant="secondary" size="base" onClick={() => onNext()}>
            Next step
          </Button>
        )}
      </div>
    </div>
  );
};

export default ProductDetailNextjs
