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
    keys: ['adultEntry', 'childEntry', 'kidZoneEntry', 'childBelow5', 'differentlyAbled'],
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
  { code: 'zoo_kid_zone', label: 'Kid Zone (Below 6 Years)', price: 20, category: 'ENTRY' },
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
const COUNTER_LOGIN_PATH = '/counter/login.html'

const clearCounterSession = () => {
  sessionStorage.removeItem('counterToken')
  sessionStorage.removeItem('counterRole')
}

const redirectToCounterLogin = () => {
  clearCounterSession()
  window.location.href = COUNTER_LOGIN_PATH
}

const withCounterAuthHeaders = (base = {}) => {
  const headers = { ...base }
  const token = sessionStorage.getItem('counterToken')
  if (token) headers.Authorization = `Bearer ${token}`
  return headers
}

async function counterFetch(path, options = {}) {
  const response = await fetch(path, { ...options, headers: withCounterAuthHeaders(options.headers || {}) })
  if (response.status === 401 || response.status === 403) {
    redirectToCounterLogin()
    throw new Error('Counter session expired.')
  }
  return response
}

async function counterFetchJson(path, options = {}) {
  const response = await counterFetch(path, options)
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(data?.message || 'Request failed.')
    error.status = response.status
    error.payload = data
    throw error
  }
  return data
}

const fmt = (val = 0) => `Rs ${Number(val || 0).toFixed(2)}`
const qsa = (sel) => Array.from(document.querySelectorAll(sel))

const todayParts = () => {
  const d = new Date()
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  return { iso: `${yyyy}-${mm}-${dd}`, display: `${dd}-${mm}-${yyyy}` }
}

const parseTotalAmount = () => Number((document.getElementById('total')?.textContent || '0').replace(/[^0-9.-]+/g, '')) || 0

document.addEventListener('DOMContentLoaded', () => {
  attachLogoutHandler()
  const page = document.body?.dataset?.page || ''
  if (page === 'issue') {
    guardCounter()
    console.log('✅ Counter issue page ready')
    loadTickets()
    return
  }

  if (page === 'history') {
    guardCounter()
    console.log('✅ Counter history page ready')
    loadRecentTickets()
    loadHistoryTable()
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
    const email = (formData.get('username') || '').toString().trim()
    const password = (formData.get('password') || '').toString().trim()
    if (!email || !password) {
      if (errEl) errEl.textContent = 'Enter username and password.'
      return
    }

    try {
      const resp = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await resp.json().catch(() => ({}))
      if (!resp.ok) throw new Error(data?.message || 'Login failed')
      if (data.role !== 'COUNTER') throw new Error('Role not permitted for counter console')

      sessionStorage.setItem('counterToken', data.token)
      sessionStorage.setItem('counterRole', data.role)
      window.location.href = '/counter/issue.html'
    } catch (err) {
      if (errEl) errEl.textContent = err?.message || 'Login failed'
    }
  })
}

function guardCounter() {
  const role = sessionStorage.getItem('counterRole')
  const token = sessionStorage.getItem('counterToken')
  if (!role || !token) {
    redirectToCounterLogin()
    return
  }
  if (role !== 'COUNTER') {
    redirectToCounterLogin()
  }
}

async function loadTickets() {
  renderTickets()
  qsa('.qty-input').forEach((input) => input.addEventListener('input', updateTotals))
  updateTotals()
  setVisitDateToday()
  wirePaymentUI()
  loadRecentTickets()
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

async function loadRecentTickets() {
  const list = document.getElementById('recent-list')
  if (!list) return
  try {
    const data = await counterFetchJson('/api/counter/recent')
    const tickets = Array.isArray(data) ? data : Array.isArray(data?.tickets) ? data.tickets : []
    list.innerHTML = tickets.slice(0, 5).map(ticket => {
      const entered = Boolean(ticket.qrUsed)
      const statusText = entered ? 'ENTERED' : 'NOT ENTERED'
      const statusClass = entered ? 'badge-entered' : 'badge-not-entered'
      return `
        <li class="recent-card">
          <div class="recent-top">
            <div class="recent-id">${ticket.ticketId}</div>
            <div class="recent-meta">${fmtDateTime(ticket.issueDate)}</div>
          </div>
          <div class="recent-actions">
            <span class="status-badge ${statusClass}">${statusText}</span>
            <button class="reprint-btn" onclick="reprintTicket('${ticket.ticketId}')">Reprint</button>
          </div>
        </li>
      `
    }).join('')
  } catch (err) {
    console.warn('Failed to load recent tickets', err)
  }
}

async function loadHistoryTable() {
  const tbody = document.getElementById('history-rows')
  if (!tbody) return
  try {
    const data = await counterFetchJson('/api/counter/recent')
    const tickets = Array.isArray(data) ? data : Array.isArray(data?.tickets) ? data.tickets : []

    const selectedMode = (document.getElementById('history-payment')?.value || 'ALL').toUpperCase()
    const selectedDate = document.getElementById('history-date')?.value || ''

    const filtered = tickets.filter((ticket) => {
      const modeOk = selectedMode === 'ALL' || (ticket.paymentMode || '').toUpperCase() === selectedMode
      if (!modeOk) return false
      if (!selectedDate) return true
      const issueIso = ticket.issueDate ? new Date(ticket.issueDate).toISOString().slice(0, 10) : ''
      return issueIso === selectedDate
    })

    tbody.innerHTML = filtered
      .map((ticket) => {
        const entered = Boolean(ticket.qrUsed)
        const statusText = entered ? 'ENTERED' : 'NOT ENTERED'
        const statusClass = entered ? 'badge-entered' : 'badge-not-entered'
        return `
          <tr>
            <td>${ticket.ticketId || ''}</td>
            <td>${fmtDateOnly(ticket.visitDate)}</td>
            <td>${fmtDateTime(ticket.issueDate)}</td>
            <td>${(ticket.paymentMode || '').toUpperCase()}</td>
            <td>${fmt(ticket.totalAmount)}</td>
            <td><span class="status-badge ${statusClass}">${statusText}</span></td>
          </tr>
        `
      })
      .join('')

    const dateInput = document.getElementById('history-date')
    const modeInput = document.getElementById('history-payment')
    if (dateInput && !dateInput._historyBound) {
      dateInput.addEventListener('change', loadHistoryTable)
      dateInput._historyBound = true
    }
    if (modeInput && !modeInput._historyBound) {
      modeInput.addEventListener('change', loadHistoryTable)
      modeInput._historyBound = true
    }
  } catch (err) {
    console.warn('Failed to load history tickets', err)
  }
}

function reprintTicket(ticketId) {
  window.open(`/counter/success.html?ticketId=${ticketId}`, '_blank')
}
// Expose for inline `onclick` handlers in static HTML
/* istanbul ignore next */
if (typeof window !== 'undefined') window.reprintTicket = reprintTicket

function setVisitDateToday() {
  const visitInput = document.getElementById('visit-date-input')
  const visitDisplay = document.getElementById('visit-date-display')
  const { iso, display } = todayParts()
  if (visitInput) visitInput.value = iso
  if (visitDisplay) visitDisplay.textContent = display
}

// Payment UI for public page
let paidConfirmedPublic = false
function wirePaymentUI() {
  const modeContainer = document.querySelector('.mode-buttons')
  const cashInput = document.getElementById('cash-amount')
  const upiInput = document.getElementById('upi-amount')
  const splitContainer = document.querySelector('.split-inputs')
  const form = document.getElementById('pay-form')
  const submitBtn = document.getElementById('submit-btn')
  const payError = document.getElementById('pay-error')

  if (!modeContainer || !form || !submitBtn) return

  // UPI field is always auto-calculated in split mode
  if (upiInput) upiInput.readOnly = true

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

  const setSplitVisibility = (mode) => {
    if (!splitContainer || !cashInput || !upiInput) return
    const showSplit = mode === 'SPLIT'
    splitContainer.style.display = showSplit ? 'flex' : 'none'
    cashInput.style.display = showSplit ? 'inline-block' : 'none'
    upiInput.style.display = showSplit ? 'inline-block' : 'none'
    if (showSplit) {
      cashInput.value = ''
      upiInput.value = ''
    }
  }

  const recomputeSplit = () => {
    const mode = document.querySelector('input[name="paymentMode"]:checked')?.value || ''
    if (mode !== 'SPLIT') {
      clearPayErrorPublic()
      if (paidConfirmedPublic && payError && payError.textContent) resetPaidState(true)
      return { valid: true }
    }

    const total = parseTotalAmount()
    const rawCash = cashInput?.value ?? ''
    if (!cashInput) return { valid: false }

    if (rawCash === '') {
      upiInput.value = ''
      showPayErrorPublic('Enter cash amount to auto-calc UPI')
      paidConfirmedPublic = false
      disableGeneratePublic()
      if (paidBtn) paidBtn.disabled = true
      return { valid: false }
    }

    const cash = Math.max(0, Number(rawCash) || 0)
    const clampedCash = Math.min(cash, total)
    if (Number.isNaN(cash)) {
      showPayErrorPublic('Enter a valid cash amount')
      paidConfirmedPublic = false
      disableGeneratePublic()
      if (paidBtn) paidBtn.disabled = true
      return { valid: false }
    }

    const remaining = Math.max(0, total - clampedCash)
    cashInput.value = clampedCash.toString()
    upiInput.value = remaining.toString()

    if (clampedCash > total) {
      showPayErrorPublic('Cash cannot exceed total amount')
      paidConfirmedPublic = false
      disableGeneratePublic()
      if (paidBtn) paidBtn.disabled = true
      return { valid: false }
    }

    const sumOk = Math.abs(clampedCash + remaining - total) < 0.009
    if (!sumOk) {
      showPayErrorPublic('Cash + UPI must equal total')
      paidConfirmedPublic = false
      disableGeneratePublic()
      if (paidBtn) paidBtn.disabled = true
      return { valid: false }
    }

    clearPayErrorPublic()
    if (paidBtn) paidBtn.disabled = false
    return { valid: true, cash: clampedCash, upi: remaining, total }
  }

  // radios for payment mode
  const radios = Array.from(modeContainer.querySelectorAll('input[name="paymentMode"]'))
  const paidBtn = document.getElementById('paid-btn')
  setSplitVisibility(document.querySelector('input[name="paymentMode"]:checked')?.value)
  radios.forEach((r) => {
    r.addEventListener('change', () => {
      const mode = document.querySelector('input[name="paymentMode"]:checked')?.value
      setSplitVisibility(mode)
      if (mode === 'CASH') {
        if (cashInput) cashInput.value = parseTotalAmount().toString()
        if (upiInput) upiInput.value = '0'
      } else if (mode === 'UPI') {
        if (cashInput) cashInput.value = '0'
        if (upiInput) upiInput.value = parseTotalAmount().toString()
      } else {
        if (cashInput) cashInput.value = ''
        if (upiInput) upiInput.value = ''
      }
      resetPaidState()
      recomputeSplit()
    })
  })

  // hide split inputs initially unless split selected
  const sel = document.querySelector('input[name="paymentMode"]:checked')
  if (sel && sel.value === 'SPLIT') {
    if (splitContainer) splitContainer.style.display = 'flex'
    if (cashInput) cashInput.style.display = 'inline-block'
    if (upiInput) upiInput.style.display = 'inline-block'
  } else {
    if (splitContainer) splitContainer.style.display = 'none'
    if (cashInput) cashInput.style.display = 'none'
    if (upiInput) upiInput.style.display = 'none'
  }

  if (cashInput) cashInput.addEventListener('input', () => { resetPaidState(); recomputeSplit() })
  // UPI is read-only; no listener needed

  recomputeSplit()

  // reset generate button until PAID
  disableGeneratePublic()

  // single submit handler enforcing PAID
  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    if (!paidConfirmedPublic) {
      showPayErrorPublic('Click PAID before generating ticket')
      return
    }
    const total = parseTotalAmount()
    const paymentMode = document.querySelector('input[name="paymentMode"]:checked')?.value || null
    const visitDate = document.getElementById('visit-date-input')?.value || null
    const splitValidation = paymentMode === 'SPLIT' ? recomputeSplit() : { valid: true }
    if (paymentMode === 'SPLIT' && !splitValidation.valid) return
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
      ...(visitDate ? { visitDate } : {}),
    }
    try {
      const response = await counterFetch('/api/counter/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) throw body
      const ticketId = body?.ticketId || body?.bookingId || body?.ticket?.ticketId
      if (!ticketId) {
        showPayErrorPublic('Ticket generated but ticketId missing')
        return
      }
      if (typeof loadRecentTickets === 'function') {
        try {
          loadRecentTickets()
        } catch (err) {
          console.warn('Failed to refresh recent tickets', err)
        }
      }
      window.location.href = `/counter/success.html?ticketId=${encodeURIComponent(ticketId)}`
    } catch (err) {
      console.error(err)
      const message = err?.message || err?.error || 'Failed to generate ticket'
      showPayErrorPublic(message)
    }
  })
}

function getItemsPayloadPublic() {
  return qsa('.qty-input')
    .map((input) => {
      const qty = Math.max(0, Number(input.value) || 0)
      return {
        itemCode: input.dataset.code,
        qty,
      }
    })
    // send only selected items (qty > 0)
    .filter((item) => item.qty > 0)
}

function onPaidClickPublic() {
  clearPayErrorPublic()
  const paymentMode = document.querySelector('input[name="paymentMode"]:checked')?.value || null
  if (!paymentMode) { showPayErrorPublic('Select a payment mode'); return }
  if (paymentMode === 'SPLIT' && !validateSplitAmounts().valid) return

  const total = parseTotalAmount()
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
function validateSplitAmounts() {
  const paymentMode = document.querySelector('input[name="paymentMode"]:checked')?.value || null
  const cashInput = document.getElementById('cash-amount')
  const upiInput = document.getElementById('upi-amount')
  const paidBtn = document.getElementById('paid-btn')

  if (!paidBtn) return { valid: false }

  if (paymentMode !== 'SPLIT') {
    paidBtn.disabled = false
    clearPayErrorPublic()
    return { valid: true }
  }

  const total = parseTotalAmount()
  const rawCash = cashInput?.value ?? ''

  if (rawCash === '') {
    if (upiInput) upiInput.value = ''
    showPayErrorPublic('Enter cash amount to auto-calc UPI')
    paidBtn.disabled = true
    paidConfirmedPublic = false
    return { valid: false }
  }

  const cash = Math.max(0, Number(rawCash) || 0)
  const clampedCash = Math.min(cash, total)
  const upi = Math.max(0, total - clampedCash)
  if (cashInput) cashInput.value = clampedCash.toString()
  if (upiInput) upiInput.value = upi.toString()

  if (clampedCash > total) {
    showPayErrorPublic('Cash cannot exceed total amount')
    paidBtn.disabled = true
    paidConfirmedPublic = false
    return { valid: false, cash: clampedCash, upi, total }
  }

  const sumOk = Math.abs(clampedCash + upi - total) < 0.009
  if (!sumOk) {
    showPayErrorPublic('Cash + UPI must equal total')
    paidBtn.disabled = true
    paidConfirmedPublic = false
    return { valid: false, cash: clampedCash, upi, total }
  }

  clearPayErrorPublic()
  paidBtn.disabled = false
  return { valid: true, cash: clampedCash, upi, total }
}
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

  validateSplitAmounts()
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
    const response = await counterFetch(`/api/counter/tickets/${encodeURIComponent(ticketId)}`)
    const data = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(data?.message || 'Unable to load ticket.')
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

function attachLogoutHandler() {
  const btn = document.getElementById('logout')
  if (!btn) return
  if (btn._logoutBound) return
  btn.addEventListener('click', (e) => {
    e.preventDefault()
    redirectToCounterLogin()
  })
  btn._logoutBound = true
}