import { WidgetConfig, WidgetProps } from "@medusajs/admin";
import { useAdminCustomPost, useAdminCustomQuery } from "medusa-react";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { OnboardingState } from "../../../models/onboarding";
import {
  AdminOnboardingUpdateStateReq,
  OnboardingStateRes,
  UpdateOnboardingStateInput,
} from "../../../types/onboarding";
import OrderDetail from "../../components/onboarding-flow/orders/order-detail";
import OrdersList from "../../components/onboarding-flow/orders/orders-list";
import ProductDetail from "../../components/onboarding-flow/products/product-detail";
import ProductsList from "../../components/onboarding-flow/products/products-list";
import { Avatar, Button, Container, Heading, Text, clx } from "@medusajs/ui";
import Accordion from "../../components/shared/accordion";

type STEP_ID =
  | "create_product"
  | "preview_product"
  | "create_order"
  | "setup_finished";

export type StepContentProps = WidgetProps & {
  onNext?: Function;
  isComplete?: boolean;
  data?: OnboardingState;
};

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

const QUERY_KEY = ["onboarding_state"];

const OnboardingFlow = (props: WidgetProps) => {
  const { data, isLoading } = useAdminCustomQuery<
    undefined,
    OnboardingStateRes
  >("/onboarding", QUERY_KEY);
  const { mutate } = useAdminCustomPost<
    AdminOnboardingUpdateStateReq,
    OnboardingStateRes
  >("/onboarding", QUERY_KEY);

  const navigate = useNavigate();

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

  const updateServerState = (
    payload: UpdateOnboardingStateInput,
    onSuccess: () => void = () => {}
  ) => {
    mutate(payload, { onSuccess });
  };

  const onStart = () => {
    updateServerState({ current_step: STEP_FLOW[0] });
    navigate(`/a/products`);
  };

  const setStepComplete = ({
    step_id,
    extraData,
    onComplete,
  }: {
    step_id: STEP_ID;
    extraData?: UpdateOnboardingStateInput;
    onComplete?: () => void;
  }) => {
    const next = STEP_FLOW[STEP_FLOW.findIndex((step) => step === step_id) + 1];
    updateServerState({ current_step: next, ...extraData }, onComplete);
  };

  const goToProductView = (product: any) => {
    setStepComplete({
      step_id: "create_product",
      extraData: { product_id: product.id },
      onComplete: () => navigate(`/a/products/${product.id}`),
    });
  };

  const goToOrders = () => {
    setStepComplete({
      step_id: "preview_product",
      onComplete: () => navigate(`/a/orders`),
    });
  };

  const goToOrderView = (order: any) => {
    setStepComplete({
      step_id: "create_order",
      onComplete: () => navigate(`/a/orders/${order.id}`),
    });
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
      <Container className={clx(
        "text-ui-fg-subtle px-0 pt-0 pb-4",
        {
          "mb-4": completed
        }
      )}>
        <Accordion
          type="single"
          value={openStep}
          onValueChange={(value) => setOpenStep(value as STEP_ID)}
        >
          <div className={clx(
            "flex py-6 px-8",
            {
              "items-start": completed,
              "items-center": !completed
            }
          )}>
            <Avatar 
              size="large"
              fallback="M"
              src="data:image/png;base64,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"
              className="mr-4"
            />
            {!completed ? (
              <>
                <div>
                  <Heading level="h1" className="text-ui-fg-base">Get started</Heading>
                  <Text>
                    Learn the basics of Medusa by creating your first order.
                  </Text>
                </div>
                <div className="ml-auto flex items-start gap-2">
                  {!!currentStep ? (
                    <>
                      {currentStep === STEP_FLOW[STEP_FLOW.length - 1] ? (
                        <Button
                          variant="primary"
                          size="base"
                          onClick={() => onComplete()}
                        >
                          Complete Setup
                        </Button>
                      ) : (
                        <Button
                          variant="secondary"
                          size="base"
                          onClick={() => onHide()}
                        >
                          Cancel Setup
                        </Button>
                      )}
                    </>
                  ) : (
                    <>
                      <Button
                        variant="secondary"
                        size="base"
                        onClick={() => onHide()}
                      >
                        Close
                      </Button>
                      <Button
                        variant="primary"
                        size="base"
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
                  <Heading level="h1" className="text-ui-fg-base">
                    Thank you for completing the setup guide!
                  </Heading>
                  <Text>
                    This whole experience was built using our new{" "}
                    <strong>widgets</strong> feature.
                    <br /> You can find out more details and build your own by
                    following{" "}
                    <a
                      href="https://docs.medusajs.com/admin/onboarding?ref=onboarding"
                      target="_blank"
                      className="text-blue-500 font-semibold"
                    >
                      our guide
                    </a>
                    .
                  </Text>
                </div>
                <div className="ml-auto flex items-start gap-2">
                  <Button
                    variant="secondary"
                    size="base"
                    onClick={() => onHide()}
                  >
                    Close
                  </Button>
                </div>
              </>
            )}
          </div>
          {
            <div>
              {(!completed ? Steps : Steps.slice(-1)).map((step) => {
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
                    key={step.id}
                    {...(!isComplete &&
                      !isCurrent && {
                        customTrigger: <></>,
                      })}
                  >
                    <div className="pl-14 pb-6 pr-7">
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

export const config: WidgetConfig = {
  zone: [
    "product.list.before",
    "product.details.before",
    "order.list.before",
    "order.details.before",
  ],
};

export default OnboardingFlow;
