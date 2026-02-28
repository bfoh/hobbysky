import { hotelSettingsService } from './hotel-settings'
import { bookingChargesService } from './booking-charges-service'
import { BookingCharge } from '@/types'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import { sendTransactionalEmail } from '@/services/email-service'
import { generateEmailHtml, EMAIL_STYLES } from '@/services/email-template'
import { formatCurrencySync } from '@/lib/utils'

interface InvoiceData {
  invoiceNumber: string
  invoiceDate: string
  dueDate: string
  guest: {
    name: string
    email: string
    phone?: string
    address?: string
  }
  booking: {
    id: string
    roomNumber: string
    roomType: string
    checkIn: string
    checkOut: string
    nights: number
    numGuests: number
  }
  charges: {
    roomRate: number
    nights: number
    subtotal: number
    additionalCharges: BookingCharge[]
    additionalChargesTotal: number
    discount: { type: 'percentage' | 'fixed', value: number, amount: number } | undefined
    discountTotal: number
    // Ghana Tax Breakdown (back-calculated from Grand Total)
    salesTotal: number      // Base amount before taxes
    gfNhil: number          // GF/NHIL (5%)
    taxSubTotal: number     // Sales Total + GF/NHIL
    vat: number             // VAT (15%)
    tourismLevy: number     // Tourism Levy (1%)
    total: number           // Grand total
  }
  hotel: {
    name: string
    address: string
    phone: string
    email: string
    website: string
  }
}

interface BookingWithDetails {
  id: string
  guestId: string
  roomId: string
  checkIn: string
  checkOut: string
  status: string
  totalPrice: number
  numGuests: number
  specialRequests?: string
  actualCheckIn?: string
  actualCheckOut?: string
  createdAt: string
  amountPaid?: number
  paymentStatus?: 'full' | 'part' | 'pending'
  guest?: {
    name: string
    email: string
    phone?: string
    address?: string
  }
  room?: {
    roomNumber: string
    roomType?: string
  }
}

export async function createInvoiceData(booking: BookingWithDetails, roomDetails: any): Promise<InvoiceData> {
  console.log('📊 [InvoiceData] Creating invoice data with real hotel information...')

  try {
    // Get real hotel settings from database
    const hotelSettings = await hotelSettingsService.getHotelSettings()

    // Fetch additional charges for this booking
    const additionalCharges = await bookingChargesService.getChargesForBooking(booking.id)
    const additionalChargesTotal = additionalCharges.reduce((sum, c) => sum + (c.amount || 0), 0)

    const invoiceNumber = `INV-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`
    const invoiceDate = new Date().toISOString()
    const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days from now

    // Validate and parse dates safely
    const checkInDate = new Date(booking.checkIn)
    const checkOutDate = new Date(booking.actualCheckOut || booking.checkOut)

    // Check if dates are valid
    if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
      throw new Error('Invalid date values in booking data')
    }

    // Normalize to midnight UTC for consistent night calculation
    const d1 = new Date(Date.UTC(checkInDate.getFullYear(), checkInDate.getMonth(), checkInDate.getDate()))
    const d2 = new Date(Date.UTC(checkOutDate.getFullYear(), checkOutDate.getMonth(), checkOutDate.getDate()))

    const nights = Math.max(1, Math.ceil((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)))

    // Validate nights calculation
    if (nights < 0) {
      throw new Error('Check-out date cannot be before check-in date')
    }

    // Parse specialRequests for discount data
    let discount: { type: 'percentage' | 'fixed', value: number, amount: number } | undefined
    let discountAmount = 0

    if (booking.specialRequests && booking.specialRequests.includes('<!-- GROUP_DATA:')) {
      try {
        const jsonMatch = booking.specialRequests.match(/<!-- GROUP_DATA:(.*?) -->/)
        if (jsonMatch && jsonMatch[1]) {
          const groupData = JSON.parse(jsonMatch[1])
          if (groupData.discount) {
            discount = groupData.discount
            discountAmount = discount.amount
          }
        }
      } catch (e) {
        console.error('Failed to parse booking metadata for discount:', e)
      }
    }

    // Fallback 1: Check for DISCOUNT_DATA embedded in specialRequests (single booking check-in path)
    if (discountAmount === 0 && booking.specialRequests) {
      const dm = booking.specialRequests.match(/<!-- DISCOUNT_DATA:(.*?) -->/)
      if (dm) {
        try {
          const parsed = JSON.parse(dm[1])
          if (parsed.discountAmount && parsed.discountAmount > 0) {
            discountAmount = Number(parsed.discountAmount)
            discount = { type: 'fixed', value: discountAmount, amount: discountAmount }
          }
        } catch (e) {
          console.error('Failed to parse DISCOUNT_DATA from specialRequests:', e)
        }
      }
    }

    // Fallback 2: Check for direct discountAmount column (if migration has been run)
    if (discountAmount === 0 && (booking as any).discountAmount) {
      discountAmount = Number((booking as any).discountAmount) || 0
      if (discountAmount > 0) {
        discount = {
          type: 'fixed',
          value: discountAmount,
          amount: discountAmount
        }
      }
    }

    // Room price from booking (already tax inclusive)
    const roomTotal = booking.totalPrice

    // Grand total calculation
    // Grand Total = Room Total + Additional Charges - Discount
    const grandTotal = Math.max(0, roomTotal + additionalChargesTotal - discountAmount)

    // Calculate Tax Breakdown
    const taxBreakdown = calculateGhanaTaxBreakdown(grandTotal)

    // Room rate per night (Gross)
    const roomRate = roomTotal / nights

    console.log('✅ [InvoiceData] Invoice data created with charges:', {
      hotelName: hotelSettings.name,
      invoiceNumber,
      nights,
      roomTotal,
      additionalChargesTotal,
      discountAmount,
      grandTotal
    })

    return {
      invoiceNumber,
      invoiceDate,
      dueDate,
      guest: {
        name: booking.guest?.name || 'Guest',
        email: booking.guest?.email || '',
        phone: booking.guest?.phone,
        address: booking.guest?.address
      },
      booking: {
        id: booking.id,
        roomNumber: roomDetails?.roomNumber || 'N/A',
        roomType: roomDetails?.roomType || 'Standard Room',
        checkIn: booking.checkIn,
        checkOut: booking.actualCheckOut || booking.checkOut,
        nights,
        numGuests: booking.numGuests
      },
      charges: {
        roomRate,
        nights,
        subtotal: roomTotal, // Use roomTotal as the base subtotal line item
        additionalCharges,
        additionalChargesTotal,
        discount,
        discountTotal: discountAmount,
        // Ghana Tax Breakdown
        salesTotal: taxBreakdown.salesTotal,
        gfNhil: taxBreakdown.gfNhil,
        taxSubTotal: taxBreakdown.subTotal,
        vat: taxBreakdown.vat,
        tourismLevy: taxBreakdown.tourismLevy,
        total: grandTotal
      },
      hotel: {
        name: hotelSettings.name,
        address: hotelSettings.address,
        phone: hotelSettings.phone,
        email: hotelSettings.email,
        website: hotelSettings.website
      }
    }
  } catch (error: any) {
    console.error('❌ [InvoiceData] Failed to create invoice data:', error)
    throw new Error(`Failed to create invoice data: ${error.message}`)
  }
}

export async function generateInvoiceHTML(invoiceData: InvoiceData): Promise<string> {
  try {
    console.log('📄 [InvoiceHTML] Generating invoice HTML...', {
      invoiceNumber: invoiceData.invoiceNumber,
      guestName: invoiceData.guest.name,
      total: invoiceData.charges.total
    })

    const settings = await hotelSettingsService.getHotelSettings()
    const currency = settings.currency || 'GHS'

    const sharedCss = `*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Inter',system-ui,-apple-system,sans-serif;line-height:1.6;color:#1E293B;background:#fff;font-size:11px}.w{max-width:794px;margin:0 auto;background:#fff;padding:40px}h1{font-size:24px;font-weight:300;color:#1E3D22;margin-bottom:6px;letter-spacing:-0.5px}h3{font-size:9px;font-weight:600;text-transform:uppercase;letter-spacing:1.5px;color:#C9963C;margin-bottom:12px}p{font-size:11px;color:#475569;margin:3px 0}strong{color:#1E3D22;font-weight:600}em{font-style:normal;color:#64748B}.lbl{font-size:10px;font-weight:500;color:#C9963C;letter-spacing:2px;text-transform:uppercase;margin-bottom:6px}.hd{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:28px;border-bottom:1px solid #E2E8F0;margin-bottom:36px;position:relative}.im{text-align:right}.im .dt{font-size:20px;font-weight:300;color:#1E3D22;letter-spacing:1px;text-transform:uppercase;margin-bottom:6px}.im .dn{font-size:12px;font-weight:500;color:#64748B;margin-bottom:14px;letter-spacing:0.5px}.ic p{font-size:11px}.ig{display:grid;grid-template-columns:1fr 1fr;gap:48px;margin-bottom:48px}table.ct{width:100%;border-collapse:collapse;margin-bottom:40px}table.ct th{font-size:9px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:#94A3B8;text-align:left;padding:14px 4px;border-bottom:1px solid #E2E8F0}table.ct td{padding:14px 4px;color:#1E293B;border-bottom:1px solid #F1F5F9}table.ct th.r,table.ct td.r{text-align:right}table.ct th.c,table.ct td.c{text-align:center}.tw{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:48px}.sp{flex:1;padding-right:48px}table.tt{width:300px;border-collapse:collapse}table.tt td{padding:10px 4px;font-size:11px;color:#475569}table.tt tr.sub td{border-top:1px dashed #E2E8F0;font-weight:500;color:#1E3D22;padding-top:14px}table.tt tr.gt td{border-top:2px solid #1E3D22;padding-top:16px;padding-bottom:16px;font-size:15px;font-weight:600;color:#1E3D22}.ft{padding-top:28px;border-top:1px solid #E2E8F0;text-align:center}.ft .ty{font-size:12px;font-weight:500;color:#1E3D22;margin-bottom:10px}.ft .fr{font-size:9px;color:#64748B;display:flex;justify-content:space-between}.sb{text-align:center;padding:10px;font-size:10px;font-weight:600;letter-spacing:2px;text-transform:uppercase;margin-bottom:36px;border:1px solid currentColor;border-radius:2px}.bdg{display:inline-block;margin-top:10px;padding:5px 14px;border:1px solid currentColor;border-radius:2px;font-size:9px;font-weight:600;letter-spacing:1px;text-transform:uppercase}.sh td{font-size:9px;font-weight:600;color:#C9963C;text-transform:uppercase;letter-spacing:1px;padding:12px 4px 6px!important}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}`

    const htmlContent = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Invoice ${invoiceData.invoiceNumber}</title><style>${sharedCss}</style></head>
<body><div class="w">
<div class="ab"></div>
<div class="hd">
  <div class="hi">
    <div class="lbl">Guest House</div>
    <h1>${invoiceData.hotel.name}</h1>
    <p>${invoiceData.hotel.address}</p>
    <p>Tel: ${invoiceData.hotel.phone} &nbsp;|&nbsp; ${invoiceData.hotel.email}</p>
    <p class="tin">TIN: 71786161-3</p>
  </div>
  <div class="im">
    <div class="dt">Invoice</div>
    <div class="dn">${invoiceData.invoiceNumber}</div>
    <p><strong>Date:</strong> ${new Date(invoiceData.invoiceDate).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})}</p>
    <p><strong>Due:</strong> Upon Receipt</p>
    <span class="bdg" style="border:1px solid #86EFAC;color:#15803D">PAID</span>
  </div>
</div>
<div class="ig">
  <div class="ic">
    <h3>Bill To</h3>
    <p class="nm">${invoiceData.guest.name}</p>
    ${invoiceData.guest.email ? `<p>${invoiceData.guest.email}</p>` : ''}
    ${invoiceData.guest.phone ? `<p><em>Tel: </em>${invoiceData.guest.phone}</p>` : ''}
    ${invoiceData.guest.address ? `<p>${invoiceData.guest.address}</p>` : ''}
  </div>
  <div class="ic">
    <h3>Booking Details</h3>
    <p><em>Room: </em><strong>${invoiceData.booking.roomNumber}</strong> <em>(${invoiceData.booking.roomType})</em></p>
    <p><em>Check-in: </em><strong>${new Date(invoiceData.booking.checkIn).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})}</strong></p>
    <p><em>Check-out: </em><strong>${new Date(invoiceData.booking.checkOut).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})}</strong></p>
    <p><em>Duration: </em><strong>${invoiceData.booking.nights} night${invoiceData.booking.nights!==1?'s':''}</strong> <em>&nbsp;·&nbsp; ${invoiceData.booking.numGuests} guest${invoiceData.booking.numGuests!==1?'s':''}</em></p>
    <p><em>Booking ID: </em><strong style="font-family:monospace;font-size:10px">${invoiceData.booking.id.substring(0,20)}…</strong></p>
  </div>
</div>
<div class="bd">
  <table class="ct">
    <thead><tr><th>Description</th><th class="c">Qty</th><th class="r">Rate</th><th class="r">Amount</th></tr></thead>
    <tbody>
      <tr>
        <td>Room ${invoiceData.booking.roomNumber} — ${invoiceData.booking.roomType}</td>
        <td class="c">${invoiceData.charges.nights} night${invoiceData.charges.nights!==1?'s':''}</td>
        <td class="r">${formatCurrencySync(invoiceData.charges.roomRate,currency)}/night</td>
        <td class="r" style="font-weight:700">${formatCurrencySync(invoiceData.charges.roomRate*invoiceData.charges.nights,currency)}</td>
      </tr>
      ${invoiceData.charges.additionalCharges.map(ch=>`<tr><td>${ch.description}</td><td class="c">${ch.quantity}×</td><td class="r">${formatCurrencySync(ch.unitPrice,currency)}</td><td class="r" style="font-weight:600">${formatCurrencySync(ch.amount,currency)}</td></tr>`).join('')}
    </tbody>
  </table>
</div>
<div class="tw">
  <div class="sp"></div>
  <table class="tt">
    ${invoiceData.charges.discountTotal>0?`<tr><td style="color:#DC2626">Discount${invoiceData.charges.discount?.type==='percentage'?` (${invoiceData.charges.discount.value}%)`:''}:</td><td style="text-align:right;color:#DC2626;font-weight:700">−${formatCurrencySync(invoiceData.charges.discountTotal,currency)}</td></tr>`:''}
    <tr class="sh"><td colspan="2">Ghana Tax Breakdown</td></tr>
    <tr><td>Sales Total</td><td style="text-align:right">${formatCurrencySync(invoiceData.charges.salesTotal,currency)}</td></tr>
    <tr><td>GF/NHIL (5%)</td><td style="text-align:right">${formatCurrencySync(invoiceData.charges.gfNhil,currency)}</td></tr>
    <tr class="sub"><td>Sub Total</td><td style="text-align:right">${formatCurrencySync(invoiceData.charges.taxSubTotal,currency)}</td></tr>
    <tr><td>VAT (15%)</td><td style="text-align:right">${formatCurrencySync(invoiceData.charges.vat,currency)}</td></tr>
    <tr><td>Tourism Levy (1%)</td><td style="text-align:right">${formatCurrencySync(invoiceData.charges.tourismLevy,currency)}</td></tr>
    <tr class="gt"><td>Grand Total</td><td style="text-align:right">${formatCurrencySync(invoiceData.charges.total,currency)}</td></tr>
  </table>
</div>
<div class="ft">
  <div class="ty">Thank you for choosing ${invoiceData.hotel.name}!</div>
  <div class="fr">
    <div><p><strong>Payment Methods:</strong> Cash &nbsp;·&nbsp; Mobile Money &nbsp;·&nbsp; Bank Transfer</p></div>
    <div style="text-align:right"><p>${invoiceData.hotel.phone} &nbsp;|&nbsp; ${invoiceData.hotel.email}</p><p>TIN: 71786161-3</p></div>
  </div>
</div>
</div></body></html>`

    console.log('✅ [InvoiceHTML] HTML content generated successfully')
    return htmlContent

  } catch (error: any) {
    console.error('❌ [InvoiceHTML] Failed to generate HTML:', error)
    throw new Error(`Failed to generate invoice HTML: ${error.message}`)
  }
}

export async function generateInvoicePDF(invoiceData: InvoiceData): Promise<Blob> {
  try {
    console.log('📄 [InvoicePDF] Generating PDF...', {
      invoiceNumber: invoiceData.invoiceNumber,
      guestName: invoiceData.guest.name
    })

    // Generate HTML content
    const htmlContent = await generateInvoiceHTML(invoiceData)

    // Create a temporary element to render the HTML
    const element = document.createElement('div')
    element.innerHTML = htmlContent
    element.style.position = 'absolute'
    element.style.left = '-9999px'
    element.style.top = '0'
    document.body.appendChild(element)

    // Convert HTML to canvas
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff'
    })

    // Remove the temporary element
    document.body.removeChild(element)

    // Create PDF
    // Use JPEG with quality 0.95 to reduce file size while maintaining good quality
    // PNG can produce very large files (3-5MB+) which hits Netlify function payload limits (6MB)
    const imgData = canvas.toDataURL('image/jpeg', 0.95)
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    })

    const imgWidth = 210 // A4 width in mm
    const pageHeight = 295 // A4 height in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width
    let heightLeft = imgHeight

    let position = 0

    // Add image to PDF
    pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight)
    heightLeft -= pageHeight

    // Add new pages if needed
    while (heightLeft >= 0) {
      position = heightLeft - imgHeight
      pdf.addPage()
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight)
      heightLeft -= pageHeight
    }

    console.log('✅ [InvoicePDF] PDF generated successfully')
    return pdf.output('blob')

  } catch (error: any) {
    console.error('❌ [InvoicePDF] Failed to generate PDF:', error)
    throw new Error(`Failed to generate invoice PDF: ${error.message}`)
  }
}

export async function sendInvoiceEmail(invoiceData: InvoiceData, pdfBlob: Blob): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('📧 [InvoiceEmail] Sending invoice email...', {
      invoiceNumber: invoiceData.invoiceNumber,
      guestEmail: invoiceData.guest.email,
      total: invoiceData.charges.total
    })

    // Get currency for formatting
    const { hotelSettingsService } = await import('@/services/hotel-settings')
    const { formatCurrencySync } = await import('@/lib/utils')
    const settings = await hotelSettingsService.getHotelSettings()
    const currency = settings.currency || 'GHS'

    // Convert PDF blob to base64 for email attachment
    const pdfBase64 = await blobToBase64(pdfBlob)
    const downloadUrl = `${window.location.origin}/invoice/${invoiceData.invoiceNumber}`

    const htmlContent = generateEmailHtml({
      title: 'Your Invoice is Ready',
      preheader: `Invoice ${invoiceData.invoiceNumber} — ${formatCurrencySync(invoiceData.charges.total, currency)} — ${invoiceData.hotel.name}`,
      content: `
        <p style="margin:0 0 18px;color:#EDE9E0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.7;">
          Dear <strong>${invoiceData.guest.name}</strong>,
        </p>
        <p style="margin:0 0 18px;color:#EDE9E0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.7;">
          Thank you for staying with us. Your invoice for your recent stay is attached to this email as a PDF. A summary is included below for your reference.
        </p>

        <div style="${EMAIL_STYLES.infoBox}">
          <div style="${EMAIL_STYLES.infoRow}">
            <span style="${EMAIL_STYLES.infoLabel}">Invoice No.</span>
            <span style="font-family:monospace;font-size:13px;">${invoiceData.invoiceNumber}</span>
          </div>
          <div style="${EMAIL_STYLES.infoRow}">
            <span style="${EMAIL_STYLES.infoLabel}">Room</span>
            ${invoiceData.booking.roomNumber} &nbsp;<span style="color:#8CA48E">(${invoiceData.booking.roomType})</span>
          </div>
          <div style="${EMAIL_STYLES.infoRow}">
            <span style="${EMAIL_STYLES.infoLabel}">Check-in</span>
            ${new Date(invoiceData.booking.checkIn).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})}
          </div>
          <div style="${EMAIL_STYLES.infoRow}">
            <span style="${EMAIL_STYLES.infoLabel}">Check-out</span>
            ${new Date(invoiceData.booking.checkOut).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})}
          </div>
          <div style="${EMAIL_STYLES.infoRow}">
            <span style="${EMAIL_STYLES.infoLabel}">Duration</span>
            ${invoiceData.booking.nights} night${invoiceData.booking.nights !== 1 ? 's' : ''}
          </div>
          <div style="margin-top:14px;padding-top:12px;border-top:1px solid #2B3E2E;font-size:15px;color:#EDE9E0;font-family:Arial,Helvetica,sans-serif;">
            <span style="${EMAIL_STYLES.infoLabel}">Total Amount</span>
            <strong style="color:#C9963C;font-size:18px;">${formatCurrencySync(invoiceData.charges.total, currency)}</strong>
          </div>
        </div>

        <p style="margin:20px 0 8px;color:#EDE9E0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.7;">
          Your full invoice is attached as a PDF. You can also view and download it at any time using the button below.
        </p>
        <p style="margin:0 0 18px;color:#8CA48E;font-family:Arial,Helvetica,sans-serif;font-size:13px;">
          If you have any questions about this invoice, please contact us at ${invoiceData.hotel.phone} or ${invoiceData.hotel.email}.
        </p>
      `,
      callToAction: {
        text: 'View Invoice',
        url: downloadUrl
      }
    })

    const textContent = `
INVOICE READY - ${invoiceData.hotel.name} Hotel Management System

Dear ${invoiceData.guest.name},

Thank you for staying with ${invoiceData.hotel.name}! Your invoice for your recent stay is ready.

INVOICE SUMMARY:
Invoice Number: ${invoiceData.invoiceNumber}
Room: ${invoiceData.booking.roomNumber} (${invoiceData.booking.roomType})
Check-in: ${new Date(invoiceData.booking.checkIn).toLocaleDateString()}
Check-out: ${new Date(invoiceData.booking.checkOut).toLocaleDateString()}
Nights: ${invoiceData.booking.nights}
Total Amount: ${formatCurrencySync(invoiceData.charges.total, currency)}

DOWNLOAD YOUR INVOICE:
Your detailed invoice is available for download at:
${downloadUrl}

You can also print this invoice for your records.

If you have any questions about this invoice or need assistance, please don't hesitate to contact us.

We hope you enjoyed your stay and look forward to welcoming you back to ${invoiceData.hotel.name} soon!

---
${invoiceData.hotel.name} Hotel Management System
Phone: ${invoiceData.hotel.phone} | Email: ${invoiceData.hotel.email}
Website: ${invoiceData.hotel.website}
    `

    const result = await sendTransactionalEmail({
      to: invoiceData.guest.email,
      subject: `Your Invoice - ${invoiceData.invoiceNumber} | ${invoiceData.hotel.name}`,
      html: htmlContent,
      text: textContent,
      attachments: [
        {
          filename: `invoice-${invoiceData.invoiceNumber}.pdf`,
          content: pdfBase64,
          contentType: 'application/pdf'
        }
      ]
    })

    if (result.success) {
      console.log('✅ [InvoiceEmail] Email sent successfully')
      return { success: true }
    }

    console.error('❌ [InvoiceEmail] Email send reported failure:', result.error)
    return { success: false, error: result.error }
  } catch (error: any) {
    console.error('❌ [InvoiceEmail] Failed to send email:', error)
    return { success: false, error: error.message }
  }
}

// Helper function to convert blob to base64
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

// Staff functions for downloading/printing invoices
export async function downloadInvoicePDF(invoiceData: InvoiceData): Promise<void> {
  try {
    console.log('📥 [StaffDownload] Generating PDF for download...', {
      invoiceNumber: invoiceData.invoiceNumber,
      guestName: invoiceData.guest.name
    })

    const pdfBlob = await generateInvoicePDF(invoiceData)

    // Create download link
    const url = URL.createObjectURL(pdfBlob)
    const a = document.createElement('a')
    a.href = url
    a.download = `invoice-${invoiceData.invoiceNumber}.pdf`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    console.log('✅ [StaffDownload] PDF downloaded successfully')
  } catch (error: any) {
    console.error('❌ [StaffDownload] Failed to download PDF:', error)
    // Don't throw error if download actually worked
    if (error.message && error.message.includes('download')) {
      console.log('📥 [StaffDownload] Download may have succeeded despite error')
      return
    }
    throw new Error(`Failed to download invoice PDF: ${error.message}`)
  }
}

export async function printInvoice(invoiceData: InvoiceData): Promise<void> {
  try {
    console.log('🖨️ [StaffPrint] Generating invoice for printing...', {
      invoiceNumber: invoiceData.invoiceNumber,
      guestName: invoiceData.guest.name
    })

    const htmlContent = await generateInvoiceHTML(invoiceData)

    // Open print window
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(htmlContent)
      printWindow.document.close()
      printWindow.print()
    } else {
      throw new Error('Could not open print window. Please allow pop-ups.')
    }

    console.log('✅ [StaffPrint] Invoice printed successfully')
  } catch (error: any) {
    console.error('❌ [StaffPrint] Failed to print invoice:', error)
    throw new Error(`Failed to print invoice: ${error.message}`)
  }
}

/**
 * Print a pre-invoice using the same template as the downloaded pre-invoice PDF
 */
export async function printPreInvoice(preInvoiceData: PreInvoiceData): Promise<void> {
  try {
    console.log('🖨️ [StaffPrint] Generating pre-invoice for printing...', {
      invoiceNumber: preInvoiceData.invoiceNumber,
      guestName: preInvoiceData.guest.name,
      paymentStatus: preInvoiceData.paymentStatus
    })

    const htmlContent = await generatePreInvoiceHTML(preInvoiceData)

    // Open print window
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(htmlContent)
      printWindow.document.close()
      // Small delay so styles render before printing
      setTimeout(() => printWindow.print(), 300)
    } else {
      throw new Error('Could not open print window. Please allow pop-ups.')
    }

    console.log('✅ [StaffPrint] Pre-invoice printed successfully')
  } catch (error: any) {
    console.error('❌ [StaffPrint] Failed to print pre-invoice:', error)
    throw new Error(`Failed to print pre-invoice: ${error.message}`)
  }
}

// ===================== PRE-INVOICE FUNCTIONS =====================

export interface PreInvoiceData extends InvoiceData {
  status: 'pending' | 'paid' | 'partial'
  isPreInvoice: boolean
  amountPaid?: number
  paymentStatus?: 'full' | 'part' | 'pending'
}

/**
 * Create pre-invoice data for a confirmed booking (not yet paid)
 */
export async function createPreInvoiceData(booking: BookingWithDetails, roomDetails: any): Promise<PreInvoiceData> {
  console.log('📋 [PreInvoice] Creating pre-invoice data for booking:', booking.id)

  // Use the existing createInvoiceData function as base
  const invoiceData = await createInvoiceData(booking, roomDetails)

  // Extract payment tracking data from booking or specialRequests
  let amountPaid = booking.amountPaid || 0
  let paymentStatus: 'full' | 'part' | 'pending' = booking.paymentStatus || 'pending'
  if (!amountPaid && booking.specialRequests) {
    const pm = booking.specialRequests.match(/<!-- PAYMENT_DATA:(.*?) -->/)
    if (pm) {
      try {
        const pd = JSON.parse(pm[1])
        amountPaid = pd.amountPaid || 0
        paymentStatus = pd.paymentStatus || 'pending'
      } catch { /* ignore */ }
    }
  }

  // Determine status
  const status = paymentStatus === 'full' ? 'paid' as const
    : paymentStatus === 'part' ? 'partial' as const
      : 'pending' as const

  // Add pre-invoice specific fields
  return {
    ...invoiceData,
    invoiceNumber: `PRE-${invoiceData.invoiceNumber}`,
    status,
    isPreInvoice: true,
    amountPaid,
    paymentStatus
  }
}

/**
 * Generate HTML for a pre-invoice (with PRE-INVOICE header and UNPAID status)
 */
export async function generatePreInvoiceHTML(preInvoiceData: PreInvoiceData): Promise<string> {
  try {
    console.log('📄 [PreInvoiceHTML] Generating pre-invoice HTML...', {
      invoiceNumber: preInvoiceData.invoiceNumber,
      guestName: preInvoiceData.guest.name
    })

    const settings = await hotelSettingsService.getHotelSettings()
    const currency = settings.currency || 'GHS'

    const ps = preInvoiceData.paymentStatus
    const isPaid = ps === 'full'
    const isPart = ps === 'part'
    const remaining = Math.max(0, preInvoiceData.charges.total - (preInvoiceData.amountPaid || 0))

    // Status strip (print-friendly — thin coloured text bar, not a full gradient band)
    const stripColor = isPaid ? '#15803D' : isPart ? '#B45309' : '#C9963C'
    const stripText = isPaid ? 'PRE-INVOICE — FULLY PAID'
      : isPart ? 'PRE-INVOICE — PART PAYMENT RECEIVED — BALANCE DUE AT CHECK-IN'
      : 'PRE-INVOICE — PAYMENT DUE AT CHECK-IN'
    const badgeBorder = isPaid ? '#86EFAC' : isPart ? '#FCD34D' : '#C9963C'
    const badgeColor = isPaid ? '#15803D' : isPart ? '#92400E' : '#92400E'
    const badgeText = isPaid ? 'PAID' : isPart ? 'PART PAID' : 'UNPAID'

    // Payment card — white background + coloured left border (print-friendly)
    let paymentCard = ''
    if (isPaid) {
      paymentCard = `<div style="border:1px solid #E2E8F0;border-left:2px solid #15803D;padding:24px;border-radius:2px;margin-bottom:24px;">
        <p style="font-size:9px;font-weight:600;color:#15803D;text-transform:uppercase;letter-spacing:1px;margin-bottom:16px;border-bottom:1px solid #F1F5F9;padding-bottom:12px">Payment Status</p>
        <p style="color:#1E3D22;font-size:12px;font-weight:700">Payment received in full</p>
        <p style="color:#5A7060;font-size:11px;margin-top:3px">${formatCurrencySync(preInvoiceData.charges.total, currency)}</p>
        <p style="color:#15803D;font-size:9px;margin-top:5px">No balance outstanding.</p>
      </div>`
    } else if (isPart) {
      paymentCard = `<div style="border:1px solid #E2E8F0;border-left:2px solid #B45309;padding:24px;border-radius:2px;margin-bottom:24px;">
        <p style="font-size:9px;font-weight:600;color:#B45309;text-transform:uppercase;letter-spacing:1px;margin-bottom:16px;border-bottom:1px solid #F1F5F9;padding-bottom:12px">Payment Summary</p>
        <table style="width:100%;border-collapse:collapse;font-size:11px">
          <tr><td style="color:#5A7060;padding:3px 0">Total Amount:</td><td style="text-align:right;font-weight:600;color:#1A2B1B">${formatCurrencySync(preInvoiceData.charges.total, currency)}</td></tr>
          <tr><td style="color:#15803D;padding:3px 0;border-top:1px dashed #D8E4D9">Amount Paid:</td><td style="text-align:right;font-weight:700;color:#15803D;border-top:1px dashed #D8E4D9">${formatCurrencySync(preInvoiceData.amountPaid || 0, currency)}</td></tr>
          <tr style="border-top:2px solid #D8E4D9"><td style="color:#B45309;font-weight:700;padding:5px 0 2px">Balance Due:</td><td style="text-align:right;font-weight:800;color:#DC2626;font-size:14px;padding:5px 0 2px">${formatCurrencySync(remaining, currency)}</td></tr>
        </table>
        <p style="color:#5A7060;font-size:9px;margin-top:6px">Balance due at check-in &nbsp;·&nbsp; Cash &nbsp;·&nbsp; Mobile Money &nbsp;·&nbsp; Bank Transfer</p>
      </div>`
    } else {
      paymentCard = `<div style="border:1px solid #E2E8F0;border-left:2px solid #C9963C;padding:24px;border-radius:2px;margin-bottom:24px;">
        <p style="font-size:9px;font-weight:600;color:#C9963C;text-transform:uppercase;letter-spacing:1px;margin-bottom:16px;border-bottom:1px solid #F1F5F9;padding-bottom:12px">Payment Due</p>
        <table style="width:100%;border-collapse:collapse;font-size:11px">
          <tr><td style="color:#5A7060;padding:3px 0">Total Amount:</td><td style="text-align:right;font-weight:600;color:#1A2B1B">${formatCurrencySync(preInvoiceData.charges.total, currency)}</td></tr>
          <tr style="border-top:2px solid #D8E4D9"><td style="color:#C9963C;font-weight:700;padding:5px 0 2px">Due at Check-in:</td><td style="text-align:right;font-weight:800;color:#1E3D22;font-size:14px;padding:5px 0 2px">${formatCurrencySync(preInvoiceData.charges.total, currency)}</td></tr>
        </table>
        <p style="color:#5A7060;font-size:9px;margin-top:6px">We accept: Cash &nbsp;·&nbsp; Mobile Money &nbsp;·&nbsp; Bank Transfer</p>
      </div>`
    }

    const sharedCss = `*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Inter',system-ui,-apple-system,sans-serif;line-height:1.6;color:#1E293B;background:#fff;font-size:11px}.w{max-width:794px;margin:0 auto;background:#fff;padding:40px}h1{font-size:24px;font-weight:300;color:#1E3D22;margin-bottom:6px;letter-spacing:-0.5px}h3{font-size:9px;font-weight:600;text-transform:uppercase;letter-spacing:1.5px;color:#C9963C;margin-bottom:12px}p{font-size:11px;color:#475569;margin:3px 0}strong{color:#1E3D22;font-weight:600}em{font-style:normal;color:#64748B}.lbl{font-size:10px;font-weight:500;color:#C9963C;letter-spacing:2px;text-transform:uppercase;margin-bottom:6px}.hd{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:28px;border-bottom:1px solid #E2E8F0;margin-bottom:36px;position:relative}.im{text-align:right}.im .dt{font-size:20px;font-weight:300;color:#1E3D22;letter-spacing:1px;text-transform:uppercase;margin-bottom:6px}.im .dn{font-size:12px;font-weight:500;color:#64748B;margin-bottom:14px;letter-spacing:0.5px}.ic p{font-size:11px}.ig{display:grid;grid-template-columns:1fr 1fr;gap:48px;margin-bottom:48px}table.ct{width:100%;border-collapse:collapse;margin-bottom:40px}table.ct th{font-size:9px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:#94A3B8;text-align:left;padding:14px 4px;border-bottom:1px solid #E2E8F0}table.ct td{padding:14px 4px;color:#1E293B;border-bottom:1px solid #F1F5F9}table.ct th.r,table.ct td.r{text-align:right}table.ct th.c,table.ct td.c{text-align:center}.tw{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:48px}.sp{flex:1;padding-right:48px}table.tt{width:300px;border-collapse:collapse}table.tt td{padding:10px 4px;font-size:11px;color:#475569}table.tt tr.sub td{border-top:1px dashed #E2E8F0;font-weight:500;color:#1E3D22;padding-top:14px}table.tt tr.gt td{border-top:2px solid #1E3D22;padding-top:16px;padding-bottom:16px;font-size:15px;font-weight:600;color:#1E3D22}.ft{padding-top:28px;border-top:1px solid #E2E8F0;text-align:center}.ft .ty{font-size:12px;font-weight:500;color:#1E3D22;margin-bottom:10px}.ft .fr{font-size:9px;color:#64748B;display:flex;justify-content:space-between}.sb{text-align:center;padding:10px;font-size:10px;font-weight:600;letter-spacing:2px;text-transform:uppercase;margin-bottom:36px;border:1px solid currentColor;border-radius:2px}.bdg{display:inline-block;margin-top:10px;padding:5px 14px;border:1px solid currentColor;border-radius:2px;font-size:9px;font-weight:600;letter-spacing:1px;text-transform:uppercase}.sh td{font-size:9px;font-weight:600;color:#C9963C;text-transform:uppercase;letter-spacing:1px;padding:12px 4px 6px!important}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}`

    const htmlContent = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Pre-Invoice ${preInvoiceData.invoiceNumber}</title><style>${sharedCss}</style></head>
<body><div class="w">
<div class="ab"></div>
<div class="sb" style="color:${stripColor}">${stripText}</div>
<div class="hd">
  <div class="hi">
    <div class="lbl">Guest House</div>
    <h1>${preInvoiceData.hotel.name}</h1>
    <p>${preInvoiceData.hotel.address}</p>
    <p>Tel: ${preInvoiceData.hotel.phone} &nbsp;|&nbsp; ${preInvoiceData.hotel.email}</p>
    <p class="tin">TIN: 71786161-3</p>
  </div>
  <div class="im">
    <div class="dt">Pre-Invoice</div>
    <div class="dn">${preInvoiceData.invoiceNumber}</div>
    <p><strong>Date:</strong> ${new Date(preInvoiceData.invoiceDate).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})}</p>
    <p><strong>Due:</strong> At Check-in</p>
    <span class="bdg" style="border:1px solid ${badgeBorder};color:${badgeColor}">${badgeText}</span>
  </div>
</div>
<div class="ig">
  <div class="ic">
    <h3>Bill To</h3>
    <p class="nm">${preInvoiceData.guest.name}</p>
    ${preInvoiceData.guest.email ? `<p>${preInvoiceData.guest.email}</p>` : ''}
    ${preInvoiceData.guest.phone ? `<p><em>Tel: </em>${preInvoiceData.guest.phone}</p>` : ''}
    ${preInvoiceData.guest.address ? `<p>${preInvoiceData.guest.address}</p>` : ''}
  </div>
  <div class="ic">
    <h3>Booking Details</h3>
    <p><em>Room: </em><strong>${preInvoiceData.booking.roomNumber}</strong> <em>(${preInvoiceData.booking.roomType})</em></p>
    <p><em>Check-in: </em><strong>${new Date(preInvoiceData.booking.checkIn).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})}</strong></p>
    <p><em>Check-out: </em><strong>${new Date(preInvoiceData.booking.checkOut).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})}</strong></p>
    <p><em>Duration: </em><strong>${preInvoiceData.booking.nights} night${preInvoiceData.booking.nights!==1?'s':''}</strong> <em>&nbsp;·&nbsp; ${preInvoiceData.booking.numGuests} guest${preInvoiceData.booking.numGuests!==1?'s':''}</em></p>
    <p><em>Booking ID: </em><strong style="font-family:monospace;font-size:10px">${preInvoiceData.booking.id.substring(0,20)}…</strong></p>
  </div>
</div>
<div class="bd">
  <table class="ct">
    <thead><tr><th>Description</th><th class="c">Qty</th><th class="r">Rate</th><th class="r">Amount</th></tr></thead>
    <tbody>
      <tr>
        <td>Room ${preInvoiceData.booking.roomNumber} — ${preInvoiceData.booking.roomType}</td>
        <td class="c">${preInvoiceData.charges.nights} night${preInvoiceData.charges.nights!==1?'s':''}</td>
        <td class="r">${formatCurrencySync(preInvoiceData.charges.roomRate,currency)}/night</td>
        <td class="r" style="font-weight:700">${formatCurrencySync(preInvoiceData.charges.subtotal,currency)}</td>
      </tr>
      ${preInvoiceData.charges.additionalCharges.map(ch=>`<tr><td>${ch.description}</td><td class="c">${ch.quantity}×</td><td class="r">${formatCurrencySync(ch.unitPrice,currency)}</td><td class="r" style="font-weight:600">${formatCurrencySync(ch.amount,currency)}</td></tr>`).join('')}
    </tbody>
  </table>
</div>
<div class="tw">
  <div style="flex:1">${paymentCard}</div>
  <table class="tt">
    ${preInvoiceData.charges.discountTotal>0?`<tr><td style="color:#DC2626">Discount${preInvoiceData.charges.discount?.type==='percentage'?` (${preInvoiceData.charges.discount.value}%)`:''}:</td><td style="text-align:right;color:#DC2626;font-weight:700">−${formatCurrencySync(preInvoiceData.charges.discountTotal,currency)}</td></tr>`:''}
    <tr class="sh"><td colspan="2">Ghana Tax Breakdown</td></tr>
    <tr><td>Sales Total</td><td style="text-align:right">${formatCurrencySync(preInvoiceData.charges.salesTotal,currency)}</td></tr>
    <tr><td>GF/NHIL (5%)</td><td style="text-align:right">${formatCurrencySync(preInvoiceData.charges.gfNhil,currency)}</td></tr>
    <tr class="sub"><td>Sub Total</td><td style="text-align:right">${formatCurrencySync(preInvoiceData.charges.taxSubTotal,currency)}</td></tr>
    <tr><td>VAT (15%)</td><td style="text-align:right">${formatCurrencySync(preInvoiceData.charges.vat,currency)}</td></tr>
    <tr><td>Tourism Levy (1%)</td><td style="text-align:right">${formatCurrencySync(preInvoiceData.charges.tourismLevy,currency)}</td></tr>
    <tr class="gt"><td>Grand Total</td><td style="text-align:right">${formatCurrencySync(preInvoiceData.charges.total,currency)}</td></tr>
  </table>
</div>
<div class="ft">
  <div class="ty">Thank you for choosing ${preInvoiceData.hotel.name}!</div>
  <div class="fr">
    <div><p><strong>Payment Methods:</strong> Cash &nbsp;·&nbsp; Mobile Money &nbsp;·&nbsp; Bank Transfer</p></div>
    <div style="text-align:right"><p>${preInvoiceData.hotel.phone} &nbsp;|&nbsp; ${preInvoiceData.hotel.email}</p><p>TIN: 71786161-3</p></div>
  </div>
</div>
</div></body></html>`

    console.log('✅ [PreInvoiceHTML] Pre-invoice HTML generated successfully')
    return htmlContent
  } catch (error: any) {
    console.error('❌ [PreInvoiceHTML] Failed to generate pre-invoice HTML:', error)
    throw new Error(`Failed to generate pre-invoice HTML: ${error.message}`)
  }
}

/**
 * Generate and download pre-invoice PDF
 */
export async function downloadPreInvoicePDF(preInvoiceData: PreInvoiceData): Promise<void> {
  try {
    console.log('📥 [PreInvoicePDF] Generating pre-invoice PDF for download...', {
      invoiceNumber: preInvoiceData.invoiceNumber,
      guestName: preInvoiceData.guest.name
    })

    const htmlContent = await generatePreInvoiceHTML(preInvoiceData)

    // Create a temporary element to render the HTML
    const element = document.createElement('div')
    element.innerHTML = htmlContent
    element.style.position = 'absolute'
    element.style.left = '-9999px'
    element.style.top = '0'
    document.body.appendChild(element)

    // Convert HTML to canvas
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff'
    })

    // Remove the temporary element
    document.body.removeChild(element)

    // Create PDF
    const imgData = canvas.toDataURL('image/jpeg', 0.95)
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    })

    const imgWidth = 210
    const pageHeight = 295
    const imgHeight = (canvas.height * imgWidth) / canvas.width
    let heightLeft = imgHeight

    let position = 0
    pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight)
    heightLeft -= pageHeight

    while (heightLeft >= 0) {
      position = heightLeft - imgHeight
      pdf.addPage()
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight)
      heightLeft -= pageHeight
    }

    // Download the PDF
    pdf.save(`pre - invoice - ${preInvoiceData.invoiceNumber}.pdf`)

    console.log('✅ [PreInvoicePDF] Pre-invoice PDF downloaded successfully')
  } catch (error: any) {
    console.error('❌ [PreInvoicePDF] Failed to download pre-invoice PDF:', error)
    throw new Error(`Failed to download pre - invoice PDF: ${error.message} `)
  }
}

// ===================== GHANA TAX CALCULATION =====================
// Tax structure: GF/NHIL (5%), VAT (15%), Tourism Levy (1%)
// Grand Total remains unchanged - we back-calculate components for display

interface GhanaTaxBreakdown {
  salesTotal: number      // Base amount before all taxes
  gfNhil: number          // Get Fund / National Health Insurance Levy (5%)
  subTotal: number        // Sales Total + GF/NHIL
  vat: number             // Value Added Tax (15% of Sub Total)
  tourismLevy: number     // Tourism Development Levy (1% of Sales Total)
  grandTotal: number      // Final total (unchanged input)
}

/**
 * Back-calculate Ghana tax components from a Grand Total.
 * The Grand Total is what the customer pays and never changes.
 * Formula: Grand Total = Sales Total × (1 + 0.05) × (1 + 0.15) + Sales Total × 0.01
 *        = Sales Total × (1.05 × 1.15 + 0.01)
 *        = Sales Total × 1.2175
 */
function calculateGhanaTaxBreakdown(grandTotal: number): GhanaTaxBreakdown {
  // Combined tax multiplier: (1 + GF/NHIL) × (1 + VAT) + Tourism
  // = 1.05 × 1.15 + 0.01 = 1.2075 + 0.01 = 1.2175
  const taxMultiplier = 1.2175

  const salesTotal = grandTotal / taxMultiplier
  const gfNhil = salesTotal * 0.05
  const subTotal = salesTotal + gfNhil
  const vat = subTotal * 0.15
  const tourismLevy = salesTotal * 0.01

  return {
    salesTotal: Math.round(salesTotal * 100) / 100,
    gfNhil: Math.round(gfNhil * 100) / 100,
    subTotal: Math.round(subTotal * 100) / 100,
    vat: Math.round(vat * 100) / 100,
    tourismLevy: Math.round(tourismLevy * 100) / 100,
    grandTotal: grandTotal
  }
}

// ===================== GROUP INVOICE FUNCTIONS =====================

export interface GroupInvoiceData {
  invoiceNumber: string
  invoiceDate: string
  dueDate: string
  groupReference: string
  billingContact: {
    name: string
    email: string
    phone?: string
    address?: string
  }
  bookings: Array<{
    id: string
    guestName: string
    roomNumber: string
    roomType: string
    checkIn: string
    checkOut: string
    nights: number
    roomRate: number
    subtotal: number // This is total with tax for this line item
    additionalCharges: BookingCharge[]
    additionalChargesTotal: number
  }>
  summary: {
    totalRooms: number
    totalNights: number
    roomSubtotal: number // Room charges + per-room services (before group charges/discounts)
    additionalCharges?: { description: string, amount: number }[] // Charge details
    additionalChargesTotal: number
    discount: { type: 'percentage' | 'fixed', value: number, amount: number } | undefined
    discountTotal: number
    // Ghana Tax Breakdown (back-calculated from Grand Total)
    salesTotal: number      // Base amount before taxes
    gfNhil: number          // GF/NHIL (5%)
    taxSubTotal: number     // Sales Total + GF/NHIL
    vat: number             // VAT (15%)
    tourismLevy: number     // Tourism Levy (1%)
    total: number           // Grand total (unchanged)
  }
  hotel: {
    name: string
    address: string
    phone: string
    email: string
    website: string
  }
}

export async function createGroupInvoiceData(bookings: BookingWithDetails[], billingContact: any): Promise<GroupInvoiceData> {
  console.log('📊 [GroupInvoiceData] Creating group invoice data with real hotel information...')

  try {
    const hotelSettings = await hotelSettingsService.getHotelSettings()

    // Create new group invoice number if not exists, or reuse logic?
    // For now, generate a fresh one representing this aggregated view
    const invoiceNumber = `GRP - ${Date.now()} -${Math.random().toString(36).substring(2, 6).toUpperCase()} `
    const invoiceDate = new Date().toISOString()
    const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

    // Group reference from first booking
    let groupReference = 'N/A'
    if (bookings.length > 0 && (bookings[0] as any).groupReference) {
      groupReference = (bookings[0] as any).groupReference
    }

    // Extract group-level billing metadata (Charges & Discounts)
    // This is stored on the FIRST booking (primary booking)
    // Note: We check both isPrimaryBooking (from our metadata) and fall back to first booking
    const primaryBooking = bookings.find(b => {
      // Check both camelCase (from our code) and snake_case (from DB)
      const specialReqField = (b as any).specialRequests || (b as any).special_requests
      if (!specialReqField) return false
      const match = specialReqField.match(/<!-- GROUP_DATA:(.*?) -->/)
      if (!match) return false
      try {
        const data = JSON.parse(match[1])
        return data.isPrimaryBooking === true
      } catch { return false }
    }) || bookings[0]

    let groupAdditionalCharges: { description: string, amount: number }[] = []
    let groupDiscount: { type: 'percentage' | 'fixed', value: number, amount: number } | undefined = undefined

    // Access special requests with fallback for snake_case (from Supabase)
    const specialReqContent = (primaryBooking as any).specialRequests || (primaryBooking as any).special_requests
    console.log('[GroupInvoice] Primary booking special requests length:', specialReqContent?.length || 0)

    if (primaryBooking && specialReqContent) {
      const match = specialReqContent.match(/<!-- GROUP_DATA:(.*?) -->/)
      if (match && match[1]) {
        try {
          const groupData = JSON.parse(match[1])
          console.log('[GroupInvoice] Parsed group data:', JSON.stringify(groupData))
          if (groupData.additionalCharges) groupAdditionalCharges = groupData.additionalCharges
          if (groupData.discount) groupDiscount = groupData.discount
        } catch (e) {
          console.warn('Failed to parse group data for invoice', e)
        }
      }
    }

    const groupChargesTotal = groupAdditionalCharges.reduce((sum, c) => sum + (c.amount || 0), 0)
    const discountAmount = groupDiscount?.amount || 0

    const processedBookings = await Promise.all(bookings.map(async (booking) => {
      // Get ADDITIONAL SERVICES (e.g. food, spa) per booking - distinct from "Booking Charges" added at reception?
      // NOTE: "bookingChargesService" returns charges linked to the booking (e.g. minibar)
      // The "Additional Charges" from reception (Breakfast x2) are stored in METADATA, not DB charges table yet?
      // Wait, standard logic uses `bookingChargesService`.
      // The reception logic ADDED them to `additionalCharges` in the booking helper, but did it save them?
      // In `createBooking`, we mapped `additionalCharges` to `specialRequests` metadata if it didn't exist in schema.
      // SO: We should NOT double count.
      // If we are looking at the Primary Booking, we don't want to double add charges if they were saved as "booking charges" vs "metadata".
      // Current implementation saves them ONLY in metadata (specialRequests).
      // So `bookingChargesService.getChargesForBooking` might return 0 if they weren't saved to `charges` table.

      const dbCharges = await bookingChargesService.getChargesForBooking(booking.id)
      const dbChargesTotal = dbCharges.reduce((sum, c) => sum + (c.amount || 0), 0)

      const checkIn = new Date(booking.checkIn)
      const checkOut = new Date(booking.actualCheckOut || booking.checkOut)
      const d1 = new Date(Date.UTC(checkIn.getFullYear(), checkIn.getMonth(), checkIn.getDate()))
      const d2 = new Date(Date.UTC(checkOut.getFullYear(), checkOut.getMonth(), checkOut.getDate()))
      const nights = Math.max(1, Math.ceil((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)))

      const taxRate = 0.17
      const roomTotal = booking.totalPrice // This is typically room rate * nights

      // Per-room calculations
      // We only include DB charges here. Group charges are added at the invoice level.
      const roomSubtotal = roomTotal - (roomTotal * taxRate)
      const roomRate = roomSubtotal / nights

      // Line total (Room + DB Charges)
      const lineTotal = roomTotal + dbChargesTotal

      return {
        id: booking.id,
        guestName: booking.guest?.name || 'Guest',
        roomNumber: booking.room?.roomNumber || 'N/A',
        roomType: booking.room?.roomType || 'Standard Room',
        checkIn: booking.checkIn,
        checkOut: booking.actualCheckOut || booking.checkOut,
        nights,
        roomRate,
        subtotal: lineTotal,
        additionalCharges: dbCharges,
        additionalChargesTotal: dbChargesTotal,
        _roomTotal: roomTotal
      }
    }))

    // Calculate Summary
    // Room prices from booking are the GROSS prices (what customer pays, already includes any tax)
    // The calculation should be: Room Total (incl. per-room services) + Group Charges - Discount = Grand Total

    // 1. Sum of all room LINE TOTALS (room price + per-room services like Breakfast, Jollof rice)
    // This uses 'subtotal' (which is lineTotal = roomTotal + dbChargesTotal)
    const totalRoomsCost = processedBookings.reduce((sum, b) => sum + b.subtotal, 0)

    // 2. Calculate Grand Total: Room Line Totals + Group Level Charges - Discount
    const grandTotal = Math.max(0, totalRoomsCost + groupChargesTotal - discountAmount)

    // 3. Calculate Ghana Tax Breakdown
    // The Grand Total is what customer pays - we back-calculate tax components for display
    const taxBreakdown = calculateGhanaTaxBreakdown(grandTotal)

    return {
      invoiceNumber,
      invoiceDate,
      dueDate,
      groupReference,
      billingContact: {
        name: billingContact?.fullName || billingContact?.name || 'Group Contact',
        email: billingContact?.email || '',
        phone: billingContact?.phone,
        address: billingContact?.address
      },
      bookings: processedBookings,
      summary: {
        totalRooms: bookings.length,
        totalNights: processedBookings.reduce((acc, b) => acc + b.nights, 0),
        roomSubtotal: totalRoomsCost, // Room total including per-room services
        additionalCharges: groupAdditionalCharges, // Array with descriptions
        additionalChargesTotal: groupChargesTotal,
        discount: groupDiscount,
        discountTotal: discountAmount,
        // Ghana Tax Breakdown
        salesTotal: taxBreakdown.salesTotal,
        gfNhil: taxBreakdown.gfNhil,
        taxSubTotal: taxBreakdown.subTotal,
        vat: taxBreakdown.vat,
        tourismLevy: taxBreakdown.tourismLevy,
        total: grandTotal
      },
      hotel: {
        name: hotelSettings.name,
        address: hotelSettings.address,
        phone: hotelSettings.phone,
        email: hotelSettings.email,
        website: hotelSettings.website
      }
    }

  } catch (error: any) {
    console.error('❌ [GroupInvoiceData] Failed to create group invoice data:', error)
    throw new Error(`Failed to create group invoice data: ${error.message} `)
  }
}

export async function generateGroupInvoiceHTML(data: GroupInvoiceData): Promise<string> {
  const { formatCurrencySync } = await import('@/lib/utils')
  const settings = await hotelSettingsService.getHotelSettings()
  const currency = settings.currency || 'GHS'

  const sharedCss = `*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Inter',system-ui,-apple-system,sans-serif;line-height:1.6;color:#1E293B;background:#fff;font-size:11px}.w{max-width:794px;margin:0 auto;background:#fff;padding:40px}h1{font-size:24px;font-weight:300;color:#1E3D22;margin-bottom:6px;letter-spacing:-0.5px}h3{font-size:9px;font-weight:600;text-transform:uppercase;letter-spacing:1.5px;color:#C9963C;margin-bottom:12px}p{font-size:11px;color:#475569;margin:3px 0}strong{color:#1E3D22;font-weight:600}em{font-style:normal;color:#64748B}.lbl{font-size:10px;font-weight:500;color:#C9963C;letter-spacing:2px;text-transform:uppercase;margin-bottom:6px}.hd{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:28px;border-bottom:1px solid #E2E8F0;margin-bottom:36px;position:relative}.im{text-align:right}.im .dt{font-size:20px;font-weight:300;color:#1E3D22;letter-spacing:1px;text-transform:uppercase;margin-bottom:6px}.im .dn{font-size:12px;font-weight:500;color:#64748B;margin-bottom:14px;letter-spacing:0.5px}.ic p{font-size:11px}.ig{display:grid;grid-template-columns:1fr 1fr;gap:48px;margin-bottom:48px}table.ct{width:100%;border-collapse:collapse;margin-bottom:40px}table.ct th{font-size:9px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:#94A3B8;text-align:left;padding:14px 4px;border-bottom:1px solid #E2E8F0}table.ct td{padding:14px 4px;color:#1E293B;border-bottom:1px solid #F1F5F9}table.ct th.r,table.ct td.r{text-align:right}table.ct th.c,table.ct td.c{text-align:center}.tw{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:48px}.sp{flex:1;padding-right:48px}table.tt{width:300px;border-collapse:collapse}table.tt td{padding:10px 4px;font-size:11px;color:#475569}table.tt tr.sub td{border-top:1px dashed #E2E8F0;font-weight:500;color:#1E3D22;padding-top:14px}table.tt tr.gt td{border-top:2px solid #1E3D22;padding-top:16px;padding-bottom:16px;font-size:15px;font-weight:600;color:#1E3D22}.ft{padding-top:28px;border-top:1px solid #E2E8F0;text-align:center}.ft .ty{font-size:12px;font-weight:500;color:#1E3D22;margin-bottom:10px}.ft .fr{font-size:9px;color:#64748B;display:flex;justify-content:space-between}.sb{text-align:center;padding:10px;font-size:10px;font-weight:600;letter-spacing:2px;text-transform:uppercase;margin-bottom:36px;border:1px solid currentColor;border-radius:2px}.bdg{display:inline-block;margin-top:10px;padding:5px 14px;border:1px solid currentColor;border-radius:2px;font-size:9px;font-weight:600;letter-spacing:1px;text-transform:uppercase}.sh td{font-size:9px;font-weight:600;color:#C9963C;text-transform:uppercase;letter-spacing:1px;padding:12px 4px 6px!important}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}`

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Group Invoice ${data.invoiceNumber}</title><style>${sharedCss}</style></head>
<body><div class="w">
<div class="ab"></div>
<div class="hd">
  <div class="hi">
    <div class="lbl">Guest House</div>
    <h1>${data.hotel.name}</h1>
    <p>${data.hotel.address}</p>
    <p>Tel: ${data.hotel.phone} &nbsp;|&nbsp; ${data.hotel.email}</p>
    <p class="tin">TIN: 71786161-3</p>
  </div>
  <div class="im">
    <div class="dt">Group Invoice</div>
    <div class="dn">${data.invoiceNumber}</div>
    <p><strong>Date:</strong> ${new Date(data.invoiceDate).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})}</p>
    <p><strong>Due:</strong> Upon Receipt</p>
    <p><strong>Reference:</strong> ${data.groupReference}</p>
    <span class="bdg" style="border:1px solid #86EFAC;color:#15803D">PAID</span>
  </div>
</div>
<div class="ig">
  <div class="ic">
    <h3>Bill To (Group Contact)</h3>
    <p class="nm">${data.billingContact.name}</p>
    <p>${data.billingContact.email}</p>
    ${data.billingContact.phone ? `<p><em>Tel: </em>${data.billingContact.phone}</p>` : ''}
    ${data.billingContact.address ? `<p>${data.billingContact.address}</p>` : ''}
  </div>
  <div class="ic">
    <h3>Group Summary</h3>
    <p><em>Total Rooms: </em><strong>${data.summary.totalRooms}</strong></p>
    <p><em>Total Nights: </em><strong>${data.summary.totalNights}</strong></p>
    <p><em>Room Subtotal: </em><strong>${formatCurrencySync(data.summary.roomSubtotal, currency)}</strong></p>
    ${data.summary.discountTotal > 0 ? `<p><em>Discount Applied: </em><strong style="color:#DC2626">−${formatCurrencySync(data.summary.discountTotal, currency)}</strong></p>` : ''}
  </div>
</div>
<div class="bd">
  <table class="ct">
    <thead><tr><th>Room &amp; Guest</th><th class="c">Dates</th><th class="c">Nights</th><th class="r">Room Total</th></tr></thead>
    <tbody>
      ${data.bookings.map(b => `
        <tr>
          <td><strong>Room ${b.roomNumber}</strong> <em style="color:#5A7060">(${b.roomType})</em><br/><span style="font-size:10px;color:#5A7060">${b.guestName}</span></td>
          <td class="c" style="font-size:10px">${new Date(b.checkIn).toLocaleDateString('en-GB',{day:'2-digit',month:'short'})}&nbsp;–&nbsp;${new Date(b.checkOut).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})}</td>
          <td class="c">${b.nights}</td>
          <td class="r" style="font-weight:700">${formatCurrencySync(b.subtotal, currency)}</td>
        </tr>
        ${b.additionalCharges.length>0 ? b.additionalCharges.map(ch=>`<tr class="sr"><td colspan="3">↳ ${ch.description} (×${ch.quantity})</td><td class="r">${formatCurrencySync(ch.amount,currency)}</td></tr>`).join('') : ''}
      `).join('')}
    </tbody>
  </table>
</div>
<div class="tw">
  <div class="sp">
    ${data.summary.additionalCharges && data.summary.additionalCharges.length > 0 ? `
    <div style="border:1px solid #E2E8F0;border-left:2px solid #C9963C;padding:24px;border-radius:2px;margin-bottom:24px;">
      <p style="font-size:9px;font-weight:600;color:#C9963C;text-transform:uppercase;letter-spacing:1px;margin-bottom:16px;border-bottom:1px solid #F1F5F9;padding-bottom:12px">Group-Level Charges</p>
      ${data.summary.additionalCharges.map(ch=>`<div style="display:flex;justify-content:space-between;font-size:11px;padding:3px 0;border-bottom:1px solid #EBF2EB"><span>${ch.description}</span><span style="font-weight:600">+${formatCurrencySync(ch.amount,currency)}</span></div>`).join('')}
    </div>` : ''}
  </div>
  <table class="tt">
    ${data.summary.discountTotal>0?`<tr><td style="color:#DC2626">Discount${data.summary.discount?.type==='percentage'?` (${data.summary.discount.value}%)`:''}:</td><td style="text-align:right;color:#DC2626;font-weight:700">−${formatCurrencySync(data.summary.discountTotal,currency)}</td></tr>`:''}
    <tr class="sh"><td colspan="2">Ghana Tax Breakdown</td></tr>
    <tr><td>Sales Total</td><td style="text-align:right">${formatCurrencySync(data.summary.salesTotal,currency)}</td></tr>
    <tr><td>GF/NHIL (5%)</td><td style="text-align:right">${formatCurrencySync(data.summary.gfNhil,currency)}</td></tr>
    <tr class="sub"><td>Sub Total</td><td style="text-align:right">${formatCurrencySync(data.summary.taxSubTotal,currency)}</td></tr>
    <tr><td>VAT (15%)</td><td style="text-align:right">${formatCurrencySync(data.summary.vat,currency)}</td></tr>
    <tr><td>Tourism Levy (1%)</td><td style="text-align:right">${formatCurrencySync(data.summary.tourismLevy,currency)}</td></tr>
    <tr class="gt"><td>Grand Total</td><td style="text-align:right">${formatCurrencySync(data.summary.total,currency)}</td></tr>
  </table>
</div>
<div class="ft">
  <div class="ty">Thank you for choosing ${data.hotel.name}!</div>
  <div class="fr">
    <div><p><strong>Payment Methods:</strong> Cash &nbsp;·&nbsp; Mobile Money &nbsp;·&nbsp; Bank Transfer</p></div>
    <div style="text-align:right"><p>${data.hotel.phone} &nbsp;|&nbsp; ${data.hotel.email}</p><p>TIN: 71786161-3</p></div>
  </div>
</div>
</div></body></html>`
}

export async function generateGroupInvoicePDF(data: GroupInvoiceData): Promise<Blob> {
  console.log('📄 [GroupInvoicePDF] Generating PDF with', data.bookings.length, 'bookings...')
  const htmlContent = await generateGroupInvoiceHTML(data)

  const element = document.createElement('div')
  element.innerHTML = htmlContent
  element.style.position = 'absolute'
  element.style.left = '-9999px'
  element.style.top = '0'
  // Set a fixed width to ensure consistent rendering
  element.style.width = '800px'
  document.body.appendChild(element)

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    allowTaint: true,
    backgroundColor: '#ffffff',
    // Ensure full height is captured
    windowHeight: element.scrollHeight,
    height: element.scrollHeight
  })
  document.body.removeChild(element)

  const imgData = canvas.toDataURL('image/jpeg', 0.95)
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  const imgWidth = 210 // A4 width in mm
  const pageHeight = 297 // A4 height in mm
  const imgHeight = (canvas.height * imgWidth) / canvas.width
  let heightLeft = imgHeight
  let position = 0

  // Add first page
  pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight)
  heightLeft -= pageHeight

  // Add additional pages if content extends beyond first page
  while (heightLeft > 0) {
    position = heightLeft - imgHeight
    pdf.addPage()
    pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight)
    heightLeft -= pageHeight
  }

  console.log('✅ [GroupInvoicePDF] PDF generated with', pdf.getNumberOfPages(), 'page(s)')
  return pdf.output('blob')
}

export async function downloadGroupInvoicePDF(data: GroupInvoiceData): Promise<void> {
  try {
    const pdfBlob = await generateGroupInvoicePDF(data)
    const url = URL.createObjectURL(pdfBlob)
    const a = document.createElement('a')
    a.href = url
    a.download = `group - invoice - ${data.invoiceNumber}.pdf`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  } catch (e: any) {
    console.error('Failed to download group invoice', e)
    throw e
  }
}

// ===================== GROUP PRE-INVOICE FUNCTIONS =====================

export interface GroupPreInvoiceData extends GroupInvoiceData {
  amountPaid: number
  paymentStatus: 'full' | 'part' | 'pending'
  isPreInvoice: true
}

export async function createGroupPreInvoiceData(
  bookings: BookingWithDetails[],
  billingContact: any
): Promise<GroupPreInvoiceData> {
  const base = await createGroupInvoiceData(bookings, billingContact)

  // Read amountPaid / paymentStatus from the primary booking
  const primaryBooking = bookings.find(b => {
    const sr = (b as any).specialRequests || (b as any).special_requests || ''
    const m = sr.match?.(/<!-- GROUP_DATA:(.*?) -->/)
    if (!m) return false
    try { return JSON.parse(m[1]).isPrimaryBooking === true } catch { return false }
  }) || bookings[0]

  let amountPaid = 0
  let paymentStatus: 'full' | 'part' | 'pending' = 'pending'

  // Try direct fields first (set at check-in via useCheckIn)
  if ((primaryBooking as any).amountPaid != null) {
    amountPaid = Number((primaryBooking as any).amountPaid)
  }
  if ((primaryBooking as any).paymentStatus) {
    paymentStatus = (primaryBooking as any).paymentStatus as 'full' | 'part' | 'pending'
  }

  // Fall back to PAYMENT_DATA embedded in specialRequests
  const sr = (primaryBooking as any).specialRequests || (primaryBooking as any).special_requests || ''
  const pm = sr.match?.(/<!-- PAYMENT_DATA:(.*?) -->/)
  if (pm) {
    try {
      const pd = JSON.parse(pm[1])
      if (amountPaid === 0 && pd.amountPaid) amountPaid = Number(pd.amountPaid)
      if (paymentStatus === 'pending' && pd.paymentStatus) paymentStatus = pd.paymentStatus
    } catch { /* ignore */ }
  }

  return { ...base, amountPaid, paymentStatus, isPreInvoice: true }
}

export async function generateGroupPreInvoiceHTML(data: GroupPreInvoiceData): Promise<string> {
  const { formatCurrencySync } = await import('@/lib/utils')
  const settings = await hotelSettingsService.getHotelSettings()
  const currency = settings.currency || 'GHS'

  const grandTotal = data.summary.total
  const amountPaid = data.amountPaid || 0
  const remaining = Math.max(0, grandTotal - amountPaid)
  const isPaid = data.paymentStatus === 'full' || remaining === 0
  const isPart = !isPaid && amountPaid > 0

  // Status strip (print-friendly — thin coloured text bar, not a full gradient band)
  const stripColor = isPaid ? '#15803D' : isPart ? '#B45309' : '#C9963C'
  const stripText = isPaid ? 'GROUP PRE-INVOICE — FULLY PAID'
    : isPart ? 'GROUP PRE-INVOICE — PART PAYMENT RECEIVED — BALANCE DUE AT CHECK-IN'
    : 'GROUP PRE-INVOICE — PAYMENT DUE AT CHECK-IN'
  const badgeBorder = isPaid ? '#86EFAC' : isPart ? '#FCD34D' : '#C9963C'
  const badgeColor = isPaid ? '#15803D' : isPart ? '#92400E' : '#92400E'
  const badgeText = isPaid ? 'PAID' : isPart ? 'PART PAID' : 'UNPAID'

  // Payment summary card — white background + coloured left border (print-friendly)
  let paymentCard = ''
  if (isPaid) {
    paymentCard = `<div style="border:1px solid #E2E8F0;border-left:2px solid #15803D;padding:24px;border-radius:2px;margin-bottom:24px;">
        <p style="font-size:9px;font-weight:600;color:#15803D;text-transform:uppercase;letter-spacing:1px;margin-bottom:16px;border-bottom:1px solid #F1F5F9;padding-bottom:12px">Payment Status</p>
  <p style="color:#1E3D22;font-size:12px;font-weight:700">Group payment received in full</p>
  <p style="color:#5A7060;font-size:11px;margin-top:3px">${formatCurrencySync(grandTotal, currency)}</p>
  <p style="color:#15803D;font-size:9px;margin-top:5px">No balance outstanding.</p>
</div>`
  } else if (isPart) {
    paymentCard = `<div style="border:1px solid #E2E8F0;border-left:2px solid #B45309;padding:24px;border-radius:2px;margin-bottom:24px;">
        <p style="font-size:9px;font-weight:600;color:#B45309;text-transform:uppercase;letter-spacing:1px;margin-bottom:16px;border-bottom:1px solid #F1F5F9;padding-bottom:12px">Group Payment Summary</p>
  <table style="width:100%;border-collapse:collapse;font-size:11px">
    <tr><td style="color:#5A7060;padding:3px 0">Group Total:</td><td style="text-align:right;font-weight:600;color:#1A2B1B">${formatCurrencySync(grandTotal, currency)}</td></tr>
    <tr><td style="color:#15803D;padding:3px 0;border-top:1px dashed #D8E4D9">Amount Paid:</td><td style="text-align:right;font-weight:700;color:#15803D;border-top:1px dashed #D8E4D9">${formatCurrencySync(amountPaid, currency)}</td></tr>
    <tr style="border-top:2px solid #D8E4D9"><td style="color:#B45309;font-weight:700;padding:5px 0 2px">Balance Due:</td><td style="text-align:right;font-weight:800;color:#DC2626;font-size:14px;padding:5px 0 2px">${formatCurrencySync(remaining, currency)}</td></tr>
  </table>
  <p style="color:#5A7060;font-size:9px;margin-top:6px">Balance due at check-in &nbsp;·&nbsp; Cash &nbsp;·&nbsp; Mobile Money &nbsp;·&nbsp; Bank Transfer</p>
</div>`
  } else {
    paymentCard = `<div style="border:1px solid #E2E8F0;border-left:2px solid #C9963C;padding:24px;border-radius:2px;margin-bottom:24px;">
        <p style="font-size:9px;font-weight:600;color:#C9963C;text-transform:uppercase;letter-spacing:1px;margin-bottom:16px;border-bottom:1px solid #F1F5F9;padding-bottom:12px">Group Payment Due</p>
  <table style="width:100%;border-collapse:collapse;font-size:11px">
    <tr><td style="color:#5A7060;padding:3px 0">Group Total:</td><td style="text-align:right;font-weight:600;color:#1A2B1B">${formatCurrencySync(grandTotal, currency)}</td></tr>
    <tr style="border-top:2px solid #D8E4D9"><td style="color:#C9963C;font-weight:700;padding:5px 0 2px">Due at Check-in:</td><td style="text-align:right;font-weight:800;color:#1E3D22;font-size:14px;padding:5px 0 2px">${formatCurrencySync(grandTotal, currency)}</td></tr>
  </table>
  <p style="color:#5A7060;font-size:9px;margin-top:6px">We accept: Cash &nbsp;·&nbsp; Mobile Money &nbsp;·&nbsp; Bank Transfer</p>
</div>`
  }

  const sharedCss = `*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Inter',system-ui,-apple-system,sans-serif;line-height:1.6;color:#1E293B;background:#fff;font-size:11px}.w{max-width:794px;margin:0 auto;background:#fff;padding:40px}h1{font-size:24px;font-weight:300;color:#1E3D22;margin-bottom:6px;letter-spacing:-0.5px}h3{font-size:9px;font-weight:600;text-transform:uppercase;letter-spacing:1.5px;color:#C9963C;margin-bottom:12px}p{font-size:11px;color:#475569;margin:3px 0}strong{color:#1E3D22;font-weight:600}em{font-style:normal;color:#64748B}.lbl{font-size:10px;font-weight:500;color:#C9963C;letter-spacing:2px;text-transform:uppercase;margin-bottom:6px}.hd{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:28px;border-bottom:1px solid #E2E8F0;margin-bottom:36px;position:relative}.im{text-align:right}.im .dt{font-size:20px;font-weight:300;color:#1E3D22;letter-spacing:1px;text-transform:uppercase;margin-bottom:6px}.im .dn{font-size:12px;font-weight:500;color:#64748B;margin-bottom:14px;letter-spacing:0.5px}.ic p{font-size:11px}.ig{display:grid;grid-template-columns:1fr 1fr;gap:48px;margin-bottom:48px}table.ct{width:100%;border-collapse:collapse;margin-bottom:40px}table.ct th{font-size:9px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:#94A3B8;text-align:left;padding:14px 4px;border-bottom:1px solid #E2E8F0}table.ct td{padding:14px 4px;color:#1E293B;border-bottom:1px solid #F1F5F9}table.ct th.r,table.ct td.r{text-align:right}table.ct th.c,table.ct td.c{text-align:center}.tw{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:48px}.sp{flex:1;padding-right:48px}table.tt{width:300px;border-collapse:collapse}table.tt td{padding:10px 4px;font-size:11px;color:#475569}table.tt tr.sub td{border-top:1px dashed #E2E8F0;font-weight:500;color:#1E3D22;padding-top:14px}table.tt tr.gt td{border-top:2px solid #1E3D22;padding-top:16px;padding-bottom:16px;font-size:15px;font-weight:600;color:#1E3D22}.ft{padding-top:28px;border-top:1px solid #E2E8F0;text-align:center}.ft .ty{font-size:12px;font-weight:500;color:#1E3D22;margin-bottom:10px}.ft .fr{font-size:9px;color:#64748B;display:flex;justify-content:space-between}.sb{text-align:center;padding:10px;font-size:10px;font-weight:600;letter-spacing:2px;text-transform:uppercase;margin-bottom:36px;border:1px solid currentColor;border-radius:2px}.bdg{display:inline-block;margin-top:10px;padding:5px 14px;border:1px solid currentColor;border-radius:2px;font-size:9px;font-weight:600;letter-spacing:1px;text-transform:uppercase}.sh td{font-size:9px;font-weight:600;color:#C9963C;text-transform:uppercase;letter-spacing:1px;padding:12px 4px 6px!important}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}`

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Group Pre-Invoice ${data.invoiceNumber}</title><style>${sharedCss}</style></head>
<body><div class="w">
<div class="ab"></div>
<div class="sb" style="color:${stripColor}">${stripText}</div>
<div class="hd">
  <div class="hi">
    <div class="lbl">Guest House</div>
    <h1>${data.hotel.name}</h1>
    <p>${data.hotel.address}</p>
    <p>Tel: ${data.hotel.phone} &nbsp;|&nbsp; ${data.hotel.email}</p>
    <p class="tin">TIN: 71786161-3</p>
  </div>
  <div class="im">
    <div class="dt">Group Pre-Invoice</div>
    <div class="dn">${data.invoiceNumber}</div>
    <p><strong>Date:</strong> ${new Date(data.invoiceDate).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})}</p>
    <p><strong>Due:</strong> At Check-in</p>
    <p><strong>Ref:</strong> ${data.groupReference}</p>
    <span class="bdg" style="border:1px solid ${badgeBorder};color:${badgeColor}">${badgeText}</span>
  </div>
</div>
<div class="ig">
  <div class="ic">
    <h3>Bill To (Group Contact)</h3>
    <p class="nm">${data.billingContact.name}</p>
    <p>${data.billingContact.email}</p>
    ${data.billingContact.phone ? `<p><em>Tel: </em>${data.billingContact.phone}</p>` : ''}
    ${data.billingContact.address ? `<p>${data.billingContact.address}</p>` : ''}
  </div>
  <div class="ic">
    <h3>Group Summary</h3>
    <p><em>Total Rooms: </em><strong>${data.summary.totalRooms}</strong></p>
    <p><em>Total Nights: </em><strong>${data.summary.totalNights}</strong></p>
    <p><em>Room Subtotal: </em><strong>${formatCurrencySync(data.summary.roomSubtotal, currency)}</strong></p>
    ${data.summary.discountTotal > 0 ? `<p><em>Discount Applied: </em><strong style="color:#DC2626">−${formatCurrencySync(data.summary.discountTotal, currency)}</strong></p>` : ''}
    ${isPart ? `<p><em>Amount Paid: </em><strong style="color:#15803D">${formatCurrencySync(amountPaid, currency)}</strong></p>` : ''}
    ${isPart ? `<p><em>Balance Due: </em><strong style="color:#DC2626">${formatCurrencySync(remaining, currency)}</strong></p>` : ''}
  </div>
</div>
<div class="bd">
  <table class="ct">
    <thead><tr><th>Room &amp; Guest</th><th class="c">Dates</th><th class="c">Nights</th><th class="r">Room Total</th></tr></thead>
    <tbody>
      ${data.bookings.map(b => `
        <tr>
          <td><strong>Room ${b.roomNumber}</strong> <em style="color:#5A7060">(${b.roomType})</em><br/><span style="font-size:10px;color:#5A7060">${b.guestName}</span></td>
          <td class="c" style="font-size:10px">${new Date(b.checkIn).toLocaleDateString('en-GB',{day:'2-digit',month:'short'})}&nbsp;–&nbsp;${new Date(b.checkOut).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})}</td>
          <td class="c">${b.nights}</td>
          <td class="r" style="font-weight:700">${formatCurrencySync(b.subtotal, currency)}</td>
        </tr>
        ${b.additionalCharges.length > 0 ? b.additionalCharges.map(ch => `<tr class="sr"><td colspan="3">↳ ${ch.description} (×${ch.quantity})</td><td class="r">${formatCurrencySync(ch.amount, currency)}</td></tr>`).join('') : ''}
      `).join('')}
    </tbody>
  </table>
</div>
<div class="tw">
  <div class="sp">
    ${paymentCard}
    ${data.summary.additionalCharges && data.summary.additionalCharges.length > 0 ? `
    <div style="border:1px solid #E2E8F0;border-left:2px solid #C9963C;padding:24px;border-radius:2px;margin-top:24px;">
      <p style="font-size:9px;font-weight:600;color:#C9963C;text-transform:uppercase;letter-spacing:1px;margin-bottom:16px;border-bottom:1px solid #F1F5F9;padding-bottom:12px">Group-Level Charges</p>
      ${data.summary.additionalCharges.map(ch => `<div style="display:flex;justify-content:space-between;font-size:11px;padding:3px 0;border-bottom:1px solid #EBF2EB"><span>${ch.description}</span><span style="font-weight:600">+${formatCurrencySync(ch.amount, currency)}</span></div>`).join('')}
    </div>` : ''}
  </div>
  <table class="tt">
    ${data.summary.discountTotal > 0 ? `<tr><td style="color:#DC2626">Discount${data.summary.discount?.type === 'percentage' ? ` (${data.summary.discount.value}%)` : ''}:</td><td style="text-align:right;color:#DC2626;font-weight:700">−${formatCurrencySync(data.summary.discountTotal, currency)}</td></tr>` : ''}
    <tr class="sh"><td colspan="2">Ghana Tax Breakdown</td></tr>
    <tr><td>Sales Total</td><td style="text-align:right">${formatCurrencySync(data.summary.salesTotal, currency)}</td></tr>
    <tr><td>GF/NHIL (5%)</td><td style="text-align:right">${formatCurrencySync(data.summary.gfNhil, currency)}</td></tr>
    <tr class="sub"><td>Sub Total</td><td style="text-align:right">${formatCurrencySync(data.summary.taxSubTotal, currency)}</td></tr>
    <tr><td>VAT (15%)</td><td style="text-align:right">${formatCurrencySync(data.summary.vat, currency)}</td></tr>
    <tr><td>Tourism Levy (1%)</td><td style="text-align:right">${formatCurrencySync(data.summary.tourismLevy, currency)}</td></tr>
    <tr class="gt"><td>Grand Total</td><td style="text-align:right">${formatCurrencySync(grandTotal, currency)}</td></tr>
    ${isPart ? `<tr style="border-top:2px solid #86EFAC"><td style="color:#15803D;font-weight:700">Amount Paid</td><td style="text-align:right;color:#15803D;font-weight:700">−${formatCurrencySync(amountPaid, currency)}</td></tr><tr><td style="color:#DC2626;font-weight:800;font-size:12px">Balance Due</td><td style="text-align:right;color:#DC2626;font-weight:800;font-size:13px">${formatCurrencySync(remaining, currency)}</td></tr>` : ''}
    ${isPaid ? `<tr><td style="color:#15803D;font-weight:700;font-size:11px" colspan="2">Fully Settled — No Balance</td></tr>` : ''}
  </table>
</div>
<div class="ft">
  <div class="ty">Thank you for choosing ${data.hotel.name}!</div>
  <div class="fr">
    <div><p><strong>Payment Methods:</strong> Cash &nbsp;·&nbsp; Mobile Money &nbsp;·&nbsp; Bank Transfer</p></div>
    <div style="text-align:right"><p>${data.hotel.phone} &nbsp;|&nbsp; ${data.hotel.email}</p><p>TIN: 71786161-3</p></div>
  </div>
</div>
</div></body></html>`
}

export async function generateGroupPreInvoicePDF(data: GroupPreInvoiceData): Promise<Blob> {
  console.log('📄 [GroupPreInvoicePDF] Generating PDF with', data.bookings.length, 'bookings...')
  const htmlContent = await generateGroupPreInvoiceHTML(data)

  const element = document.createElement('div')
  element.innerHTML = htmlContent
  element.style.position = 'absolute'
  element.style.left = '-9999px'
  element.style.top = '0'
  element.style.width = '800px'
  document.body.appendChild(element)

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    allowTaint: true,
    backgroundColor: '#ffffff',
    windowHeight: element.scrollHeight,
    height: element.scrollHeight
  })
  document.body.removeChild(element)

  const imgData = canvas.toDataURL('image/jpeg', 0.95)
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  const imgWidth = 210
  const pageHeight = 297
  const imgHeight = (canvas.height * imgWidth) / canvas.width
  let heightLeft = imgHeight
  let position = 0

  pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight)
  heightLeft -= pageHeight

  while (heightLeft > 0) {
    position = heightLeft - imgHeight
    pdf.addPage()
    pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight)
    heightLeft -= pageHeight
  }

  console.log('✅ [GroupPreInvoicePDF] PDF generated with', pdf.getNumberOfPages(), 'page(s)')
  return pdf.output('blob')
}

export async function downloadGroupPreInvoicePDF(data: GroupPreInvoiceData): Promise<void> {
  try {
    const pdfBlob = await generateGroupPreInvoicePDF(data)
    const url = URL.createObjectURL(pdfBlob)
    const a = document.createElement('a')
    a.href = url
    a.download = `group-pre-invoice-${data.invoiceNumber}.pdf`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  } catch (e: any) {
    console.error('Failed to download group pre-invoice', e)
    throw e
  }
}