import { MedusaService } from "@medusajs/framework/utils"
import InvoiceSettings from "./models/invoice-settings"

class InvoiceSettingsService extends MedusaService({
  InvoiceSettings,
}) {
  async getActiveSettings() {
    const [settings] = await this.listInvoiceSettings()
    return settings
  }

  async updateSettings(data: any) {
    const settings = await this.getActiveSettings()
    if (settings) {
      return await this.updateInvoiceSettings({
        id: settings.id,
        ...data,
      })
    }
    return await this.createInvoiceSettings(data)
  }
}

export default InvoiceSettingsService





