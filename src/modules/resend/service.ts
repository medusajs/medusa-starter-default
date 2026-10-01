import {
  AbstractNotificationProviderService,
  MedusaError,
} from "@medusajs/framework/utils"
import {
  Logger,
  ProviderSendNotificationDTO,
  ProviderSendNotificationResultsDTO,
} from "@medusajs/framework/types"
import { Resend } from "resend"

import type { EmailRenderer } from "./emails/_shared"
import { renderEmailVerifyEmail } from "./emails/email-verify"
import { renderOrderPlacedEmail } from "./emails/order-placed"
import { renderPasswordResetEmail } from "./emails/password-reset"
import { renderPreorderFulfilledEmail } from "./emails/preorder-fulfilled"
import { renderShipmentCreatedEmail } from "./emails/shipment-created"
import { renderWelcomeEmail } from "./emails/welcome"

type ResendOptions = {
  api_key: string
  from: string
}

type InjectedDependencies = {
  logger: Logger
}

const templates: Record<string, EmailRenderer> = {
  "order-placed": renderOrderPlacedEmail,
  "shipment-created": renderShipmentCreatedEmail,
  "password-reset": renderPasswordResetEmail,
  "preorder-fulfilled": renderPreorderFulfilledEmail,
  "welcome": renderWelcomeEmail,
  "email-verify": renderEmailVerifyEmail,
}

// Errors are thrown (not swallowed) so the notification module marks the
// notification as failed instead of recording a silent success.
class ResendNotificationProviderService extends AbstractNotificationProviderService {
  static identifier = "notification-resend"

  private resendClient: Resend
  private options: ResendOptions
  private logger: Logger

  static validateOptions(options: Record<string, unknown>) {
    if (!options.api_key) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Resend notification provider: `api_key` option is required (RESEND_API_KEY).",
      )
    }
    if (!options.from) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Resend notification provider: `from` option is required (RESEND_FROM_EMAIL).",
      )
    }
  }

  constructor({ logger }: InjectedDependencies, options: ResendOptions) {
    super()
    this.resendClient = new Resend(options.api_key)
    this.options = options
    this.logger = logger
  }

  async send(
    notification: ProviderSendNotificationDTO,
  ): Promise<ProviderSendNotificationResultsDTO> {
    const renderer = templates[notification.template]
    if (!renderer) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `No Resend template registered for "${notification.template}". Available: ${Object.keys(templates).join(", ")}`,
      )
    }

    const { subject, html } = renderer(notification.data ?? {})

    const { data, error } = await this.resendClient.emails.send({
      from: notification.from || this.options.from,
      to: [notification.to],
      subject,
      html,
    })

    if (error) {
      this.logger.error(
        `Resend rejected "${notification.template}" email: ${error.message}`,
      )
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `Resend failed to send "${notification.template}" email: ${error.message}`,
      )
    }

    return { id: data.id }
  }
}

export default ResendNotificationProviderService
