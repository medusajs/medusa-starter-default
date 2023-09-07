import React from "react";
import { useAdminProduct } from "medusa-react";
import { StepContentProps } from "../../../../widgets/onboarding-flow/onboarding-flow";
import { Button, Text, clx } from "@medusajs/ui";

const ProductDetailNextjs = ({ onNext, isComplete, data }: StepContentProps) => {
  const { product, isLoading: productIsLoading } = useAdminProduct(data?.product_id)
  return (
    <div>
      <div className="flex flex-col gap-2">
        <Text>On this page, you can view your product's details and edit them.</Text>
        <Text>
          We’ve created a Next.js storefront for you in the{" "}
          <code className={clx(
            "p-0 px-[6px] bg-ui-tag-neutral-bg border border-ui-tag-neutral-border",
            "text-ui-tag-neutral-text leading-6 rounded-md"
          )}>
            {process.env.MEDUSA_ADMIN_ONBOARDING_NEXTJS_DIRECTORY}
          </code>{" "}
          directory.
        </Text>
        <Text>
          Medusa and the Next.js storefront are separate projects. Medusa stands on its own and can work with any storefront you prefer. 
          However, the{" "}
          <a 
            href="https://github.com/medusajs/nextjs-starter-medusa"
            target="_blank"
            className="text-ui-fg-interactive hover:text-ui-fg-interactive-hover"
          >
            Next.js storefront
          </a>{" "}
          Next.js storefront is a perfect partner for Medusa, offering all the essentials you need for 
          ecommerce and seamlessly connecting to Medusa's backend.
        </Text>
        <Text>
          You can now check out your newly created products in the storefront!
        </Text>
      </div>
      <div className="flex gap-2 mt-6">
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
