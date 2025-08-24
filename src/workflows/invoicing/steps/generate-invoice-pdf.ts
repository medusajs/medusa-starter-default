import { 
  createStep, 
  StepResponse 
} from "@medusajs/framework/workflows-sdk"
import { 
  Modules,
  ContainerRegistrationKeys 
} from "@medusajs/framework/utils"
import { INVOICING_MODULE } from "../../../modules/invoicing"
import puppeteer from "puppeteer"

type GenerateInvoicePdfInput = {
  invoice_id: string
}

export const generateInvoicePdfStep = createStep(
  "generate-invoice-pdf",
  async (input: GenerateInvoicePdfInput, { container }) => {
    const invoicingService = container.resolve(INVOICING_MODULE)
    const fileService = container.resolve(Modules.FILE)
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    
    // Get invoice with all details
    const { data: [invoiceData] } = await query.graph({
      entity: "invoice",
      fields: [
        "id",
        "invoice_number",
        "invoice_date", 
        "due_date",
        "status",
        "subtotal",
        "tax_amount",
        "total_amount",
        "currency_code",
        "billing_address",
        "shipping_address",
        "customer_email",
        "customer_phone",
        "notes",
        "payment_terms",
        "line_items.*",
      ],
      filters: {
        id: input.invoice_id,
      },
    })
    
    if (!invoiceData) {
      throw new Error(`Invoice ${input.invoice_id} not found`)
    }
    
    // Get customer details
    const { data: [customer] } = await query.graph({
      entity: "customer",
      fields: [
        "id",
        "first_name",
        "last_name",
        "email",
        "phone",
      ],
      filters: {
        id: invoiceData.customer_id,
      },
    })
    
    // Generate HTML content for PDF
    const htmlContent = generateInvoiceHtml(invoiceData, customer)
    
    // Convert HTML to PDF using Puppeteer
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    })
    
    try {
      const page = await browser.newPage()
      await page.setContent(htmlContent, { waitUntil: 'networkidle0' })
      
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20mm',
          bottom: '20mm',
          left: '15mm',
          right: '15mm'
        }
      })
      
      const filename = `invoice-${invoiceData.invoice_number}.pdf`
      
      const file = await fileService.createFiles({
        filename,
        mimeType: "application/pdf",
        content: pdfBuffer.toString('base64'),
      })
      
      await browser.close()
    } catch (error) {
      await browser.close()
      throw error
    }
    
    // Update invoice with PDF file ID
    await invoicingService.updateInvoices({ id: input.invoice_id }, {
      pdf_file_id: file.id,
    })
    
    return new StepResponse({ file, invoice: invoiceData }, file.id)
  },
  async (fileId: string, { container }) => {
    // Compensation: delete the created file if workflow fails
    if (!fileId) return
    
    const fileService = container.resolve(Modules.FILE)
    await fileService.deleteFiles(fileId)
  }
)

function generateInvoiceHtml(invoice: any, customer: any): string {
  const formatCurrency = (amount: number, currency: string = "EUR") => {
    return new Intl.NumberFormat("nl-BE", {
      style: "currency",
      currency: currency,
    }).format(amount / 100) // Convert from cents
  }
  
  const formatDate = (date: string) => {
    return new Intl.DateTimeFormat("nl-BE").format(new Date(date))
  }
  
  return `
<!DOCTYPE html>
<html lang="nl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Factuur ${invoice.invoice_number}</title>
    <style>
        body {
            font-family: 'Arial', sans-serif;
            margin: 0;
            padding: 20px;
            color: #333;
            line-height: 1.4;
        }
        .invoice-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 40px;
            border-bottom: 2px solid #2c5530;
            padding-bottom: 20px;
        }
        .company-info {
            flex: 1;
        }
        .company-name {
            font-size: 24px;
            font-weight: bold;
            color: #2c5530;
            margin-bottom: 5px;
        }
        .invoice-title {
            text-align: right;
            flex: 1;
        }
        .invoice-number {
            font-size: 28px;
            font-weight: bold;
            color: #d32f2f;
            margin-bottom: 10px;
        }
        .invoice-info {
            display: flex;
            justify-content: space-between;
            margin-bottom: 30px;
        }
        .bill-to, .invoice-details {
            flex: 1;
            margin-right: 20px;
        }
        .section-title {
            font-weight: bold;
            color: #2c5530;
            margin-bottom: 10px;
            font-size: 14px;
            text-transform: uppercase;
        }
        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
        }
        .items-table th {
            background-color: #2c5530;
            color: white;
            padding: 12px 8px;
            text-align: left;
            font-weight: bold;
        }
        .items-table td {
            padding: 10px 8px;
            border-bottom: 1px solid #ddd;
        }
        .items-table tr:nth-child(even) {
            background-color: #f9f9f9;
        }
        .totals {
            float: right;
            width: 300px;
            margin-top: 20px;
        }
        .total-row {
            display: flex;
            justify-content: space-between;
            padding: 5px 0;
        }
        .total-row.final {
            border-top: 2px solid #2c5530;
            font-weight: bold;
            font-size: 18px;
            color: #2c5530;
            padding-top: 10px;
            margin-top: 10px;
        }
        .footer {
            margin-top: 60px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            font-size: 12px;
            color: #666;
        }
        .payment-terms {
            background-color: #f5f5f5;
            padding: 15px;
            margin-top: 20px;
            border-left: 4px solid #2c5530;
        }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
    </style>
</head>
<body>
    <div class="invoice-header">
        <div class="company-info">
            <div class="company-name">Tractor & Machinery Sales</div>
            <div>Tractorstraat 123</div>
            <div>2000 Antwerpen, België</div>
            <div>BTW: BE 0123.456.789</div>
            <div>Tel: +32 3 123 45 67</div>
            <div>Email: info@tractorsales.be</div>
        </div>
        <div class="invoice-title">
            <div class="invoice-number">FACTUUR</div>
            <div class="invoice-number">${invoice.invoice_number}</div>
        </div>
    </div>

    <div class="invoice-info">
        <div class="bill-to">
            <div class="section-title">Facturatie Adres</div>
            <div><strong>${customer?.first_name || ''} ${customer?.last_name || ''}</strong></div>
            ${invoice.billing_address?.company ? `<div>${invoice.billing_address.company}</div>` : ''}
            <div>${invoice.billing_address?.address_1 || ''}</div>
            ${invoice.billing_address?.address_2 ? `<div>${invoice.billing_address.address_2}</div>` : ''}
            <div>${invoice.billing_address?.postal_code || ''} ${invoice.billing_address?.city || ''}</div>
            <div>${invoice.billing_address?.country_code || ''}</div>
            ${invoice.customer_email ? `<div>Email: ${invoice.customer_email}</div>` : ''}
            ${invoice.customer_phone ? `<div>Tel: ${invoice.customer_phone}</div>` : ''}
        </div>
        <div class="invoice-details">
            <div class="section-title">Factuur Details</div>
            <div><strong>Factuurdatum:</strong> ${formatDate(invoice.invoice_date)}</div>
            <div><strong>Vervaldatum:</strong> ${formatDate(invoice.due_date)}</div>
            <div><strong>Status:</strong> ${getStatusLabel(invoice.status)}</div>
            ${invoice.payment_terms ? `<div><strong>Betalingsvoorwaarden:</strong> ${invoice.payment_terms}</div>` : ''}
        </div>
    </div>

    <table class="items-table">
        <thead>
            <tr>
                <th>Beschrijving</th>
                <th>SKU</th>
                <th class="text-center">Aantal</th>
                <th class="text-right">Eenheidsprijs</th>
                <th class="text-right">BTW</th>
                <th class="text-right">Totaal</th>
            </tr>
        </thead>
        <tbody>
            ${invoice.line_items?.map((item: any) => `
                <tr>
                    <td>
                        <strong>${item.title}</strong>
                        ${item.description ? `<br><small>${item.description}</small>` : ''}
                        ${item.hours_worked ? `<br><small>Uren: ${item.hours_worked} @ ${formatCurrency(item.hourly_rate)}/uur</small>` : ''}
                    </td>
                    <td>${item.sku || '-'}</td>
                    <td class="text-center">${item.quantity}</td>
                    <td class="text-right">${formatCurrency(item.unit_price)}</td>
                    <td class="text-right">${Math.round(item.tax_rate * 100)}%</td>
                    <td class="text-right">${formatCurrency(item.total_price)}</td>
                </tr>
            `).join('') || ''}
        </tbody>
    </table>

    <div class="totals">
        <div class="total-row">
            <span>Subtotaal:</span>
            <span>${formatCurrency(invoice.subtotal)}</span>
        </div>
        ${invoice.discount_amount > 0 ? `
        <div class="total-row">
            <span>Korting:</span>
            <span>-${formatCurrency(invoice.discount_amount)}</span>
        </div>
        ` : ''}
        <div class="total-row">
            <span>BTW:</span>
            <span>${formatCurrency(invoice.tax_amount)}</span>
        </div>
        <div class="total-row final">
            <span>Totaal te betalen:</span>
            <span>${formatCurrency(invoice.total_amount)}</span>
        </div>
    </div>

    <div style="clear: both;"></div>

    ${invoice.notes ? `
    <div class="payment-terms">
        <div class="section-title">Opmerkingen</div>
        <div>${invoice.notes}</div>
    </div>
    ` : ''}

    <div class="payment-terms">
        <div class="section-title">Betalingsinformatie</div>
        <div>Gelieve te betalen binnen ${invoice.payment_terms || '30 dagen'} na factuurdatum.</div>
        <div>Bankrekeningnummer: BE68 5390 0754 7034</div>
        <div>BIC: BBRUBEBB</div>
        <div>Vermeld bij betaling: ${invoice.invoice_number}</div>
    </div>

    <div class="footer">
        <div class="text-center">
            <div>Tractor & Machinery Sales • BTW: BE 0123.456.789 • KvK: 12345678</div>
            <div>www.tractorsales.be • info@tractorsales.be • +32 3 123 45 67</div>
        </div>
    </div>
</body>
</html>
  `
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    draft: "Concept",
    sent: "Verzonden",
    paid: "Betaald",
    overdue: "Achterstallig",
    cancelled: "Geannuleerd",
  }
  return labels[status] || status
} 