
/**
 * Shared Email Template for Hobbysky Guest House
 * Dark-mode premium design — consistent across all system emails.
 * Uses INLINE STYLES only for maximum email client compatibility.
 */

interface EmailTemplateOptions {
  title: string
  preheader?: string
  content: string
  callToAction?: {
    text: string
    url: string
    color?: string
  }
}

// ─── Design tokens (inline-style safe) ───────────────────────────────────────
const C = {
  outerBg:   '#141F16',   // page background
  cardBg:    '#0F1A11',   // email container
  headerBg:  '#09110A',   // top header strip
  infoBg:    '#162019',   // detail / info box
  borderGold:'#C9963C',   // gold accent border
  borderSub: '#2B3E2E',   // subtle divider
  gold:      '#C9963C',   // primary gold
  goldLight: '#DEB96A',   // lighter gold for highlights
  text:      '#EDE9E0',   // body text (warm white)
  textMuted: '#8CA48E',   // secondary / muted text
  textDark:  '#0F1A11',   // text on gold button
  green:     '#3DBD7A',   // success green
  amber:     '#E8A020',   // warning amber
}

export const EMAIL_STYLES = {
  // kept for backward-compatibility with call sites that interpolate these
  body:         `margin:0;padding:0;background-color:${C.outerBg};`,
  container:    `max-width:600px;margin:0 auto;background-color:${C.cardBg};`,
  header:       `background-color:${C.headerBg};padding:40px 30px 32px;text-align:center;`,
  logo:         `height:56px;width:auto;max-width:180px;margin-bottom:16px;`,
  headerTitle:  `color:${C.text};font-size:24px;font-weight:700;margin:0;letter-spacing:1.5px;font-family:Georgia,serif;`,
  headerSubtitle:`color:${C.gold};font-size:11px;margin:8px 0 0;font-weight:600;letter-spacing:3px;text-transform:uppercase;font-family:Arial,sans-serif;`,
  content:      `padding:36px 32px;background-color:${C.cardBg};`,
  contentTitle: `color:${C.goldLight};font-size:22px;margin:0 0 28px;text-align:center;font-family:Georgia,serif;font-weight:700;letter-spacing:0.5px;`,
  footer:       `background-color:${C.headerBg};padding:28px 24px;text-align:center;font-size:12px;color:${C.textMuted};border-top:1px solid ${C.borderSub};`,
  button: (color: string) =>
    `display:inline-block;padding:14px 44px;background-color:${C.gold};color:${C.textDark};text-decoration:none;border-radius:4px;font-weight:700;font-size:14px;letter-spacing:1px;text-transform:uppercase;font-family:Arial,sans-serif;`,

  // Content helpers
  infoBox:    `background-color:${C.infoBg};border-left:3px solid ${C.borderGold};padding:20px 22px;margin:20px 0;border-radius:0 6px 6px 0;`,
  infoRow:    `margin-bottom:10px;font-size:15px;color:${C.text};font-family:Arial,sans-serif;`,
  infoLabel:  `font-weight:600;color:${C.textMuted};display:inline-block;min-width:120px;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;`,
  warningBox: `background-color:#1E1A0A;border:1px solid ${C.amber};padding:16px 20px;border-radius:6px;margin:20px 0;`,
  warningTitle:`color:${C.amber};display:block;margin-bottom:6px;font-weight:700;font-size:13px;letter-spacing:0.5px;text-transform:uppercase;`,
  warningText: `color:#D4A83A;font-size:14px;`,
}

// ─── Gold divider helper ──────────────────────────────────────────────────────
const GOLD_DIVIDER = `
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0;">
    <tr>
      <td style="height:2px;background-color:${C.borderGold};font-size:0;line-height:0;">&nbsp;</td>
    </tr>
  </table>`

const SUBTLE_DIVIDER = `
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0;">
    <tr>
      <td style="height:1px;background-color:${C.borderSub};font-size:0;line-height:0;">&nbsp;</td>
    </tr>
  </table>`

// ─── Main template ────────────────────────────────────────────────────────────
export function generateEmailHtml(options: EmailTemplateOptions): string {
  const { title, preheader, content, callToAction } = options
  const year = new Date().getFullYear()

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="dark">
  <meta name="supported-color-schemes" content="dark">
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background-color:${C.outerBg};-webkit-font-smoothing:antialiased;">

  ${preheader ? `<div style="display:none;font-size:1px;color:${C.outerBg};line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${preheader}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>` : ''}

  <!-- Outer wrapper -->
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${C.outerBg};padding:32px 16px;">
    <tr>
      <td align="center">

        <!-- Email card -->
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background-color:${C.cardBg};border-radius:8px;overflow:hidden;border:1px solid ${C.borderSub};">

          <!-- Gold top bar -->
          <tr>
            <td style="height:3px;background-color:${C.borderGold};font-size:0;line-height:0;">&nbsp;</td>
          </tr>

          <!-- Header -->
          <tr>
            <td style="background-color:${C.headerBg};padding:36px 32px 28px;text-align:center;">
              <img src="https://hobbyskyguesthouse.com/logohobbyskydarkmode.png"
                   alt="Hobbysky Guest House"
                   width="120" height="auto"
                   style="display:block;margin:0 auto 16px;height:auto;width:120px;max-width:120px;" />
              <h1 style="margin:0;color:${C.text};font-size:22px;font-weight:700;font-family:Georgia,'Times New Roman',serif;letter-spacing:1px;">Hobbysky Guest House</h1>
              <p style="margin:8px 0 0;color:${C.gold};font-size:10px;font-weight:700;letter-spacing:4px;text-transform:uppercase;font-family:Arial,Helvetica,sans-serif;">Premium Hospitality</p>
            </td>
          </tr>

          ${GOLD_DIVIDER}

          <!-- Title bar -->
          <tr>
            <td style="background-color:${C.infoBg};padding:22px 32px;text-align:center;">
              <h2 style="margin:0;color:${C.goldLight};font-size:20px;font-weight:700;font-family:Georgia,'Times New Roman',serif;letter-spacing:0.5px;">${title}</h2>
            </td>
          </tr>

          ${SUBTLE_DIVIDER.replace('margin:24px 0', 'margin:0')}

          <!-- Body content -->
          <tr>
            <td style="background-color:${C.cardBg};padding:36px 32px;color:${C.text};font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.7;">
              ${content}

              ${callToAction ? `
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:36px 0 8px;">
                <tr>
                  <td align="center">
                    <table cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="background-color:${C.gold};border-radius:4px;">
                          <a href="${callToAction.url}"
                             style="display:inline-block;padding:14px 44px;background-color:${C.gold};color:${C.textDark};text-decoration:none;font-weight:700;font-size:13px;letter-spacing:1.5px;text-transform:uppercase;font-family:Arial,Helvetica,sans-serif;border-radius:4px;">${callToAction.text}</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>` : ''}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:${C.headerBg};border-top:1px solid ${C.borderSub};padding:28px 32px;text-align:center;">
              <p style="margin:0 0 6px;color:${C.textMuted};font-size:12px;font-family:Arial,Helvetica,sans-serif;">
                &copy; ${year} Hobbysky Guest House &middot; DKC Abuakwa, Kumasi, Ghana
              </p>
              <p style="margin:0;color:${C.borderSub};font-size:11px;font-family:Arial,Helvetica,sans-serif;">
                This is an automated notification &mdash; please do not reply to this email.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>`
}
