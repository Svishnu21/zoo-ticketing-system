import { formatDateOnly as fmtDateOnly, formatDateTime as fmtDateTime } from '/js/utils/dateUtils.js'

console.log('success.js loaded')

let currentTicketId = ''
let isAdminSession = false

document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search)
  const ticketId = params.get('ticketId')
  const hasAdminSession = Boolean(sessionStorage.getItem('adminRole') || sessionStorage.getItem('adminLoggedIn'))
  isAdminSession = hasAdminSession
  const preferAdminFetch = hasAdminSession
  const verificationToken = params.get('token') || sessionStorage.getItem('latestVerificationToken')
  const errorMessage = document.getElementById('errorMessage')

  setupSensitivePageGuards()

  console.log('ticketId from URL:', ticketId)
  console.log('verification token present:', !!verificationToken)
  console.log('admin session present:', hasAdminSession)

  if (!ticketId) {
    showError('Missing ticketId in the URL. Please reopen your ticket link.', errorMessage)
    return
  }

  if (!isAdminSession && isTicketViewConsumed(ticketId)) {
    window.location.replace('/tickets')
    return
  }

  fetchTicket(ticketId, { verificationToken, preferAdminFetch }, errorMessage)
})

async function fetchTicket(ticketId, { verificationToken, preferAdminFetch }, errorContainer) {
  try {
    let data = null

    if (preferAdminFetch) {
      try {
        data = await fetchAdminTicket(ticketId)
      } catch (adminError) {
        if (!verificationToken) throw adminError
        data = await fetchPublicTicket(ticketId, verificationToken)
      }
    } else {
      data = await fetchPublicTicket(ticketId, verificationToken)
    }

    console.log('Raw API response:', data)
    console.log('qrImage exists:', !!data.qrImage)
    console.log('qrImage preview:', typeof data.qrImage === 'string' ? data.qrImage.substring(0, 40) : 'none')
    renderTicket(data)
    cleanupSuccessUrl()
  } catch (error) {
    console.error('Failed to load ticket', error)
    if (error?.statusCode === 403) {
      const reason = encodeURIComponent(error.message || 'Invalid ticket link.')
      window.location.replace(`/invalid-ticket.html?reason=${reason}`)
      return
    }
    showError(error.message || 'Unable to load ticket.', errorContainer)
  }
}

async function fetchPublicTicket(ticketId, verificationToken) {
  const response = await fetch(`/api/tickets/${encodeURIComponent(ticketId)}${verificationToken ? `?token=${encodeURIComponent(verificationToken)}` : ''}`)
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}))
    const error = new Error(payload.message || 'Unable to load ticket.')
    error.statusCode = response.status
    throw error
  }
  return response.json()
}

async function fetchAdminTicket(ticketId) {
  const response = await fetch(`/admin/bookings/${encodeURIComponent(ticketId)}`, {
    headers: adminAuthHeaders(),
    credentials: 'include',
  })

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}))
    throw new Error(payload.message || 'Unable to load ticket from admin view.')
  }

  return response.json()
}

function adminAuthHeaders() {
  return { 'Content-Type': 'application/json' }
}

function computeTicketCount(items) {
  if (!Array.isArray(items)) return 0
  return items.reduce((sum, item) => sum + Number(item?.quantity || 0), 0)
}

function renderTicket(ticket) {
  const ticketCount = Number(ticket.ticketCount || computeTicketCount(ticket.items) || 0)
  currentTicketId = String(ticket?.ticketId || '')

  setElementText('ticketId', ticket.ticketId || 'NOT SET')
  setElementText('visitDate', fmtDateOnly(ticket.visitDate) || 'NOT SET')
  setElementText('bookedAt', fmtDateTime(ticket.bookedAt || ticket.issueDate) || 'NOT SET')
  setElementText('ticketCount', Number.isFinite(ticketCount) && ticketCount > 0 ? String(ticketCount) : '—')
  setElementText('totalAmount', formatCurrency(ticket.totalAmount || 0))

  if (!isAdminSession && ticket?.ticketId) {
    markTicketViewConsumed(ticket.ticketId)
    sessionStorage.setItem('bookingFlowState', 'COMPLETED')
  }

  renderItems(ticket.items)
  renderQr(ticket.qrImage)
  configurePrintButton(ticket)
  configureShareButton(ticket)
}

function configurePrintButton(ticket) {
  const printButton = document.getElementById('printTicketBtn')
  if (!printButton) return

  printButton.onclick = async () => {
    const originalLabel = printButton.textContent
    printButton.disabled = true
    printButton.textContent = 'Preparing PDF...'

    try {
      const pdfBlob = await generateTicketPdfBlob()
      const fileName = buildTicketPdfFileName(ticket)
      downloadPdfBlob(pdfBlob, fileName)
    } catch (error) {
      console.error('Print PDF generation failed, falling back to browser print:', error)
      window.print()
    } finally {
      printButton.disabled = false
      printButton.textContent = originalLabel
    }
  }
}

function configureShareButton(ticket) {
  const shareButton = document.getElementById('shareTicketBtn')
  if (!shareButton) return

  const source = String(ticket?.ticketSource || '').toUpperCase()
  if (source !== 'ONLINE') {
    shareButton.hidden = true
    return
  }

  shareButton.hidden = false
  shareButton.onclick = async () => {
    const originalLabel = shareButton.textContent
    shareButton.disabled = true
    shareButton.textContent = 'Preparing PDF...'

    try {
      const pdfBlob = await generateTicketPdfBlob()
      const ticketId = String(ticket?.ticketId || 'zoo-ticket').replace(/[^A-Za-z0-9_-]/g, '') || 'zoo-ticket'
      const fileName = `${ticketId}.pdf`
      const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' })

      const canShareFile = Boolean(navigator.share) && (!navigator.canShare || navigator.canShare({ files: [pdfFile] }))
      if (canShareFile && navigator.share) {
        try {
          await navigator.share({
            files: [pdfFile],
          })
          return
        } catch (error) {
          if (error?.name === 'AbortError') return
        }
      }

      downloadPdfBlob(pdfBlob, fileName)
      window.alert('Ticket PDF downloaded successfully')
    } catch (error) {
      console.error('Ticket share failed:', error)
      window.alert('Unable to share ticket right now. Please try again.')
    } finally {
      shareButton.disabled = false
      shareButton.textContent = originalLabel
    }
  }
}

async function generateTicketPdfBlob() {
  const ticketElement = document.querySelector('.ticket')
  if (!ticketElement) {
    throw new Error('Ticket container not found.')
  }

  if (typeof window.html2canvas !== 'function' || !window.jspdf?.jsPDF) {
    throw new Error('PDF libraries are unavailable.')
  }

  const scale = Math.max(2, Math.min(3, window.devicePixelRatio || 2))
  const canvas = await window.html2canvas(ticketElement, {
    backgroundColor: '#ffffff',
    useCORS: true,
    scale,
    logging: false,
  })

  const { jsPDF } = window.jspdf
  const pdf = new jsPDF({
    orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
    unit: 'pt',
    format: [canvas.width, canvas.height],
    compress: true,
  })

  const imageData = canvas.toDataURL('image/png')
  pdf.addImage(imageData, 'PNG', 0, 0, canvas.width, canvas.height, undefined, 'FAST')
  return pdf.output('blob')
}

function downloadPdfBlob(blob, fileName) {
  const objectUrl = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = objectUrl
  anchor.download = fileName
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(objectUrl)
}

function buildTicketPdfFileName(ticket) {
  const normalizedId = String(ticket?.ticketId || currentTicketId || '')
    .replace(/[^A-Za-z0-9_-]/g, '')
    .trim()

  if (!normalizedId) {
    return 'zoo-ticket.pdf'
  }

  return `zoo-ticket-${normalizedId}.pdf`
}

function renderItems(items) {
  const tbody = document.getElementById('ticketItems')
  if (!tbody) return

  if (!Array.isArray(items) || items.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4">No items</td></tr>'
    return
  }

  tbody.innerHTML = items
    .map((item) => {
      const rawCategory = item.itemLabel || item.label || item.categoryName || item.itemCode || item.categoryCode || 'Category'
      const category = escapeHtml(formatDisplayCategory(rawCategory))
      const qty = Number(item.quantity || 0)
      const price = Number(item.unitPrice ?? item.price ?? 0)
      const amount = Number(item.amount ?? qty * price)
      return `
        <tr>
          <td>${category}</td>
          <td class="qty">${qty}</td>
          <td class="price">${price.toFixed(0)}</td>
          <td class="amount">${amount.toFixed(0)}</td>
        </tr>
      `
    })
    .join('')
}

function formatDisplayCategory(value) {
  const normalized = String(value || '')
    .trim()
    .replace(/^(?:Parking\s*-\s*)+/i, '')
    .trim()

  if (/^2\s*&\s*3\s*Wheeler$/i.test(normalized)) return '2 & 3 Wheeler'
  if (/^2\s*Wheeler$/i.test(normalized)) return '2 Wheeler'

  return normalized
}

function renderQr(qrImage) {
  const img = document.getElementById('qrImage')
  if (!img) return
  if (!qrImage) {
    img.alt = 'QR not available'
    return
  }
  img.src = qrImage
  img.alt = 'QR Code'
  img.style.display = 'block'
}

function formatCurrency(value) {
  return `INR ${Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`
}

function setElementText(id, value) {
  const el = document.getElementById(id)
  if (el) el.innerText = value ?? ''
}

function showError(message, container) {
  if (container) container.textContent = message
}

function setupSensitivePageGuards() {
  window.history.pushState(null, '', window.location.href)
  window.onpopstate = () => {
    window.location.replace('/tickets')
  }

  window.addEventListener('pageshow', (event) => {
    if (event.persisted) {
      window.location.replace('/tickets')
    }
  })
}

function getTicketViewKey(ticketId) {
  return `success-viewed:${String(ticketId || '').trim()}`
}

function isTicketViewConsumed(ticketId) {
  const key = getTicketViewKey(ticketId)
  return sessionStorage.getItem(key) === '1'
}

function markTicketViewConsumed(ticketId) {
  const key = getTicketViewKey(ticketId)
  sessionStorage.setItem(key, '1')
}

function cleanupSuccessUrl() {
  // Keep the page stable while removing ticket query parameters from the address bar.
  window.history.replaceState({}, document.title, '/success')
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

window.addEventListener('beforeprint', () => {
  const ticketElement = document.querySelector('.ticket');
  if (ticketElement) {
    const heightMm = Math.ceil((ticketElement.offsetHeight + 40) * 25.4 / 96);
    let styleDiv = document.getElementById('dynamic-print-size');
    if (!styleDiv) {
      styleDiv = document.createElement('style');
      styleDiv.id = 'dynamic-print-size';
      document.head.appendChild(styleDiv);
    }
    styleDiv.textContent = `@page { size: 80mm ${heightMm}mm; margin: 0; }`;
  }
});
