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

const selectedItems = {}
const fmt = (val = 0) => `Rs ${Number(val || 0).toFixed(2)}`
const qsa = (sel) => Array.from(document.querySelectorAll(sel))

document.addEventListener('DOMContentLoaded', () => {
  console.log('✅ DOM ready – loading tickets')
  loadTickets()
})

async function loadTickets() {
  // Render from static ticket list so free items are always visible
  renderTickets()
  qsa('.qty-input').forEach((input) => input.addEventListener('input', (e) => updateQty(e.target)))
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
      <td class="right">${fmt(0)} <span id="sub-${ticket.code}" style="display:none"></span></td>
    `
    tbody.appendChild(tr)
    selectedItems[ticket.code] = 0
  })
}

function updateQty(input) {
  const code = input.dataset.code
  const price = Number(input.dataset.price) || 0
  const qty = Math.max(0, Number(input.value) || 0)
  selectedItems[code] = qty
  const subEl = document.getElementById(`sub-${code}`)
  if (subEl) subEl.textContent = fmt(qty * price)
  recalcTotal()
}

function recalcTotal() {
  let total = 0
  ALL_TICKETS.forEach((t) => {
    const qty = Number(selectedItems[t.code] || 0)
    total += qty * (Number(t.price) || 0)
  })
  const totalEl = document.getElementById('total')
  if (totalEl) totalEl.textContent = fmt(total)
  resetPaidState()
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

  // ensure PAID button exists
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

  // mode buttons
  const buttons = Array.from(modeContainer.querySelectorAll('button'))
  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      buttons.forEach((b) => b.classList.remove('active'))
      btn.classList.add('active')
      const mode = btn.dataset.mode
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

  // hide split inputs initially
  if (cashInput) cashInput.style.display = 'none'
  if (upiInput) upiInput.style.display = 'none'

  if (cashInput) cashInput.addEventListener('input', () => resetPaidState())
  if (upiInput) upiInput.addEventListener('input', () => resetPaidState())

  // reset generate button
  disableGeneratePublic()

  // form submit handler
  form.addEventListener('submit', (e) => {
    e.preventDefault()
    if (!paidConfirmedPublic) {
      showPayErrorPublic('Click PAID before generating ticket')
      return
    }
    // assemble payload similar to dist
    const total = Number((document.getElementById('total')?.textContent || '0').replace(/[^0-9.-]+/g, '')) || 0
    const modeBtn = document.querySelector('.mode-buttons .active')
    const paymentMode = modeBtn?.dataset?.mode || null
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
  const modeBtn = document.querySelector('.mode-buttons .active')
  const paymentMode = modeBtn?.dataset?.mode || null
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
  // Reset PAID state when totals change
  resetPaidState()
}
