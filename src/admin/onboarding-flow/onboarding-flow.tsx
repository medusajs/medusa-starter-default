import React, { useState, useEffect } from "react";
import { Container } from "../shared/container";
import Button from "../shared/button";
import { ExtensionConfig } from "@medusajs/admin-sdk";
import type { ExtensionProps } from "@medusajs/admin-shared";
import Accordion from "../shared/accordion";
import GetStartedIcon from "../shared/icons/get-started-icon";
import ProductsList from "./products/products-list";
import ProductDetail from "./products/product-detail";
import OrdersList from "./orders/orders-list";
import OrderDetail from "./orders/order-detail";
import {
  useAdminOnboardingState,
  useAdminUpdateOnboardingStateMutation,
} from "../shared/hooks";
import {
  AdminOnboardingUpdateStateReq,
  OnboardingStateRes,
  UpdateOnboardingStateInput,
} from "../../types/onboarding";
import { OnboardingState } from "../../models/onboarding";

type STEP_ID =
  | "create_product"
  | "preview_product"
  | "create_order"
  | "setup_finished";

export type StepContentProps = ExtensionProps & {
  onNext?: Function;
  isComplete?: boolean;
  data?: OnboardingState;
} & any;

type Step = {
  id: STEP_ID;
  title: string;
  component: React.FC<StepContentProps>;
  onNext?: Function;
};

const STEP_FLOW: STEP_ID[] = [
  "create_product",
  "preview_product",
  "create_order",
  "setup_finished",
];

const OnboardingFlow = (props: ExtensionProps) => {
  const { data, isLoading } = useAdminOnboardingState<OnboardingStateRes>("");
  const { mutate } = useAdminUpdateOnboardingStateMutation<
    AdminOnboardingUpdateStateReq,
    OnboardingStateRes
  >("");

  const { navigate } = props;

  const currentStep: STEP_ID | undefined = data?.status
    ?.current_step as STEP_ID;

  const [openStep, setOpenStep] = useState(currentStep);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    setOpenStep(currentStep);
    if (currentStep === STEP_FLOW[STEP_FLOW.length - 1]) setCompleted(true);
  }, [currentStep]);

  if (
    !isLoading &&
    data?.status?.is_complete &&
    !localStorage.getItem("override_onboarding_finish")
  )
    return null;

  const updateServerState = (payload: UpdateOnboardingStateInput) => {
    mutate(payload);
  };

  const onStart = () => {
    updateServerState({ current_step: STEP_FLOW[0] });
    navigate(`/a/products`);
  };

  const setStepComplete = (step_id: STEP_ID) => {
    const next = STEP_FLOW[STEP_FLOW.findIndex(step => step === step_id) + 1];
    updateServerState({ current_step: next });
    // Also set local state in case we're reopening from "Next step" without changing the actual current step
    setOpenStep(next);
  };

  const goToProductView = (product: any) => {
    setStepComplete("create_product");
    updateServerState({ product_id: product.id });
    navigate(`/a/products/${product.id}`);
  };

  const goToOrders = () => {
    setStepComplete("preview_product");
    navigate(`/a/orders`);
  };

  const goToOrderView = (order: any) => {
    setStepComplete("create_order");
    navigate(`/a/orders/${order.id}`);
  };

  const onComplete = () => {
    setCompleted(true);
  };

  const onHide = () => {
    updateServerState({ is_complete: true });
  };

  const Steps: Step[] = [
    {
      id: "create_product",
      title: "Create Product",
      component: ProductsList,
      onNext: goToProductView,
    },
    {
      id: "preview_product",
      title: "Preview Product",
      component: ProductDetail,
      onNext: goToOrders,
    },
    {
      id: "create_order",
      title: "Create an Order",
      component: OrdersList,
      onNext: goToOrderView,
    },
    {
      id: "setup_finished",
      title: "Setup Finished: Start developing with Medusa",
      component: OrderDetail,
    },
  ];

  const isStepComplete = (step_id: STEP_ID) =>
    STEP_FLOW.indexOf(currentStep) > STEP_FLOW.indexOf(step_id);

  return (
    <>
      <Container>
        <Accordion
          type="single"
          className="my-3"
          value={openStep}
          onValueChange={value => setOpenStep(value as STEP_ID)}
        >
          <div className="flex items-center">
            <div className="mr-5">
              <GetStartedIcon />
            </div>
            {!completed ? (
              <>
                <div>
                  <h1 className="font-semibold text-lg">Get started</h1>
                  <p>
                    Learn the basics of Medusa by creating your first order.
                  </p>
                </div>
                <div className="ml-auto flex items-start gap-2">
                  {!!currentStep ? (
                    <>
                      {currentStep === STEP_FLOW[STEP_FLOW.length - 1] ? (
                        <Button
                          variant="primary"
                          size="small"
                          onClick={() => onComplete()}
                        >
                          Complete Setup
                        </Button>
                      ) : (
                        <Button
                          variant="secondary"
                          size="small"
                          onClick={() => onHide()}
                        >
                          Cancel Setup
                        </Button>
                      )}
                      <Button
                        variant="nuclear"
                        size="small"
                        onClick={() => {
                          updateServerState({
                            current_step: null,
                            is_complete: null,
                            product_id: null,
                          });
                          navigate("/a/products");
                        }}
                      >
                        Reset flow (DEV)
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        variant="secondary"
                        size="small"
                        onClick={() => onHide()}
                      >
                        Close
                      </Button>
                      <Button
                        variant="primary"
                        size="small"
                        onClick={() => onStart()}
                      >
                        Begin setup
                      </Button>
                    </>
                  )}
                </div>
              </>
            ) : (
              <>
                <div>
                  <h1 className="font-semibold text-lg">
                    Thank you for completing the setup guide!
                  </h1>
                  <p>
                    This whole experience was built using our new{" "}
                    <strong>widgets</strong> feature.
                    <br /> You can find out more details and build your own by
                    following{" "}
                    <a
                      href="https://docs.medusajs.com/"
                      target="_blank"
                      className="text-blue-500 font-semibold"
                    >
                      our guide
                    </a>
                    .
                  </p>
                </div>
                <div className="ml-auto flex items-start gap-2">
                  <Button
                    variant="secondary"
                    size="small"
                    onClick={() => onHide()}
                  >
                    Close
                  </Button>
                </div>
              </>
            )}
          </div>
          {
            <div className="mt-5">
              {(!completed ? Steps : Steps.slice(-1)).map(step => {
                const isComplete = isStepComplete(step.id);
                const isCurrent = currentStep === step.id;
                return (
                  <Accordion.Item
                    title={step.title}
                    value={step.id}
                    headingSize="medium"
                    active={isCurrent}
                    complete={isComplete}
                    disabled={!isComplete && !isCurrent}
                    {...(!isComplete &&
                      !isCurrent && {
                        customTrigger: <></>,
                      })}
                  >
                    <div className="py-3 px-11 text-gray-500">
                      <step.component
                        onNext={step.onNext}
                        isComplete={isComplete}
                        data={data?.status}
                        {...props}
                      />
                    </div>
                  </Accordion.Item>
                );
              })}
            </div>
          }
        </Accordion>
      </Container>
    </>
  );
};

export const config: ExtensionConfig = {
  type: "widget",
  zone: [
    "product.list.before",
    "product.details.before",
    "order.list.before",
    "order.details.before",
  ],
};

export default OnboardingFlow;
