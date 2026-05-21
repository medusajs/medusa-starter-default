import {
  AbstractNotificationProviderService,
} from "@medusajs/framework/utils"
import {
  Logger,
  ProviderSendNotificationDTO,
  ProviderSendNotificationResultsDTO,
} from "@medusajs/framework/types"
import { Resend } from "resend"
import { renderOrderPlacedEmail } from "./emails/order-placed"
import { renderShipmentCreatedEmail } from "./emails/shipment-created"
import { renderPasswordResetEmail } from "./emails/password-reset"
import { renderPreorderFulfilledEmail } from "./emails/preorder-fulfilled"
import { renderWelcomeEmail } from "./emails/welcome"

type ResendOptions = {
  api_key: string
  from: string
}

type InjectedDependencies = {
  logger: Logger
}

type TemplateRenderer = (data: Record<string, unknown>) => {
  subject: string
  html: string
}

const templates: Record<string, TemplateRenderer> = {
  "order-placed": renderOrderPlacedEmail,
  "shipment-created": renderShipmentCreatedEmail,
  "password-reset": renderPasswordResetEmail,
  "preorder-fulfilled": renderPreorderFulfilledEmail,
  "welcome": renderWelcomeEmail,
}

class ResendNotificationProviderService extends AbstractNotificationProviderService {
  static identifier = "notification-resend"

  private resendClient: Resend
  private options: ResendOptions
  private logger: Logger

  constructor({ logger }: InjectedDependencies, options: ResendOptions) {
    super()
    this.resendClient = new Resend(options.api_key)
    this.options = options
    this.logger = logger
  }

  async send(
    notification: ProviderSendNotificationDTO
  ): Promise<ProviderSendNotificationResultsDTO> {
    const renderer = templates[notification.template]

    if (!renderer) {
      this.logger.error(
        `No Resend template registered for "${notification.template}". Available: ${Object.keys(templates).join(", ")}`
      )
      return {}
    }

    const { subject, html } = renderer(notification.data ?? {})

    const { data, error } = await this.resendClient.emails.send({
      from: this.options.from,
      to: [notification.to],
      subject,
      html,
    })

    if (error || !data) {
      this.logger.error(
        `Failed to send "${notification.template}" email via Resend: ${error?.message ?? "unknown error"}`
      )
      return {}
    }

    return { id: data.id }
  }
}

export default ResendNotificationProviderService
