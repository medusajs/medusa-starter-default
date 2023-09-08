import React from "react";
import { useAdminPublishableApiKeys } from "medusa-react";
import { StepContentProps } from "../../../../widgets/onboarding-flow/onboarding-flow";
import { Button, CodeBlock, Text } from "@medusajs/ui";

const ProductDetailDefault = ({ onNext, isComplete, data }: StepContentProps) => {
  const { publishable_api_keys: keys, isLoading } = useAdminPublishableApiKeys({
    offset: 0,
    limit: 1,
  });
  const api_key = keys?.[0]?.id || "pk_01H0PY648BTMEJR34ZDATXZTD9";
  return (
    <div>
      <div className="flex flex-col gap-2">
        <Text>On this page, you can view your product's details and edit them.</Text>
        <Text>
          You can preview your product using Medusa's Store APIs. You can copy any
          of the following code snippets to try it out.
        </Text>
      </div>
      <div>
        {!isLoading && (
          <CodeBlock snippets={[
            {
              label: "cURL",
              language: "bash",
              code: `curl "http://localhost:9000/store/products/${data?.product_id}" -H "x-publishable-key: ${api_key}"`,
            },
            {
              label: "Medusa JS Client",
              language: "js",
              code: `// Install the JS Client in your storefront project: @medusajs/medusa-js\n\nimport Medusa from "@medusajs/medusa-js"\n\nconst medusa = new Medusa({ publishableApiKey: "${api_key}"})\nconst product = await medusa.products.retrieve("${data?.product_id}")\nconsole.log(product.id)`,
            },
            {
              label: "Medusa React",
              language: "tsx",
              code: `// Install the React SDK and required dependencies in your storefront project:\n// medusa-react @tanstack/react-query @medusajs/medusa\n\nimport { useProduct } from "medusa-react"\n\nconst { product } = useProduct("${data?.product_id}")\nconsole.log(product.id)`,
            },
            {
              label: "@medusajs/product",
              language: "tsx",
              code: `// Install the Product module in a serverless project, such as a Next.js storefront: @medusajs/product\n\nimport {\ninitialize as initializeProductModule,\n} from "@medusajs/product"\n\n// in an async function, or you can use promises\nasync () => {\n  // ...\n  const productService = await initializeProductModule()\n  const products = await productService.list({\n    id: "${data?.product_id}",\n  })\n\n  console.log(products[0])\n}`,
            },
          ]} className="my-6">
            <CodeBlock.Header />
            <CodeBlock.Body />
          </CodeBlock>
        )}
      </div>
      <div className="flex gap-2">
        <a
          href={`http://localhost:9000/store/products/${data?.product_id}`}
          target="_blank"
        >
          <Button variant="secondary" size="base">
            Open preview in browser
          </Button>
        </a>
        {!isComplete && (
          <Button variant="primary" size="base" onClick={() => onNext()}>
            Next step
          </Button>
        )}
      </div>
    </div>
  );
};

export default ProductDetailDefault;
