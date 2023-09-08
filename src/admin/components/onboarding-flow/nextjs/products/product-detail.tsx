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
          We've created a Next.js project for you in the{" "}
          <code className={clx(
            "p-0 px-[6px] bg-ui-tag-neutral-bg border border-ui-tag-neutral-border",
            "text-ui-tag-neutral-text leading-6 rounded-md"
          )}>
            {process.env.MEDUSA_ADMIN_ONBOARDING_NEXTJS_DIRECTORY}
          </code>{" "}
          directory.
        </Text>
        <Text>
          Your Medusa instance and Next.js storefront are two separate projects.
          Medusa is a headless commerce engine, and ecommerce is one of many types of applications you can build with it.
        </Text>
        <Text>
          The{" "}
          <a 
            href="https://github.com/medusajs/nextjs-starter-medusa"
            target="_blank"
            className="text-ui-fg-interactive hover:text-ui-fg-interactive-hover"
          >
            Next.js Starter Storefront
          </a>{" "}
          is a great option, offering all ecommerce essentials and seamless communication with your Medusa instance.
        </Text>
        <Text>
          You can now check out your newly created products in the storefront.
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
