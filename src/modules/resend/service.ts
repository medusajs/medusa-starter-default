import { AbstractNotificationProviderService } from "@medusajs/utils"
import { Logger } from "@medusajs/framework/types"
import { NotificationTypes } from "@medusajs/framework/types"
import { Resend } from "resend"

type InjectedDependencies = {
  logger: Logger
}

type ResendOptions = {
  api_key: string
  from: string
  html_templates?: Record<string, {
    subject?: string
    content: string
  }>
}

class ResendNotificationProviderService extends AbstractNotificationProviderService {
  static identifier = "notification-resend"
  private resendClient: Resend
  private options_: ResendOptions
  private logger_: Logger

  constructor(
    { logger }: InjectedDependencies,
    options: ResendOptions
  ) {
    super()
    this.logger_ = logger
    this.options_ = options
    this.resendClient = new Resend(options.api_key)
  }

  async send(
    notification: NotificationTypes.ProviderSendNotificationDTO
  ): Promise<NotificationTypes.ProviderSendNotificationResultsDTO> {
    const { to, channel, template, data } = notification

    if (channel !== "email") {
      this.logger_.warn(`Channel ${channel} is not supported. Only 'email' is supported.`)
      return {}
    }

    try {
      // Get template or use default
      const htmlTemplate = this.options_.html_templates?.[template]
      
      const subject = htmlTemplate?.subject || (data?.subject as string) || "Notification"
      const html = htmlTemplate?.content || (data?.body as string) || (data?.html as string) || ""

      const emailOptions: any = {
        from: this.options_.from,
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
      }

      if (data?.cc) {
        emailOptions.cc = Array.isArray(data.cc) ? data.cc : [data.cc]
      }

      if (data?.attachments) {
        emailOptions.attachments = Array.isArray(data.attachments) ? data.attachments : [data.attachments]
      }

      const result = await this.resendClient.emails.send(emailOptions)

      this.logger_.info(`Email sent successfully: ${result.data?.id}`)
      
      return {
        id: result.data?.id || "",
      }
    } catch (error) {
      this.logger_.error("Failed to send email via Resend:", error)
      throw error
    }
  }
}

export default ResendNotificationProviderService

