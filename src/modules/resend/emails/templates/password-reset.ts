// Handlebars source for the "password-reset" email. Kept as a TS module (not a
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
    <title>Passwort zurücksetzen</title>

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
      body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
      table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
      img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; display: block; }
      a { color: #d6a14d; text-decoration: none; }

      @media only screen and (max-width: 620px) {
        .container { width: 100% !important; }
        .px-32 { padding-left: 20px !important; padding-right: 20px !important; }
        .py-40 { padding-top: 24px !important; padding-bottom: 24px !important; }
        .hero-title { font-size: 26px !important; line-height: 32px !important; }
        .reset-link { font-size: 11px !important; }
      }
    </style>
  </head>

  <body style="margin:0; padding:0; background-color:#1c1812; color:#f4eee2; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
    <!-- Preheader -->
    <div style="display:none; visibility:hidden; opacity:0; height:0; width:0; overflow:hidden; mso-hide:all; font-size:1px; line-height:1px; color:#1c1812;">
      Setze dein Passwort über den Link in dieser Mail neu. Der Link ist 15 Minuten gültig.
    </div>

    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#1c1812;">
      <tr>
        <td align="center" style="padding: 32px 16px;">

          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" class="container" style="width:600px; max-width:600px; background-color:#25201a; border-radius:12px; overflow:hidden;">

            <!-- Header -->
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
                      Sicherheit
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Hero -->
            <tr>
              <td class="px-32" style="padding: 40px 32px 8px 32px;" align="center">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center">
                  <tr>
                    <td style="padding: 6px 14px; background-color: rgba(214,161,77,0.14); border-radius: 999px; font-family: 'SFMono-Regular', Menlo, Consolas, monospace; font-size:11px; letter-spacing:0.08em; text-transform:uppercase; color:#d6a14d;">
                      Passwort zurücksetzen
                    </td>
                  </tr>
                </table>

                <h1 class="hero-title" style="margin: 20px 0 8px 0; font-size: 30px; line-height: 36px; font-weight: 600; letter-spacing: -0.02em; color:#f4eee2;">
                  Neues Passwort festlegen.
                </h1>
                <p style="margin: 0 0 4px 0; font-size: 15px; line-height: 22px; color: #ada18e;">
                  Es wurde angefordert, das Passwort für <span style="color:#f4eee2;">{{email}}</span> neu zu setzen.
                </p>
                <p style="margin: 0; font-size: 15px; line-height: 22px; color: #ada18e;">
                  Klicke auf den Button, um ein neues Passwort zu vergeben.
                </p>
              </td>
            </tr>

            <!-- CTA -->
            <tr>
              <td align="center" style="padding: 28px 32px 16px 32px;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td align="center" style="border-radius: 8px; background-color: #d6a14d;">
                      <a href="{{reset_url}}"
                         style="display:inline-block; padding: 14px 32px; font-size: 15px; font-weight: 600; line-height: 20px; color: #1c1812; text-decoration: none; border-radius: 8px;">
                        Passwort zurücksetzen
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Plain text URL fallback -->
            <tr>
              <td class="px-32" style="padding: 0 32px 24px 32px;" align="center">
                <p style="margin: 0 0 6px 0; font-size: 12px; color:#7a7263;">
                  Falls der Button nicht funktioniert, kopiere diesen Link in deinen Browser:
                </p>
                <p class="reset-link" style="margin: 0; font-family:'SFMono-Regular',Menlo,Consolas,monospace; font-size:12px; line-height:18px; color:#ada18e; word-break: break-all;">
                  <a href="{{reset_url}}" style="color:#ada18e; text-decoration: underline;">{{reset_url}}</a>
                </p>
              </td>
            </tr>

            <!-- Security hint -->
            <tr>
              <td class="px-32" style="padding: 8px 32px 32px 32px;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#1c1812; border-radius: 10px;">
                  <tr>
                    <td style="padding: 16px 18px; font-size: 13px; line-height: 19px; color:#ada18e;">
                      Der Link ist <strong style="color:#f4eee2;">15 Minuten</strong> gültig. Aus Sicherheitsgründen läuft er danach ab und du musst die Anfrage neu stellen.
                      <br /><br />
                      Wenn du diese E-Mail nicht angefordert hast, ignoriere sie einfach. Dein bestehendes Passwort bleibt unverändert.
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td class="px-32" style="padding: 24px 32px 32px 32px; background-color: #1c1812; border-top: 1px solid #2e2820;">
                <p style="margin: 0 0 8px 0; font-size: 13px; line-height: 19px; color:#ada18e;">
                  Probleme beim Zurücksetzen? Schreib uns an
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

        </td>
      </tr>
    </table>
  </body>
</html>
`
