import { formatDateOnly as fmtDateOnly, formatDateTime as fmtDateTime } from '/js/utils/dateUtils.js'

console.log('success.js loaded')

document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search)
  const ticketId = params.get('ticketId')
  const hasAdminSession = Boolean(sessionStorage.getItem('token') || localStorage.getItem('token'))
  const preferAdminFetch = hasAdminSession
  const verificationToken = params.get('token') || sessionStorage.getItem('latestVerificationToken')
  const errorMessage = document.getElementById('errorMessage')

  console.log('ticketId from URL:', ticketId)
  console.log('verification token present:', !!verificationToken)
  console.log('admin session present:', hasAdminSession)

  if (!ticketId) {
    showError('Missing ticketId in the URL. Please reopen your ticket link.', errorMessage)
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
  } catch (error) {
    console.error('Failed to load ticket', error)
    showError(error.message || 'Unable to load ticket.', errorContainer)
  }
}

async function fetchPublicTicket(ticketId, verificationToken) {
  const response = await fetch(`/api/tickets/${encodeURIComponent(ticketId)}${verificationToken ? `?token=${encodeURIComponent(verificationToken)}` : ''}`)
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}))
    throw new Error(payload.message || 'Unable to load ticket.')
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
  const token = sessionStorage.getItem('token') || localStorage.getItem('token')
  if (!token) return { 'Content-Type': 'application/json' }
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }
}

function computeTicketCount(items) {
  if (!Array.isArray(items)) return 0
  return items.reduce((sum, item) => sum + Number(item?.quantity || 0), 0)
}

function renderTicket(ticket) {
  const ticketCount = Number(ticket.ticketCount || computeTicketCount(ticket.items) || 0)

  setElementText('ticketId', ticket.ticketId || 'NOT SET')
  setElementText('visitorName', ticket.visitorName || '—')
  setElementText('visitorMobile', ticket.visitorMobile || '—')
  setElementText('visitDate', fmtDateOnly(ticket.visitDate) || 'NOT SET')
  setElementText('bookedAt', fmtDateTime(ticket.bookedAt || ticket.issueDate) || 'NOT SET')
  setElementText('issueDate', fmtDateTime(ticket.issueDate) || 'NOT SET')
  setElementText('ticketCount', Number.isFinite(ticketCount) && ticketCount > 0 ? String(ticketCount) : '—')
  setElementText('paymentMode', (ticket.paymentMode || 'NOT SET').toUpperCase())
  setElementText('totalAmount', formatCurrency(ticket.totalAmount || 0))

  renderItems(ticket.items)
  renderQr(ticket.qrImage)
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
      const category = escapeHtml(
        item.itemLabel || item.label || item.categoryName || item.itemCode || item.categoryCode || 'Category',
      )
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

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
