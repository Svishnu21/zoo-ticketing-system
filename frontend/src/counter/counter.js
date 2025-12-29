// Fallback date formatters (avoid ES module import to run as classic script)
const fmtDateOnly = (date) => {
  if (!date) return ''
  const d = new Date(date)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })
}

const fmtDateTime = (date) => {
  if (!date) return ''
  const d = new Date(date)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

console.log('✅ counter.js loaded')

// Correct pricing endpoint served by backend
const PRICING_API = '/api/counter/pricing'
// Category render order and grouping
const CATEGORY_ORDER = [
  {
    title: 'ENTRY TICKETS',
    keys: ['adultEntry', 'childEntry', 'childBelow5', 'differentlyAbled'],
  },
  {
    title: 'PARKING',
    keys: ['parkingLMV', 'parkingHMV', 'parkingTwoThree'],
  },
  {
    title: 'TRANSPORT',
    keys: ['batteryAdult', 'batteryChild'],
  },
  {
    title: 'CAMERA / ADD-ONS',
    keys: ['videoCamera'],
  },
]
// Static list of all tickets so free items are always visible
const ALL_TICKETS = [
  { code: 'zoo_adult', label: 'Entry - Adult', price: 50, category: 'ENTRY' },
  { code: 'zoo_child', label: 'Entry - Child (5-12 yrs)', price: 10, category: 'ENTRY' },
  { code: 'zoo_child_free', label: 'Children Below 5', price: 0, category: 'ENTRY' },
  { code: 'zoo_differently_abled', label: 'Differently Abled', price: 0, category: 'ENTRY' },
  { code: 'parking_4w_lmv', label: 'Parking - 4 Wheeler (LMV)', price: 50, category: 'PARKING' },
  { code: 'parking_4w_hmv', label: 'Parking - 4 Wheeler (HMV)', price: 100, category: 'PARKING' },
  { code: 'parking_2w_3w', label: 'Parking - 2 & 3 Wheeler', price: 20, category: 'PARKING' },
  { code: 'battery_vehicle_adult', label: 'Battery Vehicle - Adult', price: 50, category: 'TRANSPORT' },
  { code: 'battery_vehicle_child', label: 'Battery Vehicle - Child (5-12 yrs)', price: 30, category: 'TRANSPORT' },
  { code: 'camera_video', label: 'Video Camera (non-commercial)', price: 150, category: 'CAMERA' },
]

const RECENT_TICKETS_API = '/api/counter/tickets'

const fmt = (val = 0) => `Rs ${Number(val || 0).toFixed(2)}`
const qsa = (sel) => Array.from(document.querySelectorAll(sel))

document.addEventListener('DOMContentLoaded', () => {
  const page = document.body?.dataset?.page || ''
  if (page === 'issue') {
    console.log('✅ Counter issue page ready')
    loadTickets()
    return
  }

  if (page === 'login') {
    console.log('✅ Counter login page ready')
    attachLoginHandler()
    return
  }

  if (page === 'counter-success') {
    console.log('✅ Counter success page ready')
    initCounterSuccessPage()
  }
})

function attachLoginHandler() {
  if (document.body?.dataset?.page !== 'login') return
  const form = document.getElementById('login-form')
  const errEl = document.getElementById('login-error')
  if (!form) return
  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    if (errEl) errEl.textContent = ''
    const formData = new FormData(form)
    const username = (formData.get('username') || '').toString().trim()
    const password = (formData.get('password') || '').toString().trim()
    if (!username || !password) {
      if (errEl) errEl.textContent = 'Enter username and password.'
      return
    }

    // Try backend authentication first
    try {
      const resp = await fetch('/api/counter/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ username, password }),
      })

      if (resp.ok) {
        // assume authenticated — redirect to issue page
        window.location.href = '/counter/issue.html'
        return
      }

      // if backend responded but with error, show message
      const body = await resp.text()
      if (errEl) errEl.textContent = body || 'Login failed'
      return
    } catch (err) {
      // network or endpoint missing — fallback: allow any non-empty credentials
      console.warn('Login endpoint unavailable, falling back to client redirect', err)
      window.location.href = '/counter/issue.html'
    }
  })
}

async function loadTickets() {
  renderTickets()
  qsa('.qty-input').forEach((input) => input.addEventListener('input', updateTotals))
  updateTotals()
  wirePaymentUI()
}

function renderTickets() {
  const tbody = document.getElementById('ticketRows')
  if (!tbody) return

  tbody.innerHTML = ''
  let currentCategory = ''
  ALL_TICKETS.forEach((ticket) => {
    if (ticket.category !== currentCategory) {
      currentCategory = ticket.category
      const htr = document.createElement('tr')
      htr.className = 'category-row'
      htr.innerHTML = `<td colspan="4">${currentCategory}</td>`
      tbody.appendChild(htr)
    }

    const tr = document.createElement('tr')
    tr.innerHTML = `
      <td>${ticket.label}</td>
      <td>${fmt(ticket.price)}</td>
      <td>
        <input type="number" min="0" data-code="${ticket.code}" data-price="${ticket.price}" class="qty-input" />
      </td>
      <td class="right"><span data-subtotal="${ticket.code}">${fmt(0)}</span></td>
    `
    tbody.appendChild(tr)
  })
}

// Payment UI for public page
let paidConfirmedPublic = false
function wirePaymentUI() {
  const modeContainer = document.querySelector('.mode-buttons')
  const cashInput = document.getElementById('cash-amount')
  const upiInput = document.getElementById('upi-amount')
  const form = document.getElementById('pay-form')
  const submitBtn = document.getElementById('submit-btn')

  if (!modeContainer || !form || !submitBtn) return

  // ensure PAID button exists (single instance)
  if (!document.getElementById('paid-btn')) {
    const paidBtn = document.createElement('button')
    paidBtn.type = 'button'
    paidBtn.id = 'paid-btn'
    paidBtn.textContent = 'PAID'
    paidBtn.className = 'btn'
    modeContainer.parentNode.insertBefore(paidBtn, modeContainer.nextSibling)
    const paidStatus = document.createElement('span')
    paidStatus.id = 'paid-status'
    paidStatus.style.display = 'none'
    paidStatus.style.marginLeft = '8px'
    paidStatus.style.color = 'green'
    paidStatus.textContent = '✔ Amount Received'
    paidBtn.parentNode.insertBefore(paidStatus, paidBtn.nextSibling)
    paidBtn.addEventListener('click', onPaidClickPublic)
  }

  // radios for payment mode
  const radios = Array.from(modeContainer.querySelectorAll('input[name="paymentMode"]'))
  radios.forEach((r) => {
    r.addEventListener('change', () => {
      const mode = document.querySelector('input[name="paymentMode"]:checked')?.value
      if (mode === 'SPLIT') {
        if (cashInput) cashInput.style.display = 'inline-block'
        if (upiInput) upiInput.style.display = 'inline-block'
      } else {
        if (cashInput) cashInput.style.display = 'none'
        if (upiInput) upiInput.style.display = 'none'
      }
      resetPaidState()
    })
  })

  // hide split inputs initially unless split selected
  const sel = document.querySelector('input[name="paymentMode"]:checked')
  if (sel && sel.value === 'SPLIT') {
    if (cashInput) cashInput.style.display = 'inline-block'
    if (upiInput) upiInput.style.display = 'inline-block'
  } else {
    if (cashInput) cashInput.style.display = 'none'
    if (upiInput) upiInput.style.display = 'none'
  }

  if (cashInput) cashInput.addEventListener('input', () => resetPaidState())
  if (upiInput) upiInput.addEventListener('input', () => resetPaidState())

  // reset generate button until PAID
  disableGeneratePublic()

  // single submit handler enforcing PAID
  form.addEventListener('submit', (e) => {
    e.preventDefault()
    if (!paidConfirmedPublic) {
      showPayErrorPublic('Click PAID before generating ticket')
      return
    }
    const total = Number((document.getElementById('total')?.textContent || '0').replace(/[^0-9.-]+/g, '')) || 0
    const paymentMode = document.querySelector('input[name="paymentMode"]:checked')?.value || null
    let cash = 0, upi = 0
    if (paymentMode === 'CASH') cash = total
    else if (paymentMode === 'UPI') upi = total
    else {
      cash = Number(document.getElementById('cash-amount')?.value) || 0
      upi = Number(document.getElementById('upi-amount')?.value) || 0
    }
    const payload = {
      paymentMode,
      paymentStatus: 'PAID',
      paymentBreakup: { cash, upi },
      items: getItemsPayloadPublic(),
      totalAmount: total,
    }
    fetch('/api/counter/bookings', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    })
      .then((r) => r.json())
      .then((d) => { console.log('Generated', d); alert('Ticket generated'); resetPaidState(true) })
      .catch((err) => { console.error(err); showPayErrorPublic('Failed to generate ticket') })
  })
}

function getItemsPayloadPublic() { return qsa('.qty-input').map((input) => ({ itemCode: input.dataset.code, qty: Math.max(0, Number(input.value) || 0) })) }

function onPaidClickPublic() {
  clearPayErrorPublic()
  const paymentMode = document.querySelector('input[name="paymentMode"]:checked')?.value || null
  if (!paymentMode) { showPayErrorPublic('Select a payment mode'); return }
  const total = Number((document.getElementById('total')?.textContent || '0').replace(/[^0-9.-]+/g, '')) || 0
  if (paymentMode === 'SPLIT') {
    const cash = Number(document.getElementById('cash-amount')?.value) || 0
    const upi = Number(document.getElementById('upi-amount')?.value) || 0
    if (Math.abs((cash + upi) - total) > 0.009) { showPayErrorPublic('Cash + UPI must equal total'); paidConfirmedPublic = false; return }
  }
  paidConfirmedPublic = true
  const paidStatus = document.getElementById('paid-status')
  if (paidStatus) paidStatus.style.display = 'inline'
  // lock inputs and radios
  const radios = Array.from(document.querySelectorAll('input[name="paymentMode"]'))
  radios.forEach((r) => r.disabled = true)
  if (document.getElementById('cash-amount')) document.getElementById('cash-amount').disabled = true
  if (document.getElementById('upi-amount')) document.getElementById('upi-amount').disabled = true
  enableGeneratePublic()
}

function resetPaidState(preserve = false) { paidConfirmedPublic = false; const paidStatus = document.getElementById('paid-status'); if (paidStatus && !preserve) paidStatus.style.display = 'none'; disableGeneratePublic() }
function enableGeneratePublic() { const b = document.getElementById('submit-btn'); if (b) b.disabled = false }
function disableGeneratePublic() { const b = document.getElementById('submit-btn'); if (b) b.disabled = true }
function showPayErrorPublic(msg) { const el = document.getElementById('pay-error'); if (el) { el.textContent = msg; el.style.display = 'block' } }
function clearPayErrorPublic() { const el = document.getElementById('pay-error'); if (el) { el.textContent = ''; el.style.display = 'none' } }

function updateTotals() {
  let total = 0

  qsa('.qty-input').forEach((input) => {
    const code = input.dataset.code || ''
    const price = Number(input.dataset.price) || 0
    const qty = Math.max(0, Number(input.value) || 0)
    const subtotal = qty * price

    const subEl = document.querySelector(`[data-subtotal="${code}"]`)
    if (subEl) subEl.textContent = fmt(subtotal)

    total += subtotal
  })

  const totalEl = document.getElementById('total')
  if (totalEl) totalEl.textContent = fmt(total)
}



// --- Success page (printable ticket) rendering ---
function initCounterSuccessPage() {
  const params = new URLSearchParams(window.location.search)
  const ticketId = params.get('ticketId')
  const errorMessage = document.getElementById('errorMessage')

  if (!ticketId) {
    showError('Ticket ID is missing in the URL.', errorMessage)
    return
  }

  fetchTicket(ticketId, errorMessage)
}

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
    .replace(/'/g, '&#039;')
}
