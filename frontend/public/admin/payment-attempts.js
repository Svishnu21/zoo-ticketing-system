// Admin "Payment Attempts" page — audit view of online payment attempts with safe recovery actions.
// Depends on helpers defined in admin-script.js (adminFetch, adminApiBase, guardAdminPage, escapeHtml,
// formatINR, formatDateTime, logoutAdmin, applyRoleVisibility).
;(function initPaymentAttemptsPage() {
	const STATUS_LABELS = {
		CONFIRMED: 'Confirmed',
		PENDING: 'Pending',
		INITIATION_FAILED: 'Initiation Failed',
		FAILED: 'Failed',
		RECOVERY_REQUIRED: 'Recovery Required',
	}
	const STATUS_PILL = {
		CONFIRMED: 'success',
		PENDING: 'warning',
		INITIATION_FAILED: 'danger',
		FAILED: 'danger',
		RECOVERY_REQUIRED: 'warning',
	}

	const state = { page: 1, hasNext: false, busy: false }
	const $ = (id) => document.getElementById(id)

	const buildQuery = () => {
		const params = new URLSearchParams()
		const status = $('attemptStatusFilter')?.value
		const from = $('attemptFromFilter')?.value
		const to = $('attemptToFilter')?.value
		const search = $('attemptSearchInput')?.value?.trim()
		if (status && status !== 'ALL') params.set('status', status)
		if (from) params.set('from', from)
		if (to) params.set('to', to)
		if (search) params.set('search', search)
		params.set('page', String(state.page))
		return params.toString()
	}

	const renderSummary = (summary = {}) => {
		Object.keys(STATUS_LABELS).forEach((status) => {
			const entry = summary[status] || { count: 0, amount: 0 }
			const countEl = $(`attemptCount${status}`)
			if (countEl) countEl.textContent = String(entry.count || 0)
			const amountEl = $(`attemptAmount${status}`)
			if (amountEl && entry.count) amountEl.textContent = `${formatINR(entry.amount || 0)} ${status === 'CONFIRMED' ? 'collected' : 'not counted'}`
		})
	}

	const renderRows = (rows) => {
		const body = $('attemptTableBody')
		if (!body) return
		if (!rows.length) {
			body.innerHTML = '<tr><td colspan="12">No payment attempts for the selected filters.</td></tr>'
			return
		}
		body.innerHTML = rows
			.map((row) => {
				const actions = []
				if (row.canRecoverTicket) {
					actions.push(`<button class="link" data-action="recover" data-id="${escapeHtml(row.bookingId)}">Recover ticket</button>`)
				}
				if (row.canVerify) {
					actions.push(`<button class="link" data-action="verify" data-id="${escapeHtml(row.bookingId)}">Verify with gateway</button>`)
				}
				if (row.status === 'CONFIRMED' && row.ticketId) {
					actions.push(`<a class="link" href="/admin/booking/${encodeURIComponent(row.ticketId)}">View ticket</a>`)
				}
				return `
				<tr>
					<td class="font-mono">${escapeHtml(row.bookingId)}</td>
					<td><span class="status-pill ${STATUS_PILL[row.status] || 'info'}">${escapeHtml(STATUS_LABELS[row.status] || row.status || '—')}</span></td>
					<td>${escapeHtml(row.visitorName || '—')}</td>
					<td>${escapeHtml(row.visitorMobile || '—')}</td>
					<td>${escapeHtml(row.visitDate || '—')}</td>
					<td>${row.attemptedAt ? formatDateTime(row.attemptedAt) : '—'}</td>
					<td>${escapeHtml(String(row.ticketCount ?? '—'))}</td>
					<td>${formatINR(row.totalAmount || 0)}</td>
					<td class="font-mono">${escapeHtml(row.transactionId || '—')}</td>
					<td class="font-mono">${escapeHtml(row.gatewayPaymentId || '—')}</td>
					<td title="${escapeHtml(row.statusReason || '')}">${escapeHtml((row.statusReason || '').slice(0, 80) || '—')}</td>
					<td class="actions">${actions.join(' ') || '—'}</td>
				</tr>`
			})
			.join('')
	}

	const load = async () => {
		const body = $('attemptTableBody')
		if (body) body.innerHTML = '<tr><td colspan="12">Loading payment attempts...</td></tr>'
		try {
			const payload = await adminFetch(`${adminApiBase}/payment-attempts?${buildQuery()}`)
			renderSummary(payload?.summary)
			renderRows(Array.isArray(payload?.data) ? payload.data : [])
			state.hasNext = Boolean(payload?.pagination?.hasNext)
			const total = payload?.pagination?.total || 0
			const limit = payload?.pagination?.limit || 20
			const label = $('attemptPageLabel')
			if (label) label.textContent = `Page ${state.page} of ${Math.max(1, Math.ceil(total / limit))}`
			if ($('attemptPrevBtn')) $('attemptPrevBtn').disabled = state.page <= 1
			if ($('attemptNextBtn')) $('attemptNextBtn').disabled = !state.hasNext
		} catch (error) {
			if (body) body.innerHTML = `<tr><td colspan="12">${escapeHtml(error?.message || 'Unable to load payment attempts.')}</td></tr>`
		}
	}

	const runAction = async (action, bookingId) => {
		if (state.busy) return
		const message = $('attemptActionMessage')
		const confirmText = action === 'recover'
			? `Issue the missing ticket for ${bookingId}? The payment is already verified; the customer is not charged again.`
			: `Check the real payment status of ${bookingId} with Easebuzz now?`
		if (!window.confirm(confirmText)) return

		state.busy = true
		if (message) message.textContent = 'Working…'
		try {
			const path = action === 'recover' ? 'recover-ticket' : 'verify'
			const result = await adminFetch(`${adminApiBase}/payment-attempts/${encodeURIComponent(bookingId)}/${path}`, { method: 'POST' })
			if (message) {
				message.textContent = action === 'recover'
					? `Ticket ${result?.ticketId || ''} issued for ${bookingId}.`
					: `Gateway status: ${result?.gatewayStatus || 'unknown'} — booking is now ${STATUS_LABELS[result?.bookingStatus] || result?.bookingStatus || 'unchanged'}.`
			}
			await load()
		} catch (error) {
			if (message) message.textContent = error?.message || 'Action failed.'
		} finally {
			state.busy = false
		}
	}

	document.addEventListener('DOMContentLoaded', () => {
		if (typeof guardAdminPage === 'function') guardAdminPage()
		if (typeof applyRoleVisibility === 'function') applyRoleVisibility()

		document.querySelectorAll('.nav-link[data-href]').forEach((btn) => {
			btn.addEventListener('click', () => {
				window.location.href = btn.dataset.href
			})
		})
		$('logoutBtn')?.addEventListener('click', () => logoutAdmin({ redirect: true }))

		const reload = () => {
			state.page = 1
			load()
		}
		$('attemptStatusFilter')?.addEventListener('change', reload)
		$('attemptFromFilter')?.addEventListener('change', reload)
		$('attemptToFilter')?.addEventListener('change', reload)
		let searchTimer
		$('attemptSearchInput')?.addEventListener('input', () => {
			clearTimeout(searchTimer)
			searchTimer = setTimeout(reload, 300)
		})
		$('attemptPrevBtn')?.addEventListener('click', () => {
			if (state.page > 1) {
				state.page -= 1
				load()
			}
		})
		$('attemptNextBtn')?.addEventListener('click', () => {
			if (state.hasNext) {
				state.page += 1
				load()
			}
		})
		$('attemptTableBody')?.addEventListener('click', (event) => {
			const button = event.target.closest('button[data-action]')
			if (button) runAction(button.dataset.action, button.dataset.id)
		})

		load()
	})
})()
