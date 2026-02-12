import { formatDateOnly as fmtDateOnly, formatDateTime as fmtDateTime } from '/js/utils/dateUtils.js'

console.log('success.js loaded')

document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search)
  const ticketId = params.get('ticketId')
  const errorMessage = document.getElementById('errorMessage')

  console.log('ticketId from URL:', ticketId)

  if (!ticketId) {
    showError('Missing ticketId in the URL. Please reopen your ticket link.', errorMessage)
    return
  }

  fetchTicket(ticketId, errorMessage)
})

async function fetchTicket(ticketId, errorContainer) {
  try {
    const response = await fetch(`/api/tickets/${encodeURIComponent(ticketId)}`)
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}))
      throw new Error(payload.message || 'Unable to load ticket.')
    }

    const data = await response.json()
    console.log('Raw API response:', data)
    console.log('qrImage exists:', !!data.qrImage)
    console.log('qrImage preview:', typeof data.qrImage === 'string' ? data.qrImage.substring(0, 40) : 'none')
    renderTicket(data)
  } catch (error) {
    console.error('Failed to load ticket', error)
    showError(error.message || 'Unable to load ticket.', errorContainer)
  }
}

function renderTicket(ticket) {
  document.getElementById('ticketId').innerText = ticket.ticketId || 'NOT SET'
  document.getElementById('visitDate').innerText = fmtDateOnly(ticket.visitDate) || 'NOT SET'
  document.getElementById('issueDate').innerText = fmtDateTime(ticket.issueDate) || 'NOT SET'
  document.getElementById('paymentMode').innerText = (ticket.paymentMode || 'NOT SET').toUpperCase()
  document.getElementById('totalAmount').innerText = ticket.totalAmount || '0'

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
      // Presentation-only override: display updated child label for zoo_child
      const rawLabel = item.itemLabel || item.label || item.categoryName || item.itemCode || item.categoryCode || 'Category'
      const isChildCode = (item.itemCode || item.code || '').toString().toLowerCase() === 'zoo_child'
      const category = escapeHtml(isChildCode ? 'Child (5 to 12 years)' : rawLabel)
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
  img.style.border = '1px solid red'
  img.style.display = 'block'
}

function formatCurrency(value) {
  return `INR ${Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`
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
