import React from "react";
import IconBadge from "../../shared/icon-badge";
import ComputerDesktopIcon from "../../shared/icons/computer-desktop-icon";
import DollarSignIcon from "../../shared/icons/dollar-sign-icon";
import ToolsSolidIcon from "../../shared/icons/tools-solid";

const OrderDetail = () => {
  return (
    <>
      <p className="text-sm">
        You finished the setup guide 🎉 You now have your first order. Feel free
        to play around with the order management functionalities, such as
        capturing payment, creating fulfillments, and more.
      </p>
      <h2 className="text-base mt-5 pt-5 pb-5 font-semibold text-black border-t border-gray-300 border-solid">
        Start developing with Medusa
      </h2>
      <p className="text-sm">
        Medusa is a completely customizable commerce solution. We've curated
        some essential guides to kickstart your development with Medusa.
      </p>
      <div className="grid grid-cols-3 gap-4 mt-5 pb-5 mb-5 border-b border-gray-300 border-solid auto-rows-fr">
        <a
          href="https://docs.medusajs.com/starters/nextjs-medusa-starter?path=simple-quickstart"
          target="_blank"
          className="flex"
        >
          <div
            className="p-4 rounded-rounded flex items-start bg-slate-50"
            style={{
              boxShadow:
                "0px 0px 0px 1px rgba(17, 24, 28, 0.08), 0px 1px 2px -1px rgba(17, 24, 28, 0.08), 0px 2px 4px rgba(17, 24, 28, 0.04)",
            }}
          >
            <div className="mr-base">
              <IconBadge>
                <DollarSignIcon />
              </IconBadge>
            </div>
            <div>
              <p className="font-semibold text-gray-700">
                Start Selling in 3 Steps
              </p>
              <p className="text-xs">
                Go live with a backend, an admin, and a storefront by following these three steps.
              </p>
            </div>
          </div>
        </a>
        <a
          href="https://docs.medusajs.com/recipes/?ref=onboarding"
          target="_blank"
          className="flex"
        >
          <div
            className="p-4 rounded-rounded items-start flex bg-slate-50"
            style={{
              boxShadow:
                "0px 0px 0px 1px rgba(17, 24, 28, 0.08), 0px 1px 2px -1px rgba(17, 24, 28, 0.08), 0px 2px 4px rgba(17, 24, 28, 0.04)",
            }}
          >
            <div className="mr-base">
              <IconBadge>
                <ComputerDesktopIcon />
              </IconBadge>
            </div>
            <div>
              <p className="font-semibold text-gray-700">
                Build Custom Use Cases
              </p>
              <p className="text-xs">
                Learn how to build a marketplace, subscription-based purchases, or your custom use-case.
              </p>
            </div>
          </div>
        </a>
        <a
          href="https://docs.medusajs.com/beta/?ref=onboarding"
          target="_blank"
          className="flex"
        >
          <div
            className="p-4 rounded-rounded flex items-start bg-slate-50"
            style={{
              boxShadow:
                "0px 0px 0px 1px rgba(17, 24, 28, 0.08), 0px 1px 2px -1px rgba(17, 24, 28, 0.08), 0px 2px 4px rgba(17, 24, 28, 0.04)",
            }}
          >
            <div className="mr-base">
              <IconBadge>
                <ToolsSolidIcon />
              </IconBadge>
            </div>
            <div>
              <p className="font-semibold text-gray-700">
                Check out beta features
              </p>
              <p className="text-xs">
                Learn about hidden beta features and how to enable them in your store.
              </p>
            </div>
          </div>
        </a>
      </div>
      <div>
        You can find more useful guides in{" "}
        <a
          href="https://docs.medusajs.com/?ref=onboarding"
          target="_blank"
          className="text-blue-500 font-semibold"
        >
          our documentation
        </a>
        .
      </div>
    </>
  );
};

export default OrderDetail;
