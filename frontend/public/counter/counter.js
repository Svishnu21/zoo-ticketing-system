const CATEGORY_ORDER = ['Entry Tickets', 'Parking', 'Transport', 'Camera / Add-ons'];

const TICKET_TYPES = [
  { id: 'adultEntry', name: 'Adult (12+ yrs)', detail: 'Standard entry ticket', price: 50, category: 'Entry Tickets' },
  { id: 'childEntry', name: 'Child (5-12 yrs)', detail: 'Kids between 5-12 years', price: 10, category: 'Entry Tickets' },
  { id: 'childBelow5', name: 'Child (below 5)', detail: 'Free – count for records', price: 0, category: 'Entry Tickets' },
  { id: 'differentlyAbled', name: 'Differently Abled', detail: 'Accessible entry', price: 0, category: 'Entry Tickets' },

  { id: 'parkingLMV', name: 'Parking - 4 Wheeler (LMV)', price: 50, category: 'Parking' },
  { id: 'parkingHMV', name: 'Parking - 6 Wheeler (HMV)', price: 100, category: 'Parking' },
  { id: 'parkingTwoThree', name: 'Parking - 2 & 3 Wheeler', price: 20, category: 'Parking' },

  { id: 'batteryAdult', name: 'Battery Vehicle - Adult', price: 50, category: 'Transport' },
  { id: 'batteryChild', name: 'Battery Vehicle - Child', price: 30, category: 'Transport' },

  { id: 'videoCamera', name: 'Video Camera', detail: 'Does not include commercial shoots', price: 150, category: 'Camera / Add-ons' },
];

const DEFAULT_USER = { username: 'counter', password: 'counter@123' };
const SESSION_KEY = 'counter_session';
const LAST_TICKET_KEY = 'counter_last_ticket';
const TICKET_LOG_KEY = 'counter_ticket_log';

const qs = (sel) => document.querySelector(sel);
const qsa = (sel) => Array.from(document.querySelectorAll(sel));

function saveSession() { localStorage.setItem(SESSION_KEY, 'true'); }
function hasSession() { return localStorage.getItem(SESSION_KEY) === 'true'; }
function clearSession() { localStorage.removeItem(SESSION_KEY); }

function saveLastTicket(payload) {
  localStorage.setItem(LAST_TICKET_KEY, JSON.stringify(payload));
}

function getLastTicket() {
  const raw = localStorage.getItem(LAST_TICKET_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

function loadTicketLog() {
  const raw = localStorage.getItem(TICKET_LOG_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveTicketLog(entries) {
  localStorage.setItem(TICKET_LOG_KEY, JSON.stringify(entries));
}

function appendTicketToLog(ticket) {
  const log = loadTicketLog();
  log.push(ticket);
  saveTicketLog(log);
}

function toISODate(ms) {
  return new Date(ms).toISOString().slice(0, 10);
}

function formatTime(ms) {
  return new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function fmtCurrency(val) { return `₹ ${val.toFixed(2)}`; }

function requireAuth(target = 'login.html') {
  if (!hasSession()) {
    window.location.href = target;
  }
}

function handleLogin() {
  const form = qs('#login-form');
  const error = qs('#login-error');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const username = form.username.value.trim();
    const password = form.password.value.trim();

    if (username === DEFAULT_USER.username && password === DEFAULT_USER.password) {
      saveSession();
      error.textContent = '';
      window.location.href = 'issue.html';
    } else {
      error.textContent = 'Invalid credentials';
      form.classList.remove('shake');
      void form.offsetWidth;
      form.classList.add('shake');
    }
  });
}

function buildTableRows() {
  const container = qs('#ticket-rows');
  if (!container) return [];
  container.innerHTML = '';

  const inputs = [];
  CATEGORY_ORDER.forEach((category) => {
    const items = TICKET_TYPES.filter((item) => item.category === category);
    if (!items.length) return;

    const header = document.createElement('div');
    header.className = 'category-row';
    header.textContent = category;
    container.appendChild(header);

    items.forEach((t) => {
      const row = document.createElement('div');
      row.className = 'table-row';
      row.innerHTML = `
        <div>
          <div class="item-title">${t.name}</div>
          ${t.detail ? `<p class="muted small">${t.detail}</p>` : ''}
        </div>
          <div class="muted">${fmtCurrency(t.price)}</div>
          <div><input type="number" min="0" value="" data-id="${t.id}" class="qty-input" inputmode="numeric" pattern="[0-9]*"></div>
        <div class="amount" data-amount="${t.id}">${fmtCurrency(0)}</div>
      `;
      container.appendChild(row);
      const input = row.querySelector('input');
      if (input) inputs.push(input);
    });
  });

  return inputs;
}

function computeTotals() {
  const quantities = qsa('.qty-input').map((input) => {
    const id = input.dataset.id;
    const qty = Math.max(0, Number(input.value) || 0);
    const type = TICKET_TYPES.find((t) => t.id === id);
    return { id, qty, price: type?.price ?? 0, subtotal: qty * (type?.price ?? 0) };
  });

  let total = quantities.reduce((acc, x) => acc + x.subtotal, 0);
  total = Math.round(total * 100) / 100;

  quantities.forEach((q) => {
    const amtEl = qs(`[data-amount="${q.id}"]`);
    if (amtEl) amtEl.textContent = fmtCurrency(q.subtotal);
  });

  const totalEl = qs('#total');
  const netEl = qs('#net');
  if (totalEl) totalEl.textContent = fmtCurrency(total);
  if (netEl) netEl.textContent = fmtCurrency(total);

  return { quantities, total };
}

function renderLastTicket(ticket) {
  const wrap = qs('#ticket');
  if (!wrap) return;
  if (!ticket) {
    // clear display to defaults
    qs('#ticket-id').textContent = '---';
    qs('#ticket-date').textContent = '';
    qs('#visit-date').textContent = '';
    qs('#ticket-total').textContent = fmtCurrency(0);
    qs('#ticket-payment').textContent = '--';
    qs('#ticket-qr').textContent = 'QR CODE';
    qs('#ticket-source').textContent = 'COUNTER';
    const body = qs('#ticket-body');
    if (body) body.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--muted);">No ticket issued yet</td></tr>';
    return;
  }
  qs('#ticket-id').textContent = ticket.bookingId;
  qs('#ticket-date').textContent = new Date(ticket.issuedAt).toLocaleString();
  qs('#visit-date').textContent = ticket.visitDate || new Date(ticket.issuedAt).toLocaleDateString();
  qs('#ticket-total').textContent = fmtCurrency(ticket.total);
  qs('#ticket-payment').textContent = ticket.paymentDisplay;
  qs('#ticket-qr').textContent = ticket.qrToken;
  qs('#ticket-source').textContent = ticket.source || 'COUNTER';

  const body = qs('#ticket-body');
  body.innerHTML = '';
  ticket.lines.forEach((line) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${line.name}</td>
      <td class="qty">${line.qty}</td>
      <td class="price">${fmtCurrency(line.price)}</td>
      <td class="amount">${fmtCurrency(line.subtotal)}</td>
    `;
    body.appendChild(tr);
  });
}

function renderTodayTickets() {
  const body = qs('#today-tickets-body');
  if (!body) return;
  const log = loadTicketLog();
  const todayISO = toISODate(Date.now());
  const rows = log
    .filter((ticket) => (ticket.source || 'COUNTER') === 'COUNTER' && toISODate(ticket.issuedAt) === todayISO)
    .sort((a, b) => b.issuedAt - a.issuedAt)
    .slice(0, 20);

  if (!rows.length) {
    body.innerHTML = '<tr><td colspan="7" class="empty">No counter tickets issued yet today.</td></tr>';
    return;
  }

  body.innerHTML = rows
    .map((ticket) => `
      <tr>
        <td>${ticket.bookingId}</td>
        <td>${formatTime(ticket.issuedAt)}</td>
        <td class="right">${fmtCurrency(ticket.total)}</td>
        <td>${(ticket.paymentMode || '--').toString().toUpperCase()}</td>
        <td>${ticket.issuedBy || 'Counter Staff'}</td>
        <td>${ticket.entryStatus || 'Not Entered'}</td>
        <td class="log-actions">
          <button data-action="view" data-id="${ticket.bookingId}" class="btn ghost small">View</button>
          <button data-action="reprint" data-id="${ticket.bookingId}" class="btn ghost small">Reprint</button>
        </td>
      </tr>
    `)
    .join('');
}

function renderHistoryTickets() {
  const body = qs('#history-body');
  if (!body) return;
  const dateInput = qs('#history-date');
  const modeSelect = qs('#history-mode');
  const targetDate = dateInput?.value || '';
  const mode = modeSelect?.value || 'all';

  let rows = loadTicketLog().filter((ticket) => (ticket.source || 'COUNTER') === 'COUNTER');
  if (targetDate) rows = rows.filter((ticket) => toISODate(ticket.issuedAt) === targetDate);
  if (mode !== 'all') rows = rows.filter((ticket) => ticket.paymentMode === mode);

  rows.sort((a, b) => b.issuedAt - a.issuedAt);

  if (!rows.length) {
    body.innerHTML = '<tr><td colspan="6" class="empty">No counter tickets for the selected filters.</td></tr>';
    return;
  }

  body.innerHTML = rows
    .map((ticket) => `
      <tr>
        <td>${ticket.bookingId}</td>
        <td>${new Date(ticket.issuedAt).toLocaleString()}</td>
        <td class="right">${fmtCurrency(ticket.total)}</td>
        <td>${(ticket.paymentMode || '--').toString().toUpperCase()}</td>
        <td>${ticket.entryStatus || 'Not Entered'}</td>
        <td class="log-actions">
          <button data-action="view" data-id="${ticket.bookingId}" class="btn ghost small">View</button>
          <button data-action="reprint" data-id="${ticket.bookingId}" class="btn ghost small">Reprint</button>
        </td>
      </tr>
    `)
    .join('');
}

function findTicketById(id) {
  return loadTicketLog().find((ticket) => ticket.bookingId === id);
}

// Removed demo seeding helper per UX request. Use the History button to view persisted logs.

function openTicketModal(ticket) {
  const modal = qs('#ticket-modal');
  if (!modal || !ticket) return;
  const idEl = qs('[data-modal-id]');
  if (idEl) idEl.textContent = ticket.bookingId;
  const issuedEl = qs('[data-modal-issued]');
  if (issuedEl) issuedEl.textContent = new Date(ticket.issuedAt).toLocaleString();
  const paymentEl = qs('[data-modal-payment]');
  if (paymentEl) paymentEl.textContent = ticket.paymentDisplay;
  const totalEl = qs('[data-modal-total]');
  if (totalEl) totalEl.textContent = fmtCurrency(ticket.total);
  const statusEl = qs('[data-modal-status]');
  if (statusEl) statusEl.textContent = ticket.entryStatus || 'Not Entered';
  const sourceEl = qs('[data-modal-source]');
  if (sourceEl) sourceEl.textContent = ticket.issuedBy || 'Counter Staff';

  const body = qs('#modal-ticket-body');
  if (body) {
    body.innerHTML = ticket.lines && ticket.lines.length
      ? ticket.lines
          .map(
            (line) => `
              <tr>
                <td>${line.name}</td>
                <td class="qty">${line.qty}</td>
                <td class="price">${fmtCurrency(line.price)}</td>
                <td class="amount">${fmtCurrency(line.subtotal)}</td>
              </tr>
            `,
          )
          .join('')
      : '<tr><td colspan="4" class="empty">No line items available</td></tr>';
  }

  const qrBox = qs('#modal-qr');
  if (qrBox) qrBox.textContent = ticket.qrToken;

  modal.removeAttribute('hidden');
  modal.classList.add('open');
}

function closeTicketModal() {
  const modal = qs('#ticket-modal');
  if (!modal) return;
  modal.setAttribute('hidden', 'true');
  modal.classList.remove('open');
}

function generateBookingId() {
  const stamp = Date.now().toString(36).slice(-6).toUpperCase();
  const rand = Math.floor(Math.random() * 899 + 100);
  return `CNT-${stamp}-${rand}`;
}

function generateQrToken(bookingId, total) {
  const payload = { bookingId, total, ts: Date.now(), mode: 'COUNTER' };
  return btoa(JSON.stringify(payload));
}

function disableInputs(disabled) {
  const selectors = ['.qty-input', '#payment-mode', '#cash-amount', '#upi-amount', '#reference', '#pay-form button[type="submit"]'];
  selectors.forEach((sel) => {
    qsa(sel).forEach((el) => {
      if (!el) return;
      el.disabled = disabled;
    });
  });
}

function resetForm() {
  qsa('.qty-input').forEach((input) => { input.value = ''; });
  qs('#payment-mode').value = 'cash';
  const cash = qs('#cash-amount');
  const upi = qs('#upi-amount');
  const reference = qs('#reference');
  if (cash) cash.value = '';
  if (upi) upi.value = '';
  if (reference) reference.value = '';
  computeTotals();
  disableInputs(false);
}

function initIssuePage() {
  requireAuth();
  const qtyInputs = buildTableRows();
  qtyInputs.forEach((input) => {
    input.addEventListener('input', computeTotals);
  });
  computeTotals();

  const last = getLastTicket();
  renderLastTicket(last);

  const historyDateInput = qs('#history-date');
  if (historyDateInput && !historyDateInput.value) historyDateInput.value = toISODate(Date.now());
  const historyModeSelect = qs('#history-mode');
  if (historyModeSelect) historyModeSelect.value = historyModeSelect.value || 'all';

  renderTodayTickets();
  renderHistoryTickets();

  if (historyDateInput) historyDateInput.addEventListener('change', renderHistoryTickets);
  if (historyModeSelect) historyModeSelect.addEventListener('change', renderHistoryTickets);

  const handleLogClick = (event) => {
    const target = event.target.closest('button[data-action]');
    if (!target) return;
    const { action, id } = target.dataset;
    if (!action || !id) return;
    const ticket = findTicketById(id);
    if (!ticket) return;
    if (action === 'view') {
      openTicketModal(ticket);
    } else if (action === 'reprint') {
      renderLastTicket(ticket);
      window.print();
    }
  };

  const todayTable = qs('#today-tickets-body');
  const historyTable = qs('#history-body');
  if (todayTable) todayTable.addEventListener('click', handleLogClick);
  if (historyTable) historyTable.addEventListener('click', handleLogClick);

  const modalClose = qs('#modal-close');
  if (modalClose) modalClose.addEventListener('click', closeTicketModal);
  const modal = qs('#ticket-modal');
  if (modal) {
    modal.addEventListener('click', (event) => {
      if (event.target === modal) closeTicketModal();
    });
  }

  // History quick-access: scroll to and highlight the history panel
  const showHistoryBtn = qs('#show-history');
  if (showHistoryBtn) showHistoryBtn.addEventListener('click', () => {
    const historyPanel = qs('.history-panel');
    const historyDateInput = qs('#history-date');
    if (historyDateInput && !historyDateInput.value) historyDateInput.value = toISODate(Date.now());
    renderHistoryTickets();
    if (historyPanel) {
      historyPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
      historyPanel.classList.add('highlight');
      setTimeout(() => historyPanel.classList.remove('highlight'), 1200);
    }
  });

  const form = qs('#pay-form');
  const error = qs('#pay-error');
  const cashInput = qs('#cash-amount');
  const upiInput = qs('#upi-amount');
  const refInput = qs('#reference');

  if (!form || !error) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const { quantities, total } = computeTotals();
    if (total <= 0) {
      error.textContent = 'Add at least one ticket.';
      return;
    }

    const paymentMode = qs('#payment-mode').value;
    const cashAmt = Number(cashInput?.value || 0);
    const upiAmt = Number(upiInput?.value || 0);
    const reference = (refInput?.value || '').trim();

    if (paymentMode === 'cash' && cashAmt < total) {
      error.textContent = 'Cash received is less than total.';
      return;
    }

    if ((paymentMode === 'card' || paymentMode === 'upi') && reference.length < 4) {
      error.textContent = 'Add approval/UTR reference.';
      return;
    }

    if (paymentMode === 'upi' && upiAmt < total) {
      error.textContent = 'UPI amount should cover the total.';
      return;
    }

    if (paymentMode === 'split') {
      if (cashAmt <= 0 || upiAmt <= 0) {
        error.textContent = 'Split requires both cash and UPI amounts.';
        return;
      }
      if (cashAmt + upiAmt < total) {
        error.textContent = 'Cash + UPI must cover the total amount.';
        return;
      }
      if (reference.length < 4) {
        error.textContent = 'Add UPI reference for split payment.';
        return;
      }
    }

    const lines = quantities.filter((q) => q.qty > 0).map((q) => ({
      id: q.id,
      name: TICKET_TYPES.find((t) => t.id === q.id)?.name || q.id,
      qty: q.qty,
      price: q.price,
      subtotal: q.subtotal,
    }));

    const bookingId = generateBookingId();
    const qrToken = generateQrToken(bookingId, total);

    let paymentDisplay = paymentMode.toUpperCase();
    if (paymentMode === 'split') {
      paymentDisplay = `Cash ₹${cashAmt.toFixed(2)} + UPI ₹${upiAmt.toFixed(2)} (Ref: ${reference || '-'})`;
    } else if (paymentMode === 'cash') {
      paymentDisplay = `Cash ₹${cashAmt.toFixed(2)}`;
    } else if (paymentMode === 'upi' || paymentMode === 'card') {
      paymentDisplay = `${paymentMode.toUpperCase()} ${reference ? `(Ref: ${reference})` : ''}`.trim();
    }

    const ticket = {
      bookingId,
      total,
      paymentMode,
      paymentDisplay,
      paymentParts: { cash: cashAmt, upi: upiAmt, reference },
      lines,
      issuedAt: Date.now(),
      qrToken,
      visitDate: new Date().toLocaleDateString(),
      source: 'COUNTER',
      issuedBy: DEFAULT_USER.username,
      entryStatus: 'Not Entered',
    };

    saveLastTicket(ticket);
    appendTicketToLog(ticket);
    renderTodayTickets();
    renderHistoryTickets();
    renderLastTicket(ticket);
    error.textContent = '';
    disableInputs(true);
  });

  // removed old New Sale button; new booking button below handles reset

  // New Booking button under ticket panel (same as new sale)
  const newBookingBtn = qs('#new-booking');
  if (newBookingBtn) newBookingBtn.addEventListener('click', () => {
    error.textContent = '';
    resetForm();
    renderLastTicket(null);
  });

  // Print ticket button
  const printBtn = qs('#print-ticket');
  if (printBtn) printBtn.addEventListener('click', () => {
    // ensure only relevant content prints via CSS; trigger print
    window.print();
  });

  qs('#logout').addEventListener('click', () => {
    clearSession();
    window.location.href = 'login.html';
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const page = document.body.dataset.page;
  if (page === 'login') handleLogin();
  if (page === 'issue') initIssuePage();
});
