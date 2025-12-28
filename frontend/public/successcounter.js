import { formatDateOnly as fmtDateOnly, formatDateTime as fmtDateTime } from '/js/utils/dateUtils.js'

console.log('COUNTER SUCCESS PAGE LOADED')

document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search)
  const ticketId = params.get('ticketId')
  const errorMessage = document.getElementById('errorMessage')

  if (!ticketId) {
    showError('Ticket ID is missing in the URL.', errorMessage)
    return
  }

  fetchTicket(ticketId, errorMessage)
})

async function fetchTicket(ticketId, errorContainer) {
  try {
    const response = await fetch(`/api/counter/tickets/${encodeURIComponent(ticketId)}`)
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}))
      throw new Error(payload.message || 'Unable to load ticket.')
    }

    const data = await response.json()
    const ticket = data?.ticket || data
    renderTicket(ticket)
  } catch (error) {
    showError(error.message || 'Unable to load ticket.', errorContainer)
  }
}

function renderTicket(ticket) {
  setText('#ticketId', ticket.ticketId || 'NOT SET')
  setText('#ticketSource', (ticket.ticketSource || 'COUNTER').toUpperCase())
  setText('#visitDate', fmtDateOnly(ticket.visitDate) || 'NOT SET')
  setText('#issueDate', fmtDateTime(ticket.issueDate) || 'NOT SET')
  setText('#paymentMode', (ticket.paymentMode || 'NOT SET').toUpperCase())
  setText('#totalAmount', ticket.totalAmount || '0')

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
    img.alt = 'QR NOT RECEIVED FROM BACKEND'
    return
  }
  img.src = qrImage
  img.alt = 'QR Code'
  img.style.border = '1px solid #000'
  img.style.display = 'block'
}

function setText(selector, value) {
  const el = document.querySelector(selector)
  if (el) el.textContent = value ?? ''
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
