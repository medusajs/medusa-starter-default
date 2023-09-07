import React from "react";
import { ComputerDesktopSolid, CurrencyDollarSolid, ToolsSolid } from "@medusajs/icons";
import { Badge, Heading, Text } from "@medusajs/ui";

const OrderDetailDefault = () => {
  return (
    <>
      <Text size="small" className="mb-6">
        You finished the setup guide 🎉 You now have your first order. Feel free
        to play around with the order management functionalities, such as
        capturing payment, creating fulfillments, and more.
      </Text>
      <Heading level="h2" className="text-ui-fg-base pt-6 border-t border-ui-border-base border-solid mb-2">
        Start developing with Medusa
      </Heading>
      <Text size="small">
        Medusa is a completely customizable commerce solution. We've curated
        some essential guides to kickstart your development with Medusa.
      </Text>
      <div className="grid grid-cols-3 gap-4 mt-6 pb-6 mb-6 border-b border-ui-border-base border-solid auto-rows-fr">
        <a
          href="https://docs.medusajs.com/starters/nextjs-medusa-starter?path=simple-quickstart"
          target="_blank"
          className="flex"
        >
          <div
            className="p-3 rounded-rounded flex items-start bg-ui-bg-subtle shadow-elevation-card-rest hover:shadow-elevation-card-hover"
          >
            <div className="mr-4">
              <div className="bg-ui-bg-base rounded-lg border border-ui-border-strong p-1 flex justify-center items-center">
                <Badge type="icon">
                  <CurrencyDollarSolid />
                </Badge>
              </div>
            </div>
            <div>
              <Text size="xsmall" weight="plus" className="mb-1 text-ui-fg-base">
                Start Selling in 3 Steps
              </Text>
              <Text size="small">
                Go live with a backend, an admin, and a storefront by following these three steps.
              </Text>
            </div>
          </div>
        </a>
        <a
          href="https://docs.medusajs.com/recipes/?ref=onboarding"
          target="_blank"
          className="flex"
        >
          <div
            className="p-3 rounded-rounded items-start flex bg-ui-bg-subtle shadow-elevation-card-rest hover:shadow-elevation-card-hover"
          >
            <div className="mr-4">
              <div className="bg-ui-bg-base rounded-lg border border-ui-border-strong p-1 flex justify-center items-center">
                <Badge type="icon">
                  <ComputerDesktopSolid />
                </Badge>
              </div>
            </div>
            <div>
              <Text size="xsmall" weight="plus" className="mb-1 text-ui-fg-base">
                Build Custom Use Cases
              </Text>
              <Text size="small">
                Learn how to build a marketplace, subscription-based purchases, or your custom use-case.
              </Text>
            </div>
          </div>
        </a>
        <a
          href="https://docs.medusajs.com/beta/?ref=onboarding"
          target="_blank"
          className="flex"
        >
          <div
            className="p-3 rounded-rounded items-start flex bg-ui-bg-subtle shadow-elevation-card-rest hover:shadow-elevation-card-hover"
          >
            <div className="mr-4">
              <div className="bg-ui-bg-base rounded-lg border border-ui-border-strong p-1 flex justify-center items-center">
                <Badge type="icon">
                  <ToolsSolid />
                </Badge>
              </div>
            </div>
            <div>
              <Text size="xsmall" weight="plus" className="mb-1 text-ui-fg-base">
                Check out beta features
              </Text>
              <Text size="small">
                Learn about hidden beta features and how to enable them in your store.
              </Text>
            </div>
          </div>
        </a>
      </div>
      <div>
        You can find more useful guides in{" "}
        <a
          href="https://docs.medusajs.com/?ref=onboarding"
          target="_blank"
          className="text-ui-fg-interactive hover:text-ui-fg-interactive-hover"
        >
          our documentation
        </a>
        . If you like Medusa, please{" "}
        <a 
          href="https://github.com/medusajs/medusa"
          target="_blank"
          className="text-ui-fg-interactive hover:text-ui-fg-interactive-hover"
        >
          star us on GitHub
        </a>
        .
      </div>
    </>
  );
};

export default OrderDetailDefault;
