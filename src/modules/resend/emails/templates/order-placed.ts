// Handlebars source for the "order-placed" email. Kept as a TS module (not a
// loose .html file) so `medusa build` compiles it into .medusa/server.
// Edit the markup freely, but avoid backticks, "${" and backslashes.
export default /* html */ `<!doctype html>
<html lang="de" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
  <head>
    <meta charset="utf-8" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="dark light" />
    <meta name="supported-color-schemes" content="dark light" />
    <title>Bestellung {{order.display_id}} bestätigt</title>

    <!--[if mso]>
    <noscript>
      <xml>
        <o:OfficeDocumentSettings>
          <o:PixelsPerInch>96</o:PixelsPerInch>
        </o:OfficeDocumentSettings>
      </xml>
    </noscript>
    <![endif]-->

    <style>
      /* Resets — only for clients that read <style> blocks. Inline styles below are the source of truth. */
      body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
      table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
      img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; display: block; }
      a { color: #d6a14d; text-decoration: none; }

      /* Mobile tweaks */
      @media only screen and (max-width: 620px) {
        .container { width: 100% !important; }
        .px-32 { padding-left: 20px !important; padding-right: 20px !important; }
        .py-40 { padding-top: 24px !important; padding-bottom: 24px !important; }
        .hero-title { font-size: 26px !important; line-height: 32px !important; }
        .item-thumb { width: 56px !important; height: 70px !important; }
        .stack-mobile { display: block !important; width: 100% !important; }
        .stack-mobile + .stack-mobile { margin-top: 16px; }
      }
    </style>
  </head>

  <body style="margin:0; padding:0; background-color:#1c1812; color:#f4eee2; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
    <!-- Preheader (hidden, shown in inbox preview) -->
    <div style="display:none; visibility:hidden; opacity:0; height:0; width:0; overflow:hidden; mso-hide:all; font-size:1px; line-height:1px; color:#1c1812;">
      Deine Bestellung {{order.display_id}} ist bei uns angekommen. Gesamt {{order.total_formatted}}.
    </div>

    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#1c1812;">
      <tr>
        <td align="center" style="padding: 32px 16px;">

          <!-- ============ Container ============ -->
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" class="container" style="width:600px; max-width:600px; background-color:#25201a; border-radius:12px; overflow:hidden;">

            <!-- ============ Header ============ -->
            <tr>
              <td class="px-32 py-40" style="padding: 28px 32px; border-bottom: 1px solid #2e2820;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                  <tr>
                    <td align="left" valign="middle">
                      <a href="{{site_url}}" style="text-decoration:none; color:#f4eee2; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size:22px; font-weight:600; letter-spacing:-0.02em;">
                        Kiji<span style="color:#d6a14d;">·</span>Games
                      </a>
                    </td>
                    <td align="right" valign="middle" style="font-family: 'SFMono-Regular', Menlo, Consolas, monospace; font-size:11px; letter-spacing:0.08em; text-transform:uppercase; color:#ada18e;">
                      Bestellung
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- ============ Hero ============ -->
            <tr>
              <td class="px-32" style="padding: 40px 32px 8px 32px;" align="center">
                <!-- Status pill -->
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center">
                  <tr>
                    <td style="padding: 6px 14px; background-color: rgba(214,161,77,0.14); border-radius: 999px; font-family: 'SFMono-Regular', Menlo, Consolas, monospace; font-size:11px; letter-spacing:0.08em; text-transform:uppercase; color:#d6a14d;">
                      Bestellt · {{order.created_at_formatted}}
                    </td>
                  </tr>
                </table>

                <h1 class="hero-title" style="margin: 20px 0 8px 0; font-size: 30px; line-height: 36px; font-weight: 600; letter-spacing: -0.02em; color:#f4eee2;">
                  Danke, {{customer.first_name}}.
                </h1>
                <p style="margin: 0 0 4px 0; font-size: 15px; line-height: 22px; color: #ada18e;">
                  Bestellung <span style="font-family:'SFMono-Regular',Menlo,Consolas,monospace; color:#f4eee2;">#{{order.display_id}}</span> ist bei uns angekommen.
                </p>
                <p style="margin: 0; font-size: 15px; line-height: 22px; color: #ada18e;">
                  Wir packen sie und melden uns, sobald sie unterwegs ist.
                </p>
              </td>
            </tr>

            <!-- ============ CTA ============ -->
            <tr>
              <td align="center" style="padding: 24px 32px 32px 32px;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td align="center" style="border-radius: 8px; background-color: #d6a14d;">
                      <a href="{{order_url}}"
                         style="display:inline-block; padding: 12px 28px; font-size: 15px; font-weight: 500; line-height: 20px; color: #1c1812; text-decoration: none; border-radius: 8px;">
                        Bestellung ansehen
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- ============ Preorder hint ============ -->
            {{#if has_preorder_items}}
            <tr>
              <td class="px-32" style="padding: 0 32px 8px 32px;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#1c1812; border-radius: 10px;">
                  <tr>
                    <td style="padding: 14px 16px; font-size: 13px; line-height: 19px; color:#ada18e;">
                      <strong style="color:#d6a14d;">Vorbestellte Artikel</strong> in deiner Bestellung sind unten markiert.
                      Die Belastung erfolgt jetzt, der Versand sobald die Artikel verfügbar sind.
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            {{/if}}

            <!-- ============ Items ============ -->
            <tr>
              <td class="px-32" style="padding: 0 32px;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-top: 1px solid #2e2820;">
                  {{#each order.items}}
                  <tr>
                    <td style="padding: 16px 0; border-bottom: 1px solid #2e2820;">
                      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                        <tr>
                          <!-- Thumb -->
                          <td valign="top" style="width: 72px; padding-right: 16px;">
                            <img class="item-thumb" src="{{thumbnail}}" width="72" height="90" alt="" style="display:block; width:72px; height:90px; border-radius: 6px; background-color: #1c1812; object-fit: contain;" />
                          </td>

                          <!-- Title + meta -->
                          <td valign="top" style="font-size:14px; line-height:20px; color:#f4eee2;">
                            <div style="font-weight:500; color:#f4eee2;">{{title}}</div>
                            {{#if variant_title}}
                              <div style="margin-top:2px; font-size:12px; color:#ada18e;">{{variant_title}}</div>
                            {{/if}}
                            {{#if is_preorder}}
                              <div style="margin-top:6px; display:inline-block; padding: 3px 8px; background-color: rgba(214,161,77,0.14); border-radius: 999px; font-family:'SFMono-Regular',Menlo,Consolas,monospace; font-size:11px; letter-spacing:0.06em; text-transform:uppercase; color:#d6a14d;">
                                Vorbestellung{{#if available_date_formatted}} · ab {{available_date_formatted}}{{/if}}
                              </div>
                            {{/if}}
                            <div style="margin-top:6px; font-family:'SFMono-Regular',Menlo,Consolas,monospace; font-size:12px; color:#ada18e;">
                              {{quantity}} × {{unit_price_formatted}}
                            </div>
                          </td>

                          <!-- Line total -->
                          <td valign="top" align="right" style="font-family:'SFMono-Regular',Menlo,Consolas,monospace; font-size:14px; font-weight:500; color:#f4eee2; white-space:nowrap; padding-left: 12px;">
                            {{line_total_formatted}}
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  {{/each}}
                </table>
              </td>
            </tr>

            <!-- ============ Cost summary ============ -->
            <tr>
              <td class="px-32" style="padding: 16px 32px 8px 32px;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="font-size:14px; line-height:20px;">

                  <tr>
                    <td style="padding: 6px 0; color:#ada18e;">Zwischensumme</td>
                    <td align="right" style="padding: 6px 0; font-family:'SFMono-Regular',Menlo,Consolas,monospace; color:#f4eee2;">{{order.original_item_total_formatted}}</td>
                  </tr>

                  {{#if order.discount_total_raw}}
                  {{#each order.discount_lines}}
                  <tr>
                    <td style="padding: 6px 0; color:#d6a14d;">
                      Rabatt{{#if code}} · <span style="font-family:'SFMono-Regular',Menlo,Consolas,monospace;">{{code}}</span>{{/if}}
                    </td>
                    <td align="right" style="padding: 6px 0; font-family:'SFMono-Regular',Menlo,Consolas,monospace; color:#d6a14d;">−{{amount_formatted}}</td>
                  </tr>
                  {{/each}}
                  {{/if}}

                  <tr>
                    <td style="padding: 6px 0; color:#ada18e;">Versand{{#if order.shipping_method_name}} · {{order.shipping_method_name}}{{/if}}</td>
                    <td align="right" style="padding: 6px 0; font-family:'SFMono-Regular',Menlo,Consolas,monospace; color:#f4eee2;">{{order.shipping_total_formatted}}</td>
                  </tr>

                  <tr>
                    <td colspan="2" style="padding: 8px 0 0 0;"><div style="border-top: 1px solid #2e2820; height:1px; line-height:1px;">&nbsp;</div></td>
                  </tr>

                  <tr>
                    <td style="padding: 12px 0 4px 0; font-size:15px; font-weight:600; color:#f4eee2;">Gesamt</td>
                    <td align="right" style="padding: 12px 0 4px 0; font-family:'SFMono-Regular',Menlo,Consolas,monospace; font-size:15px; font-weight:600; color:#f4eee2;">{{order.total_formatted}}</td>
                  </tr>
                  <tr>
                    <td style="padding: 0 0 8px 0; font-size:12px; color:#ada18e;">davon enthaltene Steuern</td>
                    <td align="right" style="padding: 0 0 8px 0; font-family:'SFMono-Regular',Menlo,Consolas,monospace; font-size:12px; color:#ada18e;">{{order.tax_total_formatted}}</td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- ============ Address + Shipping method ============ -->
            <tr>
              <td class="px-32" style="padding: 16px 32px 32px 32px;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-top: 1px solid #2e2820;">
                  <tr>
                    <td style="padding-top: 24px;">
                      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                        <tr>
                          <td class="stack-mobile" valign="top" width="50%" style="padding-right: 12px; vertical-align: top;">
                            <div style="font-family:'SFMono-Regular',Menlo,Consolas,monospace; font-size:11px; letter-spacing:0.08em; text-transform:uppercase; color:#ada18e; margin-bottom: 8px;">Lieferadresse</div>
                            <div style="font-size:14px; line-height:20px; color:#f4eee2;">
                              {{shipping_address.first_name}} {{shipping_address.last_name}}<br />
                              {{#if shipping_address.company}}{{shipping_address.company}}<br />{{/if}}
                              {{shipping_address.address_1}}<br />
                              {{#if shipping_address.address_2}}{{shipping_address.address_2}}<br />{{/if}}
                              {{shipping_address.postal_code}} {{shipping_address.city}}<br />
                              {{shipping_address.country_name}}
                            </div>
                          </td>
                          <td class="stack-mobile" valign="top" width="50%" style="padding-left: 12px; vertical-align: top;">
                            <div style="font-family:'SFMono-Regular',Menlo,Consolas,monospace; font-size:11px; letter-spacing:0.08em; text-transform:uppercase; color:#ada18e; margin-bottom: 8px;">Zahlung</div>
                            <div style="font-size:14px; line-height:20px; color:#f4eee2;">
                              {{payment_method_label}}
                            </div>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- ============ Support / Footer ============ -->
            <tr>
              <td class="px-32" style="padding: 24px 32px 32px 32px; background-color: #1c1812; border-top: 1px solid #2e2820;">
                <p style="margin: 0 0 8px 0; font-size: 13px; line-height: 19px; color:#ada18e;">
                  Fragen zur Bestellung? Antworte einfach auf diese Mail oder schreib uns an
                  <a href="mailto:support@kiji-games.de" style="color:#d6a14d;">support@kiji-games.de</a>.
                </p>
                <p style="margin: 16px 0 0 0; font-size: 12px; line-height: 18px; color:#7a7263;">
                  Kiji Games · {{company.address_line}} · {{company.city}}<br />
                  <a href="{{site_url}}/impressum" style="color:#7a7263; text-decoration: underline;">Impressum</a>
                  &nbsp;·&nbsp;
                  <a href="{{site_url}}/agb" style="color:#7a7263; text-decoration: underline;">AGB</a>
                  &nbsp;·&nbsp;
                  <a href="{{site_url}}/datenschutz" style="color:#7a7263; text-decoration: underline;">Datenschutz</a>
                </p>
              </td>
            </tr>

          </table>
          <!-- ============ /Container ============ -->

        </td>
      </tr>
    </table>
  </body>
</html>
`
