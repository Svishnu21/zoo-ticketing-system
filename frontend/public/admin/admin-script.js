function adminAuthHeaders() {
	const token = sessionStorage.getItem('token') || localStorage.getItem('token')
	return token
		? {
			Authorization: `Bearer ${token}`,
			'Content-Type': 'application/json',
		}
		: { 'Content-Type': 'application/json' }
}

async function adminFetch(url, options = {}) {
	const opts = {
		...options,
		headers: {
			...adminAuthHeaders(),
			...(options.headers || {}),
		},
	}

	const res = await fetch(url, opts)

	if (!res.ok) {
		let message = 'Request failed'
		try {
			const data = await res.json()
			message = data?.message || message
		} catch (_err) {
			// ignore parse errors
		}
		console.error('[adminFetch] HTTP error', {
			url,
			status: res.status,
			statusText: res.statusText,
			message,
		})
		throw new Error(message)
	}

	return res.json()
}

const backendOrigin = window.location.origin.startsWith('http://localhost:5173')
	? 'http://localhost:5000'
	: window.location.origin
const adminApiBase = `${backendOrigin}/admin`
const userApiBase = `${backendOrigin}/api/users`
const today = new Date().toISOString().slice(0, 10)

const TARIFF_DISPLAY_ORDER = {
	zoo_adult: 1,
	zoo_child: 2,
	zoo_kid_zone: 3,
	zoo_child_free: 4,
	zoo_differently_abled: 5,
	parking_4w_lmv: 6,
	parking_4w_hmv: 7,
	parking_2w_3w: 8,
	battery_vehicle_adult: 9,
	battery_vehicle_child: 10,
	camera_video: 11,
}

const TICKET_BOXES = [
	{ code: 'zoo_adult', label: 'Entry - Adult', category: 'Entry' },
	{ code: 'zoo_child', label: 'Child (5 to 12 years)', category: 'Entry' },
	{ code: 'zoo_kid_zone', label: 'Kid Zone (Below 6 Years)', category: 'Entry' },
	{ code: 'zoo_child_free', label: 'Children (below 5)', category: 'Entry' },
	{ code: 'zoo_differently_abled', label: 'Differently Abled', category: 'Entry' },
	{ code: 'parking_4w_lmv', label: 'Parking - 4 Wheeler (LMV)', category: 'Parking' },
	{ code: 'parking_4w_hmv', label: 'Parking - 4 Wheeler (HMV)', category: 'Parking' },
	{ code: 'parking_2w_3w', label: 'Parking - 2 & 3 Wheeler', category: 'Parking' },
	{ code: 'battery_vehicle_adult', label: 'Battery Vehicle - Adult', category: 'Transport' },
	{ code: 'battery_vehicle_child', label: 'Battery Vehicle - Child (5-12 yrs)', category: 'Transport' },
	{ code: 'camera_video', label: 'Video Camera', category: 'Camera' },
]

const CATEGORY_ORDER = {
	zoo: 1,
	entry: 1,
	parking: 2,
	transport: 3,
	camera: 4,
}

const state = {
	bookings: [],
	bookingPagination: { page: 1, limit: 20, total: 0, hasNext: false },
	bookingFilters: { date: '', payment: 'all', entry: 'all', search: '' },
	counterTickets: [],
	counterPagination: { page: 1, limit: 100, total: 0, hasNext: false },
	counterDate: '',
	scannerLogs: [],
	adoptions: [],
	globalDate: '',
	analytics: {
		summary: null,
		ticketTypes: [],
		categories: [],
		sourceSplit: [],
		entries: null,
		scanlogs: null,
	},
}

// Lightweight dashboard initializer to kick analytics and overview without blocking other panels.
function setupDashboard() {
	try {
		console.debug('[admin] setupDashboard start')
		if (typeof setupAnalytics === 'function') setupAnalytics()
		if (typeof renderOverview === 'function') renderOverview()
	} catch (e) {
		console.error('[admin] setupDashboard error', e)
	}
}

// Normalize items strictly from stored DB array; do not infer from text or tariffs.
function normalizeTicketItems(record) {
	if (!record) return []
	if (Array.isArray(record.items) && record.items.length) {
		return record.items.map((it) => ({
			label: it.itemLabel || it.label || it.itemCode || it.category || 'Item',
			quantity: Number(it.quantity || 0),
			unitPrice: it.unitPrice ?? it.price ?? null,
			amount: it.amount ?? null,
		}))
	}
	return []
}

// Unified ticket preview for both online and counter-issued tickets (module scope).
async function openTicketPreview(ticketId, options = {}) {
	const previewModal = document.getElementById('ticketPreviewModal')
	const previewBody = document.getElementById('ticketPreviewBody')
	if (!previewModal || !previewBody) return
	previewBody.innerHTML = '<p>Loading ticket preview...</p>'
	// lock background and save focus
	_modalState.lastFocused = document.activeElement
	lockBodyForModal()
	attachModalCleanup(previewModal)
	try { previewModal.showModal() } catch (_) { previewModal.setAttribute('open', '') }

	try {
		let data = null
		if (options.source === 'counter') {
			data = state.counterTickets.find((t) => t.ticketId === ticketId) || null
		}
		if (!data) {
			data = await adminFetch(`${adminApiBase}/bookings/${ticketId}`)
		}

		previewBody.innerHTML = `
			<div class="ticket">
				<div class="ticket-header">
					<h4 class="park-name">Kurumbapatti Zoological Park</h4>
					<div class="meta">
						<div><strong>Booking ID:</strong> ${escapeHtml(data.ticketId || '—')}</div>
						<div><strong>Visit Date:</strong> ${escapeHtml(data.visitDate || '—')}</div>
						<div><strong>Issue Date:</strong> ${data.issueDate ? formatDateTime(data.issueDate) : '—'}</div>
						<div><strong>Source:</strong> ${options.source === 'counter' || (data.issuedBy) ? 'Counter' : 'Online'}</div>
						<div><strong>Issued By:</strong> ${escapeHtml(data.issuedBy || (options.source === 'counter' ? 'Counter' : 'System'))}</div>
					</div>
				</div>
				<div class="ticket-body">
					<table class="ticket-items">
						<thead>
							<tr><th>Ticket</th><th>Qty</th><th>Unit</th><th>Line Total</th></tr>
						</thead>
						<tbody id="ticketPreviewItems"></tbody>
					</table>
					<div class="ticket-summary">
						<div><strong>Payment Mode:</strong> ${escapeHtml(data.paymentMode || '—')}</div>
						<div><strong>Payment Status:</strong> ${escapeHtml(data.paymentStatus || '—')}</div>
						<div><strong>Total Amount:</strong> ${formatINR(data.totalAmount)}</div>
						<div><strong>Entry Status:</strong> ${escapeHtml(data.entryStatus || '—')}</div>
						<div><strong>Entry Timestamp:</strong> ${data.entryTimestamp ? formatDateTime(data.entryTimestamp) : '—'}</div>
					</div>
					<div class="ticket-qr" id="ticketPreviewQr"></div>
				</div>
			</div>
		`

		const tbody = previewBody.querySelector('#ticketPreviewItems')
		if (tbody) {
			const normalized = normalizeTicketItems(data, options.source === 'counter' || Boolean(data.issuedBy))
			if (!Array.isArray(normalized) || normalized.length === 0) {
				const emptyMsg = options.source === 'counter'
					? 'No stored breakdown for this counter ticket (legacy record).'
					: 'No items'
				tbody.innerHTML = `<tr><td colspan="4">${emptyMsg}</td></tr>`
			} else {
				tbody.innerHTML = normalized
					.map((item) => {
						const label = escapeHtml(item.label || 'Item')
						const qty = Number(item.quantity || 0)
						const unitRaw = item.unitPrice
						const amountRaw = item.amount
						const unitDisplay = Number(unitRaw) === 0 ? 'FREE' : (Number.isFinite(Number(unitRaw)) ? formatINR(unitRaw) : '—')
						const amountDisplay = Number(amountRaw) === 0 ? 'FREE' : (Number.isFinite(Number(amountRaw)) ? formatINR(amountRaw) : '—')
						return `
							<tr>
								<td>${label}</td>
								<td class="qty">${qty}</td>
								<td class="price">${unitDisplay}</td>
								<td class="amount">${amountDisplay}</td>
							</tr>
						`
					})
					.join('')
			}
		}

		const qrContainer = previewBody.querySelector('#ticketPreviewQr')
		if (qrContainer) {
			if (data.qrImage) {
				qrContainer.innerHTML = `<img src="${data.qrImage}" alt="Ticket QR" style="width:140px;height:140px;object-fit:contain;border:1px solid #ddd" />`
			} else if (data.qr) {
				qrContainer.innerHTML = `<pre class="muted">QR payload: ${escapeHtml(JSON.stringify(data.qr))}</pre>`
			} else {
				qrContainer.innerHTML = '<div class="muted">No QR image stored for this ticket.</div>'
			}
		}
	} catch (err) {
		previewBody.innerHTML = `<p>${err?.message || 'Unable to load ticket preview.'}</p>`
	}
}

let __adminInitRan = false

const page = (() => {
	const pathname = window.location.pathname || ''
	const last = pathname.split('/').filter(Boolean).pop() || ''
	const cleaned = last.split('?')[0].split('#')[0].toLowerCase()
	if (!cleaned || cleaned === 'admin' || cleaned === 'index' || cleaned === 'index.html') return 'login'
	if (cleaned === 'dashboard' || cleaned === 'dashboard.html') return 'dashboard'
	if (cleaned === 'users' || cleaned === 'users.html') return 'users'
	if (cleaned === 'login' || cleaned === 'login.html') return 'login'
	return cleaned
})()

// Diagnostic: confirm this script file is the one loaded in the browser
console.log('[admin-script] loaded', { page, href: window.location.href })

function getCurrentRole() {
	const storedRole = sessionStorage.getItem('role') || localStorage.getItem('role')
	if (storedRole) return storedRole.toUpperCase()
	const token = sessionStorage.getItem('token') || localStorage.getItem('token')
	if (!token || typeof token !== 'string') return null
	const parts = token.split('.')
	if (parts.length !== 3) return null
	try {
		const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
		const json = atob(base64)
		const payload = JSON.parse(json)
		return payload?.role ? String(payload.role).toUpperCase() : null
	} catch (_err) {
		return null
	}
}

function getCurrentUserId() {
	const token = sessionStorage.getItem('token') || localStorage.getItem('token')
	if (!token || typeof token !== 'string') return null
	const parts = token.split('.')
	if (parts.length !== 3) return null
	try {
		const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))
		return payload?.userId || payload?.sub || null
	} catch (_err) {
		return null
	}
}

function applyRoleVisibility() {
	const role = getCurrentRole() || 'ADMIN'
	const adminOnly = document.querySelectorAll('[data-requires-role="ADMIN"]')
	adminOnly.forEach((el) => {
		el.style.display = role === 'ADMIN' ? '' : 'none'
	})
}

function guardAdminPage() {
	const role = getCurrentRole()
	if (!role) {
		window.location.href = './login.html'
		return
	}
	if (role !== 'ADMIN') {
		window.location.href = role === 'COUNTER' ? '/counter/index.html' : '/scanner/index.html'
	}
}

async function loginWithCredentials({ email, password, secretCode, expectedRole, errorBox, onSuccess }) {
	try {
		const res = await fetch('/api/auth/login', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ email, password, secretCode }),
		})

		if (!res.ok) {
			const data = await res.json().catch(() => ({}))
			throw new Error(data?.message || 'Login failed')
		}

		const data = await res.json()
		if (!data?.token || !data?.role) throw new Error('Invalid auth response')
		if (expectedRole && data.role !== expectedRole) throw new Error('Role not permitted for this console')

		sessionStorage.setItem('token', data.token)
		sessionStorage.setItem('role', data.role)
		sessionStorage.setItem('isLoggedIn', 'true')
		sessionStorage.setItem('user', JSON.stringify(data.user || {}))
		if (typeof onSuccess === 'function') onSuccess()
	} catch (err) {
		if (errorBox) errorBox.textContent = err?.message || 'Login failed'
	}
}


function initLogin() {
	const form = document.getElementById('adminLoginForm')
	if (!form) return
	const errorBox = document.getElementById('loginError')

	form.addEventListener('submit', (event) => {
		event.preventDefault()
		const formData = new FormData(form)
		const email = formData.get('username')?.toString().trim()
		const password = formData.get('password')?.toString().trim()
		const otp = formData.get('otp')?.toString().trim()

		if (!email || !password || !otp) {
			errorBox.textContent = 'All fields are required.'
			return
		}

		loginWithCredentials({ email, password, secretCode: otp, expectedRole: 'ADMIN', errorBox, onSuccess: () => window.location.href = './dashboard.html' })
	})
}

function guardDashboard() {
	const role = getCurrentRole()
	if (!role) {
		window.location.href = './login.html'
		return
	}
	if (role !== 'ADMIN') {
		window.location.href = role === 'COUNTER' ? '/counter/index.html' : '/scanner/index.html'
	}
}

function initDashboard() {
	__adminInitRan = true
	setupNavigation()
	const setupNames = ['setupBookings', 'setupCounterTickets', 'setupScannerLogs', 'setupAdoptions', 'setupReports', 'setupAnalytics', 'renderScannerLogs']
	console.debug('[admin] setup availability', setupNames.reduce((acc, name) => {
		acc[name] = typeof (globalThis[name] || window[name])
		return acc
	}, {}))
	const callSetup = (name) => {
		try {
			if (typeof globalThis[name] === 'function') return globalThis[name]()
			if (typeof window[name] === 'function') return window[name]()
			// Fallback: try to eval module-scoped identifier (may throw if undeclared)
			const fn = (function () { try { return eval(name) } catch (_) { return null } })()
			if (typeof fn === 'function') return fn()
			console.warn('[admin-script] setup function not found (skipping):', name)
		} catch (e) {
			console.error('[admin-script] error calling', name, e)
		}
	}
	callSetup('setupDashboard')
	callSetup('setupBookings')
	callSetup('setupCounterTickets')
	callSetup('setupScannerLogs')
	callSetup('setupAdoptions')
	callSetup('setupReports')
	callSetup('setupAnalytics')
	applyRoleVisibility()
}

function setupNavigation() {
	const navLinks = document.querySelectorAll('.nav-link')
	const panels = document.querySelectorAll('.panel')
	const sectionTitle = document.getElementById('sectionTitle')
	const sectionSubtitle = document.getElementById('sectionSubtitle')
	const logoutBtn = document.getElementById('logoutBtn')

	const subtitles = {
		overview: 'Read-only oversight of bookings, tickets, and compliance.',
		bookings: 'Monitor online bookings. No payment handling or ticket edits.',
		counter: 'Read-only counter ticket report with export.',
		qrlogs: 'Security view of scans. No overrides.',
		adoptions: 'Manage adoption records and certificates.',
		reports: 'Quick operational reports.',
	}

	navLinks.forEach((btn) => {
		btn.addEventListener('click', () => {
			const target = btn.dataset.target
			// update hash so direct links and history work
			try { window.location.hash = `#${target}` } catch (_e) {}
			navLinks.forEach((b) => b.classList.toggle('active', b === btn))
			panels.forEach((panel) => panel.classList.toggle('active', panel.id === target))
			sectionTitle.textContent = btn.textContent ?? 'Admin Dashboard'
			sectionSubtitle.textContent = subtitles[target] ?? subtitles.overview
		})
	})

	// Activate section based on hash (on load and when hash changes)
	function handleSectionNavigation() {
		const hash = (window.location.hash || '#overview').replace(/^#/, '')
		const targetBtn = Array.from(navLinks).find((b) => String(b.dataset.target) === hash)
		const targetPanel = document.getElementById(hash)
		const target = targetBtn ? targetBtn.dataset.target : (targetPanel ? hash : 'overview')
		// toggle active classes
		navLinks.forEach((b) => b.classList.toggle('active', b.dataset.target === target))
		panels.forEach((panel) => panel.classList.toggle('active', panel.id === target))
		// update titles if available
		if (sectionTitle) {
			const activeBtn = Array.from(navLinks).find((b) => b.dataset.target === target)
			sectionTitle.textContent = activeBtn ? (activeBtn.textContent ?? 'Admin Dashboard') : 'Admin Dashboard'
		}
		if (sectionSubtitle) {
			sectionSubtitle.textContent = subtitles[target] ?? subtitles.overview
		}
	}

	window.addEventListener('load', handleSectionNavigation)
	window.addEventListener('hashchange', handleSectionNavigation)

	logoutBtn?.addEventListener('click', () => {
		sessionStorage.removeItem('isLoggedIn')
		window.location.href = './login.html'
	})
}

const setTextSafe = (id, value) => {
	const el = document.getElementById(id)
	if (el) el.textContent = value
}

// ---------- User Management (users.html) ----------

function initUserManagement() {
	applyRoleVisibility()

	const addBtn = document.getElementById('addUserBtn')
	const searchInput = document.getElementById('userSearchInput')
	const roleFilter = document.getElementById('userRoleFilter')
	const statusFilter = document.getElementById('userStatusFilter')
	let userForm = document.getElementById('userForm')
	let userModal = document.getElementById('userModal')
	let userModalTitle = document.getElementById('userModalTitle')
	let userFormSuccess = document.getElementById('userFormSuccess')
	let userModalClose = document.getElementById('userModalClose')
	let userCancelBtn = document.getElementById('userCancelBtn')
	const confirmModal = document.getElementById('confirmModal')
	const confirmMessage = document.getElementById('confirmMessage')
	const confirmSubmit = document.getElementById('confirmSubmit')
	let isUserModalOpen = false

	// Modal helpers for clean open/close and focus/scroll management
	const _modalState = { lastFocused: null }

	function restoreLastFocus() {
		try {
			if (_modalState.lastFocused && typeof _modalState.lastFocused.focus === 'function') _modalState.lastFocused.focus()
		} catch (_err) {}
	}

	function lockBodyForModal() {
		document.documentElement.classList.add('has-modal')
		// prevent background scroll
		document.body.style.overflow = 'hidden'
	}

	function unlockBodyForModal() {
		document.documentElement.classList.remove('has-modal')
		document.body.style.overflow = ''
	}

	// Small on-screen toast for quick visual debug during runtime tests
	function showModalDebugToast(message, timeout = 3000) {
		// Debug UI disabled: no-op to avoid injecting DOM elements during normal use.
		return
	}
	// Attach generic close handlers for a dialog element: backdrop click, close buttons, and cleanup on close.
	function attachModalCleanup(modal) {
		if (!modal || modal.__cleanupAttached) return
		modal.__cleanupAttached = true
		// backdrop click closes
		modal.addEventListener('click', (event) => {
			if (event.target === modal) modal.close()
		})
		// buttons inside modal marked to close
		Array.from(modal.querySelectorAll('[data-modal-close], .modal-close, .dialog-close, [data-close]')).forEach((btn) => {
			btn.addEventListener('click', () => modal.close())
		})
		// ensure cleanup on any close path
		modal.addEventListener('close', () => {
			unlockBodyForModal()
			try {
				if (_modalState.lastFocused && typeof _modalState.lastFocused.focus === 'function') _modalState.lastFocused.focus()
			} catch (_err) {}
			// clear transient errors if any
			try { const errEl = modal.querySelector('.inline-error, .error'); if (errEl) errEl.textContent = '' } catch (_e) {}
		})
	}

	function showConfirm(action, message, userId) {
		if (!confirmModal) return
		_modalState.lastFocused = document.activeElement
		if (typeof userId !== 'undefined') stateUsers.selectedId = userId
		confirmModal.dataset.action = action
		if (action === 'status') delete confirmModal.dataset.status
		confirmMessage.textContent = message || 'Are you sure?'
		showInlineError('confirmError', '')
		lockBodyForModal()
		try {
			confirmModal.showModal()
			// focus confirm button for keyboard users
			if (confirmSubmit && typeof confirmSubmit.focus === 'function') confirmSubmit.focus()
		} catch (e) {
			// fallback: ensure modal is visible
			confirmModal.setAttribute('open', '')
		}
	}

	// Clean up when dialog is closed (any reason)
	confirmModal?.addEventListener('close', () => {
		unlockBodyForModal()
		// restore focus to where it was
		try {
			if (_modalState.lastFocused && typeof _modalState.lastFocused.focus === 'function') _modalState.lastFocused.focus()
		} catch (_err) {}
		// clear transient attributes
		delete confirmModal.dataset.action
		delete confirmModal.dataset.status
		showInlineError('confirmError', '')
	})
	const resetModal = document.getElementById('resetModal')
	const resetPasswordInput = document.getElementById('resetPasswordInput')
	const resetPasswordError = document.getElementById('resetPasswordError')
	const resetMessage = document.getElementById('resetMessage')
	const resetSubmit = document.getElementById('resetSubmit')
	const logoutBtn = document.getElementById('logoutBtn')
	let fullNameInput = document.getElementById('fullName')
	let emailInput = document.getElementById('email')
	let roleSelect = document.getElementById('role')
	let statusSelect = document.getElementById('status')
	let passwordInput = document.getElementById('password')

	const formState = {
		mode: 'create',
		userId: null,
		fullName: '',
		email: '',
		role: 'ADMIN',
		status: 'ACTIVE',
		password: '',
		isSubmitting: false,
	}

	const stateUsers = {
		items: [],
		selectedId: null,
		loading: false,
		filters: { search: '', role: '', status: '' },
		editingOriginal: null,
	}

	logoutBtn?.addEventListener('click', () => {
		sessionStorage.clear()
		localStorage.removeItem('token')
		localStorage.removeItem('role')
		window.location.href = './login.html'
	})

	addBtn?.addEventListener('click', () => openUserModal())
	searchInput?.addEventListener('input', debounce(() => {
		stateUsers.filters.search = searchInput.value.trim()
		loadUsers()
	}, 250))
	roleFilter?.addEventListener('change', () => {
		stateUsers.filters.role = roleFilter.value
		loadUsers()
	})
	statusFilter?.addEventListener('change', () => {
		stateUsers.filters.status = statusFilter.value
		loadUsers()
	})

	function bindUserModalEvents() {
		fullNameInput?.addEventListener('input', (event) => {
			formState.fullName = event.target.value
			syncSaveState()
		})

		emailInput?.addEventListener('input', (event) => {
			formState.email = event.target.value
			syncSaveState()
		})

		roleSelect?.addEventListener('change', (event) => {
			formState.role = (event.target.value || 'ADMIN').toUpperCase()
			syncFormToDom()
			syncSaveState()
		})

		statusSelect?.addEventListener('change', (event) => {
			formState.status = (event.target.value || 'ACTIVE').toUpperCase()
			syncSaveState()
		})

		passwordInput?.addEventListener('input', (event) => {
			if (formState.mode !== 'create') {
				event.target.value = ''
				return
			}
			formState.password = event.target.value
			showInlineError('passwordError', '')
			syncSaveState()
		})

		userModalClose?.addEventListener('click', () => {
			if (formState.isSubmitting) return
			closeUserModal()
		})
		userCancelBtn?.addEventListener('click', () => {
			if (formState.isSubmitting) return
			closeUserModal()
		})
		userModal?.addEventListener('click', (event) => {
			if (formState.isSubmitting) return
			if (event.target === userModal) closeUserModal()
		})
		userModal?.addEventListener('cancel', (event) => {
			if (formState.isSubmitting) {
				event.preventDefault()
				return
			}
			event.preventDefault()
			closeUserModal()
		})

		// Ensure background unlock and focus restore when dialog is closed by any means (ESC, .close(), etc.)
		userModal?.addEventListener('close', () => {
			console.debug('[userModal] close event')
			showModalDebugToast('userModal: close event')
			isUserModalOpen = false
			unlockBodyForModal()
			restoreLastFocus()
			resetUserModalState()
		})

		userForm?.addEventListener('submit', async (event) => {
			event.preventDefault()
			if (formState.isSubmitting) return

			const clientErrors = validateUserForm(formState)
			if (clientErrors.length) {
				clientErrors.forEach(({ field, message }) => showFieldError(field, message))
				syncSaveState()
				return
			}

			clearFieldErrors()
			formState.isSubmitting = true
			syncSaveState()

			try {
				if (formState.mode === 'create') {
					await handleCreate()
				} else if (formState.mode === 'edit') {
					await handleEdit()
				}
				forceUserModalTeardown()
				try {
					await loadUsers()
				} catch (refreshError) {
					console.error('Unable to refresh users after save', refreshError)
				}
			} catch (error) {
				handleUserSaveError(error)
			} finally {
				formState.isSubmitting = false
				syncSaveState()
			}
		})
	}

	bindUserModalEvents()

	syncFormToDom()
	loadUsers()

		confirmSubmit?.addEventListener('click', async () => {
			if (!stateUsers.selectedId || !confirmModal) return
			const action = confirmModal.dataset.action
			setBtnLoading('confirmSubmit', true)
			try {
				if (action === 'status') {
					const nextStatus = confirmModal.dataset.status
					await handleStatusChange(stateUsers.selectedId, nextStatus)
				} else if (action === 'delete') {
					// perform delete and show inline error on failure
					try {
						await handleDelete(stateUsers.selectedId)
					} catch (err) {
						// keep modal open and show message inside
						showInlineError('confirmError', err?.message || 'Unable to delete user')
						setBtnLoading('confirmSubmit', false)
						return
					}
				}
				// Close modal and refresh list only on success
				try {
					confirmModal.close()
				} catch (_e) {
					// ensure modal is hidden
					confirmModal.removeAttribute('open')
				}
				loadUsers()
			} catch (error) {
				showInlineError('confirmError', error?.message || 'Unable to complete action')
			} finally {
				setBtnLoading('confirmSubmit', false)
			}
		})

		// Reset password submit handler
		resetSubmit?.addEventListener('click', async (event) => {
			event.preventDefault()
			if (!stateUsers.selectedId || !resetModal) return
			setBtnLoading('resetSubmit', true)
			try {
				const pwd = (resetPasswordInput && resetPasswordInput.value) ? resetPasswordInput.value.trim() : ''
				if (!pwd || pwd.length < 8) {
					if (resetPasswordError) resetPasswordError.textContent = 'Password must be at least 8 characters.'
					setBtnLoading('resetSubmit', false)
					return
				}
				await handleResetPassword(stateUsers.selectedId, pwd)
				if (resetMessage) resetMessage.textContent = 'Password updated.'
				// close modal after successful reset
				try { resetModal.close() } catch (_e) { console.warn('[resetModal] close() threw', _e) }
				// refresh list to show any audit/updated timestamps
				try { await loadUsers() } catch (_e) { /* ignore refresh errors */ }
			} catch (err) {
				if (resetPasswordError) resetPasswordError.textContent = err?.message || 'Unable to reset password.'
			} finally {
				setBtnLoading('resetSubmit', false)
			}
		})

	function setBtnLoading(id, isLoading) {
		const btn = document.getElementById(id)
		if (!btn) return
		btn.disabled = isLoading
		btn.textContent = isLoading ? 'Working...' : btn.dataset.label || btn.textContent
	}

	function showInlineError(id, message) {
		const el = document.getElementById(id)
		if (el) el.textContent = message
	}

	function showFieldError(field, message) {
		const map = {
			fullName: 'fullNameError',
			email: 'emailError',
			role: 'roleError',
			status: 'statusError',
			password: 'passwordError',
		}
		const id = map[field]
		if (id) showInlineError(id, message)
	}

	function clearFieldErrors() {
		['fullNameError', 'emailError', 'roleError', 'statusError', 'passwordError', 'userFormError', 'userFormSuccess'].forEach((id) => showInlineError(id, ''))
	}

	function resetUserModalState() {
		clearFieldErrors()
		resetFormState('create')
		userForm?.reset()
		syncFormToDom()
	}

	function showSuccess(message) {
		if (userFormSuccess) userFormSuccess.textContent = message
	}

	function validateUserForm(state) {
		const errors = []
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

		if (!state.fullName || !state.fullName.trim()) errors.push({ field: 'fullName', message: 'Full name is required.' })
		if (!state.email || !state.email.trim()) errors.push({ field: 'email', message: 'Email is required.' })
		if (state.email && !emailRegex.test(state.email.trim())) errors.push({ field: 'email', message: 'Invalid email format.' })
		if (!state.role) errors.push({ field: 'role', message: 'Role is required.' })
		if (!state.status) errors.push({ field: 'status', message: 'Status is required.' })

		if (state.mode === 'create') {
			if (!state.password || state.password.trim().length < 8) {
				errors.push({ field: 'password', message: 'Password must be at least 8 characters.' })
			}
		}

		return errors
	}

	function syncSaveState() {
		const btn = document.getElementById('userSaveBtn')
		if (!btn) return
		const errors = validateUserForm(formState)
		btn.disabled = formState.isSubmitting || errors.length > 0
		const label = formState.mode === 'edit' ? 'Update User' : 'Save User'
		btn.textContent = formState.isSubmitting ? 'Working...' : label
	}

	function resetFormState(mode = 'create') {
		formState.mode = mode
		formState.userId = null
		formState.fullName = ''
		formState.email = ''
		formState.role = 'ADMIN'
		formState.status = 'ACTIVE'
		formState.password = ''
		formState.isSubmitting = false
		stateUsers.selectedId = null
		stateUsers.editingOriginal = null
	}

	function syncFormToDom() {
		const title = formState.mode === 'edit' ? 'Edit User' : 'Add User'
		if (userModalTitle) userModalTitle.textContent = title

		if (fullNameInput) fullNameInput.value = formState.fullName
		if (emailInput) emailInput.value = formState.email
		if (roleSelect) roleSelect.value = formState.role
		if (statusSelect) statusSelect.value = formState.status

		if (passwordInput) {
			passwordInput.value = formState.mode === 'create' ? formState.password : ''
			passwordInput.disabled = formState.mode !== 'create'
			passwordInput.required = formState.mode === 'create'
			passwordInput.placeholder = formState.mode === 'create'
				? 'Enter a strong password'
				: 'Use Reset Password action to change password.'
		}

		syncSaveState()
	}

	function openUserModal(user = null, mode = 'create') {
		resetFormState(mode)
		// save focus and lock background when opening modal
		_modalState.lastFocused = document.activeElement
		lockBodyForModal()
		isUserModalOpen = true
		console.debug('[userModal] openUserModal', { mode, userId: user ? (user.id || user._id) : null })
		showModalDebugToast(`userModal: open (${mode})`)
		if (user) {
			const id = user.id || user._id || null
			formState.userId = id
			formState.fullName = user.fullName || ''
			formState.email = user.email || ''
			formState.role = (user.role || 'ADMIN').toUpperCase()
			formState.status = (user.status || 'ACTIVE').toUpperCase()
			stateUsers.selectedId = id
			stateUsers.editingOriginal = user
		}

		clearFieldErrors()
		if (userFormSuccess && mode === 'create') userFormSuccess.textContent = ''
		syncFormToDom()
		try {
			userModal?.showModal()
			// focus first input for keyboard users
			if (fullNameInput && typeof fullNameInput.focus === 'function') fullNameInput.focus()
		} catch (e) {
			// showModal() failed — prefer native dialog behavior only; log and abort fallback
			console.warn('[userModal] showModal() threw, not falling back to setAttribute("open") to avoid duplicate rendering.', e)
		}
	}

	function closeUserModal() {
		console.debug('[userModal] closeUserModal called', { isSubmitting: formState.isSubmitting })
		showModalDebugToast(`userModal: close called${formState.isSubmitting ? ' (saving...)' : ''}`)
		isUserModalOpen = false
		if (!userModal) {
			unlockBodyForModal()
			restoreLastFocus()
			resetUserModalState()
			return
		}
		// Prefer a smooth fade-out when closing via UI actions (× button / Cancel)
		try {
			const isOpen = Boolean(userModal.open || userModal.hasAttribute && userModal.hasAttribute('open'))
			if (isOpen && userModal.classList) {
				// trigger CSS fade-out
				userModal.classList.remove('is-closing')
				// Allow a tiny delay to ensure class removal settled (defensive)
				requestAnimationFrame(() => {
					userModal.classList.add('is-closing')
				})

				const finishClose = () => {
					try { userModal.close() } catch (_e) { console.warn('[userModal] close() threw during fade-out', _e) }
					// ensure class removed after close
					try { userModal.classList.remove('is-closing') } catch (_e) {}
				}

				const onTransition = (ev) => {
					if (ev.target !== userModal) return
					finishClose()
				}
				userModal.addEventListener('transitionend', onTransition, { once: true })
				// fallback in case transitionend doesn't fire
				setTimeout(() => {
					if (userModal && (userModal.open || userModal.hasAttribute('open'))) finishClose()
				}, 300)
			} else {
				// if not open or no classList support, close immediately
				try { userModal.close() } catch (_e) { console.warn('[userModal] close() threw (immediate close)', _e) }
			}
		} catch (err) {
			// best-effort fallback
			try { userModal.close() } catch (_e) { console.warn('[userModal] close() threw in error path', _e) }
		}
	}

	function forceUserModalTeardown() {
		console.debug('[userModal] forceUserModalTeardown start', { isSubmitting: formState.isSubmitting })
		showModalDebugToast('userModal: teardown start')
		try {
			if (userModal) {
				try { userModal.close() } catch (e) { console.warn('[userModal] close() threw in teardown', e) }
				// blur any focused element inside modal
				try { const active = document.activeElement; if (userModal.contains(active) && typeof active.blur === 'function') active.blur() } catch (_e) {}
			}
		} catch (err) {
			console.error('[userModal] teardown error', err)
		}
		// ensure body and focus are restored
		unlockBodyForModal()
		restoreLastFocus()
		resetUserModalState()
		isUserModalOpen = false
		console.debug('[userModal] forceUserModalTeardown complete')
		showModalDebugToast('userModal: teardown complete')
	}

	function handleUserSaveError(error) {
		const message = error?.message || 'Unable to save user.'
		if (/password/i.test(message)) {
			showFieldError('password', 'Please provide a stronger password (min 8 characters).')
			return
		}
		if (/email/i.test(message)) {
			showFieldError('email', message)
			return
		}
		showInlineError('userFormError', message)
	}

	async function handleCreate() {
		const payload = {
			fullName: formState.fullName.trim(),
			email: formState.email.trim().toLowerCase(),
			role: (formState.role || 'ADMIN').toUpperCase(),
			status: (formState.status || 'ACTIVE').toUpperCase(),
			password: formState.password.trim(),
		}
		await adminFetch(userApiBase, {
			method: 'POST',
			body: JSON.stringify(payload),
		})
	}

	async function handleEdit() {
		if (!formState.userId) throw new Error('Missing user identifier.')
		const payload = {}
		const original = stateUsers.editingOriginal || {}
		const nextName = formState.fullName.trim()
		if (nextName && nextName !== (original.fullName || '')) payload.fullName = nextName
		const nextEmail = formState.email.trim().toLowerCase()
		const originalEmail = (original.email || '').toLowerCase()
		if (nextEmail && nextEmail !== originalEmail) payload.email = nextEmail
		const nextRole = (formState.role || '').toUpperCase()
		const originalRole = (original.role || '').toUpperCase()
		if (nextRole && nextRole !== originalRole) payload.role = nextRole
		const nextStatus = (formState.status || '').toUpperCase()
		const originalStatus = (original.status || '').toUpperCase()
		if (nextStatus && nextStatus !== originalStatus) payload.status = nextStatus
		if (!Object.keys(payload).length) return
		await adminFetch(`${userApiBase}/${formState.userId}`, {
			method: 'PATCH',
			body: JSON.stringify(payload),
		})
	}

	async function handleStatusChange(userId, status) {
		if (!status) throw new Error('Status is required.')
		await adminFetch(`${userApiBase}/${userId}/status`, {
			method: 'POST',
			body: JSON.stringify({ status }),
		})
	}

	async function handleDelete(userId) {
		await adminFetch(`${userApiBase}/${userId}`, { method: 'DELETE' })
	}

	async function handleResetPassword(userId, password) {
		await adminFetch(`${userApiBase}/${userId}/reset-password`, {
			method: 'POST',
			body: JSON.stringify({ password }),
		})
	}

	function openStatusModal(user) {
		const isActive = user.status === 'ACTIVE'
		const nextStatus = isActive ? 'DISABLED' : 'ACTIVE'
		showConfirm('status', `Set ${user.fullName || 'this user'} to ${nextStatus === 'ACTIVE' ? 'Active' : 'Disabled'}?`, user.id || user._id)
	}

	function openDeleteModal(user) {
		showConfirm('delete', `Delete ${user.fullName || 'this user'}? This action cannot be undone.`, user.id || user._id)
	}

	function openResetModal(user) {
		if (!resetModal) return
		stateUsers.selectedId = user.id || user._id
		if (resetPasswordInput) resetPasswordInput.value = ''
		if (resetPasswordError) resetPasswordError.textContent = ''
		if (resetMessage) resetMessage.textContent = ''
		// lock background and attach cleanup
		_modalState.lastFocused = document.activeElement
		lockBodyForModal()
		attachModalCleanup(resetModal)
		try { resetModal.showModal() } catch (_) { resetModal.setAttribute('open', '') }
	}

	async function loadUsers() {
		const tbody = document.getElementById('userTableBody')
		if (!tbody) return
		stateUsers.loading = true
		tbody.innerHTML = '<tr><td colspan="6">Loading users...</td></tr>'
		try {
			const params = new URLSearchParams()
			if (stateUsers.filters.search) params.set('search', stateUsers.filters.search)
			if (stateUsers.filters.role) params.set('role', stateUsers.filters.role)
			if (stateUsers.filters.status) params.set('status', stateUsers.filters.status)
			const query = params.toString()
			const url = query ? `${userApiBase}?${query}` : userApiBase
			const data = await adminFetch(url)
			const users = Array.isArray(data?.data) ? data.data : []
			stateUsers.items = users
			renderUsers(users)
		} catch (error) {
			tbody.innerHTML = `<tr><td colspan="6">${escapeHtml(error?.message || 'Unable to load users.')}</td></tr>`
		} finally {
			stateUsers.loading = false
		}
	}

	function renderUsers(users) {
		const tbody = document.getElementById('userTableBody')
		if (!tbody) return
		if (!users.length) {
			tbody.innerHTML = '<tr><td colspan="6">No users found.</td></tr>'
			return
		}

		tbody.innerHTML = users
			.map((user) => {
				const id = user.id || user._id
				const statusLabel = user.status === 'ACTIVE' ? 'Active' : 'Disabled'
				const statusClass = user.status === 'ACTIVE' ? 'status-active' : 'status-disabled'
				const lastLogin = user.lastLoginAt ? formatDateTime(user.lastLoginAt) : '—'
				const toggleLabel = user.status === 'ACTIVE' ? 'Disable' : 'Enable'
				const nextStatus = user.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE'
				return `
				<tr>
					<td>${escapeHtml(user.fullName || '—')}</td>
					<td>${escapeHtml(user.email || '—')}</td>
					<td>${escapeHtml(user.role || '—')}</td>
					<td><span class="status-badge ${statusClass}">${escapeHtml(statusLabel)}</span></td>
					<td>${escapeHtml(lastLogin)}</td>
					<td>
						<div class="table-actions">
							<button class="icon-btn" data-action="edit" data-id="${id}">Edit</button>
							<button class="icon-btn neutral" data-action="status" data-id="${id}" data-status="${nextStatus}">${toggleLabel}</button>
							<button class="icon-btn" data-action="reset" data-id="${id}">Reset</button>
							<button class="icon-btn danger" data-action="delete" data-id="${id}">Delete</button>
						</div>
					</td>
				</tr>`
				})
				.join('')

		tbody.querySelectorAll('[data-action]').forEach((btn) => {
			btn.addEventListener('click', () => {
				const id = btn.dataset.id
				const user = stateUsers.items.find((item) => String(item.id || item._id) === String(id))
				if (!user) return
				const action = btn.dataset.action
				if (action === 'edit') {
					openUserModal(user, 'edit')
				} else if (action === 'status') {
					openStatusModal(user)
				} else if (action === 'reset') {
					openResetModal(user)
				} else if (action === 'delete') {
					openDeleteModal(user)
				}
			})
		})
	}

}

function debounce(fn, delay) {
	let t
	return (...args) => {
		clearTimeout(t)
		t = setTimeout(() => fn(...args), delay)
	}
}

function renderOverview() {
	const summary = state.analytics.summary
	const hasData = Boolean(summary)

	setTextSafe('metricOnlineToday', hasData ? (summary.onlineCount || 0).toString() : '--')
	setTextSafe('metricCounterToday', hasData ? (summary.counterCount || 0).toString() : '--')
	setTextSafe('metricOnlineRevenue', hasData ? formatINR(summary.onlineRevenue || 0) : '₹ --')
	setTextSafe('metricCounterRevenue', hasData ? formatINR(summary.counterRevenue || 0) : '₹ --')
	setTextSafe('metricRevenueToday', hasData ? formatINR(summary.totalRevenue || 0) : '₹ --')
	setTextSafe('metricEntered', hasData ? (summary.entered || 0).toString() : '--')
	setTextSafe('metricPending', hasData ? (summary.pending || 0).toString() : '--')
}

function setupAnalytics() {
	const dateInput = document.getElementById('globalDateFilter')
	const statusEl = document.getElementById('analyticsStatus')

	if (dateInput) {
		dateInput.value = state.globalDate || ''
		dateInput.addEventListener('change', () => {
			state.globalDate = (dateInput.value || '').trim()
			const reportFrom = document.getElementById('reportFrom')
			const reportTo = document.getElementById('reportTo')
			if (reportFrom) reportFrom.value = state.globalDate
			if (reportTo) reportTo.value = state.globalDate
			loadAnalytics()
		})
	}

	if (statusEl) statusEl.textContent = 'Loading analytics...'
	loadAnalytics()
}

async function loadAnalytics() {
	const date = state.globalDate || ''
	const statusEl = document.getElementById('analyticsStatus')
	const query = date ? `?date=${encodeURIComponent(date)}` : ''
	const fetchJson = async (path) => {
		const url = `${adminApiBase}${path}${query}`
		console.debug('[admin] analytics fetch', { url })
		const data = await adminFetch(url)
		if (data?.success === false) throw new Error(data?.message || 'Analytics fetch failed')
		return data
	}

	try {
		state.analytics.summary = null
		state.analytics.ticketTypes = []
		state.analytics.categories = []
		state.analytics.sourceSplit = []
		state.analytics.entries = null
		state.analytics.scanlogs = null

		const [summary, ticketTypes, categories, sourceSplit, entries, scanlogs] = await Promise.all([
			fetchJson('/analytics/summary'),
			fetchJson('/analytics/ticket-types'),
			fetchJson('/analytics/categories'),
			fetchJson('/analytics/source-split'),
			fetchJson('/analytics/entries'),
			fetchJson('/analytics/scanlogs'),
		])

		state.analytics.summary = summary
		state.analytics.ticketTypes = ticketTypes?.rows || []
		state.analytics.categories = categories?.rows || []
		state.analytics.sourceSplit = sourceSplit?.rows || []
		state.analytics.entries = entries || null
		state.analytics.scanlogs = scanlogs || null
		console.debug('[admin] analytics loaded', {
			date,
			summary,
			ticketTypes: state.analytics.ticketTypes.length,
			categories: state.analytics.categories.length,
			sourceSplit: state.analytics.sourceSplit.length,
			entries,
			scanlogs,
		})

		renderOverview()
		renderTicketDistribution()
		renderCategoryChart()
		if (statusEl) statusEl.textContent = date ? `Visit date ${date}` : 'All dates'
	} catch (error) {
		state.analytics.summary = null
		state.analytics.ticketTypes = []
		state.analytics.categories = []
		state.analytics.sourceSplit = []
		state.analytics.entries = null
		state.analytics.scanlogs = null
		renderOverview()
		renderTicketDistribution()
		renderCategoryChart()
		if (statusEl) statusEl.textContent = error?.message || 'Analytics unavailable'
		console.error('[admin] analytics error', { date, error })
	}
}

function renderTicketDistribution() {
	const counts = new Map()
	state.analytics.ticketTypes.forEach((row) => {
		const key = (row._id || row.itemCode || '').toString().toLowerCase()
		const qty = Number(row.quantity || 0)
		counts.set(key, qty)
	})

	TICKET_BOXES.forEach((box) => {
		const el = document.getElementById(`dist-${box.code}`)
		if (el) el.textContent = counts.get(box.code) ?? 0
	})
}

function renderCategoryChart() {
	const container = document.getElementById('categoryChart')
	if (!container) return
	const rows = state.analytics.categories || []

	const getCategoryKey = (val) => {
		const n = (val || '').toString().toLowerCase()
		if (n === 'zoo' || n === 'entry') return 'entry'
		if (n.startsWith('parking')) return 'parking'
		if (n.startsWith('battery') || n.includes('transport')) return 'transport'
		if (n.includes('camera')) return 'camera'
		return n
	}

	const merged = ['entry', 'parking', 'transport', 'camera'].map((categoryKey) => {
		// Sum quantities for any row that maps to this canonical categoryKey
		const matching = rows.filter((r) => getCategoryKey(r?._id) === categoryKey)
		const quantity = matching.reduce((s, r) => s + Number(r?.quantity || 0), 0)
		const amount = matching.reduce((s, r) => s + Number(r?.amount || 0), 0)
		return { _id: categoryKey, quantity, amount }
	})
	const maxQuantity = Math.max(...merged.map((r) => Number(r.quantity || 0)), 0) || 1
	const bars = merged
		.map((row) => {
			const qty = Number(row.quantity || 0)
			const width = Math.max(6, Math.round((qty / maxQuantity) * 100))
			const revenueText = formatINR(row.amount || 0)
			return `
				<div class="bar-row" title="Revenue: ${revenueText}">
					<div class="bar-label">${escapeHtml(mapCategory(row._id))}</div>
					<div class="bar-track"><div class="bar-fill" style="width:${width}%"></div></div>
					<div class="bar-value">${qty}</div>
				</div>
			`
		})
		.join('')
	container.innerHTML = bars
}

function setupBookings() {
	const dateFilter = document.getElementById('bookingDateFilter')
	const paymentFilter = document.getElementById('bookingPaymentFilter')
	const entryFilter = document.getElementById('bookingEntryFilter')
	const searchInput = document.getElementById('bookingSearchInput')
	const tableBody = document.getElementById('bookingTableBody')
	const bookingDetailModal = document.getElementById('bookingDetailModal')
	const bookingDetailBody = document.getElementById('bookingDetailBody')
	const paginationLabel = document.getElementById('bookingPageLabel')
	const prevBtn = document.getElementById('bookingPrevBtn')
	const nextBtn = document.getElementById('bookingNextBtn')

	if (!tableBody) return

	let searchTimeout

	const setLoading = (message) => {
		tableBody.innerHTML = `<tr><td colspan="9">${message}</td></tr>`
	}

	const toTitle = (value) => (value ? value.toString().replace(/_/g, ' ') : '—')

	const updatePagination = () => {
		if (paginationLabel) {
			const totalPages = Math.max(1, Math.ceil((state.bookingPagination.total || 0) / (state.bookingPagination.limit || 1)))
			paginationLabel.textContent = `Page ${state.bookingPagination.page} of ${totalPages}`
		}
		if (prevBtn) prevBtn.disabled = state.bookingPagination.page <= 1
		if (nextBtn) nextBtn.disabled = !state.bookingPagination.hasNext
	}

	const renderTable = () => {
		if (!state.bookings.length) {
			setLoading('No bookings found for the selected filters.')
			updatePagination()
			return
		}

			tableBody.innerHTML = state.bookings
				.map(
					(b) => `
				<tr>
					<td>${b.ticketId}</td>
					<td>${b.visitorName || '—'}</td>
					<td>${b.visitorMobile || '—'}</td>
					<td>${b.visitDate || '—'}</td>
					<td>${formatCount(b.ticketCount ?? b.items)}</td>
					<td>${formatINR(b.totalAmount)}</td>
					<td><span class="status-pill ${pillClass(b.paymentStatus)}">${toTitle(b.paymentStatus)}</span></td>
					<td><span class="status-pill ${pillClass(b.entryStatus)}">${b.entryStatus || 'Not Entered'}</span></td>
					<td class="actions">
						<button class="link" data-action="view" data-id="${b.ticketId}">View</button>
						<button class="link" data-action="resend" data-id="${b.ticketId}" ${b.paymentStatus && b.paymentStatus.toString().toUpperCase() !== 'PAID' ? 'disabled' : ''}>Resend</button>
					</td>
				</tr>
			`,
			)
			.join('')

		updatePagination()
	}

	const buildQuery = (page = 1) => {
		const params = new URLSearchParams()
		const filters = {
			visitDate: dateFilter?.value || '',
			paymentStatus: paymentFilter?.value || 'all',
			entryStatus: entryFilter?.value || 'all',
			search: searchInput?.value?.trim() || '',
			page,
			limit: state.bookingPagination.limit,
		}

		state.bookingFilters = { date: filters.visitDate, payment: filters.paymentStatus, entry: filters.entryStatus, search: filters.search }

		Object.entries(filters).forEach(([key, value]) => {
			if (value && value !== 'all') params.set(key, value)
		})

		params.set('page', page)
		params.set('limit', state.bookingPagination.limit)
		return params.toString()
	}

	const fetchBookings = async (page = 1) => {
		setLoading('Loading bookings...')
		try {
			const query = buildQuery(page)
			const url = `${adminApiBase}/bookings?${query}`
			console.debug('[admin] bookings fetch', { url })
			const payload = await adminFetch(url, {
				headers: adminAuthHeaders(),
			})
			state.bookings = Array.isArray(payload?.data) ? payload.data : []
			state.bookingPagination = {
				page: payload?.pagination?.page || page,
				limit: payload?.pagination?.limit || state.bookingPagination.limit,
				total: payload?.pagination?.total || state.bookings.length,
				hasNext: Boolean(payload?.pagination?.hasNext),
			}
			console.debug('[admin] bookings loaded', {
				page: state.bookingPagination.page,
				returned: state.bookings.length,
				total: state.bookingPagination.total,
			})
			renderTable()
			renderOverview()
		} catch (error) {
			console.error('Failed to fetch bookings', error)
			state.bookings = []
			state.bookingPagination = { ...state.bookingPagination, page, total: 0, hasNext: false }
			tableBody.innerHTML = `<tr><td colspan="9">${escapeHtml(error?.message || 'Unable to fetch bookings at this time')}</td></tr>`
			updatePagination()
		}
	}

	// Normalize various stored counter ticket formats into a display-friendly list.
	function normalizeTicketItems(record, isCounter = false) {
		if (!record) return []

		// If already a proper items array with quantity/amount fields, use it directly (preserve stored values)
		if (Array.isArray(record.items) && record.items.length) {
			return record.items.map((it) => ({
				label: it.itemLabel || it.label || it.itemCode || it.category || 'Item',
				quantity: Number(it.quantity || 0),
				unitPrice: it.unitPrice ?? it.price ?? null,
				amount: it.amount ?? null,
			}))
		}

		// Try parsing common alternate fields: breakdown (string or JSON), itemsText, itemMap, itemsMap
		const candidates = [record.breakdown, record.breakdownString, record.itemsText, record.items_raw, record.itemsSerialized]
		for (const raw of candidates) {
			if (!raw) continue
			// If JSON serialised
			if (typeof raw === 'string') {
				try {
					const parsed = JSON.parse(raw)
					if (Array.isArray(parsed) && parsed.length) {
						return parsed.map((it) => ({
							label: it.itemLabel || it.label || it.itemCode || it.category || 'Item',
							quantity: Number(it.quantity || it.qty || 0),
							unitPrice: it.unitPrice ?? it.price ?? null,
							amount: it.amount ?? null,
						}))
					}
				} catch (e) {
					// Not JSON — fallthrough to plain text parsing
				}

				// Plain text parsing: split by common separators
				const parts = raw.split(/\||;|,/) .map(s => s.trim()).filter(Boolean)
				if (parts.length) {
					const out = parts.map((part) => {
						let label = part
						let qty = 0
						let unitPrice = null
						let amount = null

						// patterns: 'Label x2 @100 =200' or 'code:2' or 'Label:2'
						const mCode = part.match(/^([^:]+):\s*(\d+)/)
						if (mCode) {
							label = mCode[1].trim()
							qty = Number(mCode[2])
						}
						const mx = part.match(/(.+?)\s*[x×]\s*(\d+)/)
						if (mx) {
							label = mx[1].trim()
							qty = Number(mx[2])
						}
						const mat = part.match(/=\s*([0-9.]+)/)
						if (mat) amount = Number(mat[1])
						const mup = part.match(/@\s*([0-9.]+)/)
						if (mup) unitPrice = Number(mup[1])

						label = label.replace(/_/g, ' ').trim()
						return { label, quantity: qty, unitPrice, amount }
					})
					return out
				}
			}
			// If raw is already an array of strings or objects
			if (Array.isArray(raw) && raw.length) {
				const out = raw.map((it) => {
					if (typeof it === 'string') {
						try {
							const parsed = JSON.parse(it)
							return { label: parsed.label || parsed.itemLabel || parsed.itemCode || 'Item', quantity: Number(parsed.quantity||parsed.qty||0), unitPrice: parsed.unitPrice ?? parsed.price ?? null, amount: parsed.amount ?? null }
						} catch (e) {
							// try pattern
							const m = it.match(/(.+?)\s*[x×]\s*(\d+)/)
							if (m) return { label: m[1].trim().replace(/_/g,' '), quantity: Number(m[2]), unitPrice: null, amount: null }
							return { label: it, quantity: 0, unitPrice: null, amount: null }
						}
					}
					if (typeof it === 'object') return { label: it.label || it.itemLabel || it.itemCode || 'Item', quantity: Number(it.quantity||it.qty||0), unitPrice: it.unitPrice ?? it.price ?? null, amount: it.amount ?? null }
					return { label: String(it), quantity: 0, unitPrice: null, amount: null }
				})
				return out
			}
		}

		// item maps: { code: qty } or { code: { quantity, unitPrice, amount } }
		const mapCandidates = record.itemMap || record.itemsMap || record.ticketMap || record.itemQuantities || record.items_by_code
		if (mapCandidates && typeof mapCandidates === 'object') {
			return Object.entries(mapCandidates).map(([code, v]) => {
				let qty = 0
				let unitPrice = null
				let amount = null
				let label = code
				if (typeof v === 'number') qty = v
				else if (typeof v === 'object') {
					qty = Number(v.quantity || v.qty || 0)
					unitPrice = v.unitPrice ?? v.price ?? null
					amount = v.amount ?? null
					label = v.label || v.itemLabel || code
				}
				label = String(label).replace(/_/g, ' ').trim()
				return { label, quantity: qty, unitPrice, amount }
			})
		}

		// Fallback: no items found
		return []
	}



	const requestResend = async (ticketId) => {
		const confirmed = confirm('Resend ticket communication to the visitor?')
		if (!confirmed) return
		try {
			const payload = await adminFetch(`${adminApiBase}/bookings/${ticketId}/resend`, {
				method: 'POST',
			})
			alert(payload?.message || 'Resend queued.')
		} catch (error) {
			alert(error?.message || 'Resend failed.')
		}
	}

	dateFilter?.addEventListener('change', () => fetchBookings(1))
	paymentFilter?.addEventListener('change', () => fetchBookings(1))
	entryFilter?.addEventListener('change', () => fetchBookings(1))
	searchInput?.addEventListener('input', () => {
		clearTimeout(searchTimeout)
		searchTimeout = setTimeout(() => fetchBookings(1), 250)
	})

	prevBtn?.addEventListener('click', () => fetchBookings(Math.max(1, state.bookingPagination.page - 1)))
	nextBtn?.addEventListener('click', () => fetchBookings(state.bookingPagination.page + 1))

	tableBody.addEventListener('click', (event) => {
		const target = event.target
		if (!(target instanceof HTMLElement)) return
		const action = target.dataset.action
		const id = target.dataset.id
		if (!action || !id) return

		if (action === 'view') return openTicketPreview(id)
		if (action === 'resend') return requestResend(id)
	})

	fetchBookings(1)
}

function setupCounterTickets() {
	const dateFilter = document.getElementById('counterDateFilter')
	const tableBody = document.getElementById('counterTableBody')
	const dailyTotal = document.getElementById('counterDailyTotal')
	const exportBtn = document.getElementById('exportCounterBtn')
	const counterPageLabel = document.getElementById('counterPageLabel')
	const counterPrevBtn = document.getElementById('counterPrevBtn')
	const counterNextBtn = document.getElementById('counterNextBtn')
	const counterContextLabel = document.getElementById('counterContextLabel')
	const breakdownModal = document.getElementById('counterBreakdownModal')
	const breakdownBody = document.getElementById('counterBreakdownBody')

	if (!tableBody) return

	const summarizeItemsCompact = (items = [], max = 2) => {
		if (!Array.isArray(items) || items.length === 0) return '—'
		const normalized = items
			.map((it) => {
				const rawLabel = (it.label || it.itemLabel || it.itemCode || '').toString().replace(/_/g, ' ')
				const quantity = Number(it.quantity || 0)
				const unitPrice = Number(it.unitPrice ?? it.price ?? 0) || 0
				const cleanedLabel = rawLabel.replace(/\s*\(FREE\)\s*$/i, '')
				return {
					label: cleanedLabel || rawLabel,
					quantity,
					unitPrice,
				}
			})
			.filter((i) => i.quantity > 0)
			.sort((a, b) => b.quantity - a.quantity || a.label.localeCompare(b.label))
		const total = normalized.length
		if (!total) return '—'
		const toTitle = (value) => value.replace(/\b\w/g, (c) => c.toUpperCase())
		const top = normalized.slice(0, max)
		const shown = top.map((i) => `${toTitle(i.label)}${i.unitPrice === 0 ? ' (FREE)' : ''} ×${i.quantity}`)
		const remainder = total - top.length
		return remainder > 0 ? `${shown.join(', ')} +${remainder} more` : shown.join(', ')
	}

	const setContext = (text) => {
		if (counterContextLabel) counterContextLabel.textContent = text
	}

	const setEmpty = (message) => {
		tableBody.innerHTML = `<tr><td colspan="8">${message}</td></tr>`
		if (dailyTotal) dailyTotal.textContent = state.counterDate ? formatINR(0) : '—'
		if (exportBtn) exportBtn.disabled = true
		if (counterPageLabel) counterPageLabel.textContent = 'Page 1 of 1'
		if (counterPrevBtn) counterPrevBtn.disabled = true
		if (counterNextBtn) counterNextBtn.disabled = true
	}

	const updatePagination = () => {
		const totalPages = Math.max(1, Math.ceil((state.counterPagination.total || 0) / (state.counterPagination.limit || 1)))
		if (counterPageLabel) counterPageLabel.textContent = `Page ${state.counterPagination.page} of ${totalPages}`
		if (counterPrevBtn) counterPrevBtn.disabled = state.counterPagination.page <= 1
		if (counterNextBtn) counterNextBtn.disabled = !state.counterPagination.hasNext
	}

	const renderTable = () => {
		if (!state.counterTickets.length) {
			setEmpty(state.counterDate ? 'No counter tickets for the selected date.' : 'Showing all counter-issued tickets (none returned).')
			return
		}

		tableBody.innerHTML = state.counterTickets
			.map((t) => {
				const issuedAt = formatDateTime(t.issueDate)
				const summary = summarizeItemsCompact(t.items, 2)
				const displayQuantity = t.hasBreakdown ? (t.quantityTotal || '—') : '—'
				return `
					<tr>
						<td>${t.ticketId}</td>
						<td>${issuedAt}</td>
						<td><span class="truncate" title="${(summary || '').replace(/"/g, '&#34;')}">${summary}</span></td>
						<td>${displayQuantity}</td>
						<td>${formatINR(t.totalAmount)}</td>
						<td>${t.paymentMode || '—'}</td>
						<td>${t.issuedBy || '—'}</td>
						<td><button class="link" data-action="view-ticket" data-id="${t.ticketId}">View Ticket</button></td>
					</tr>
				`
			})
			.join('')

		const total = state.counterTickets.reduce((sum, t) => sum + Number(t.totalAmount || 0), 0)
		if (dailyTotal) dailyTotal.textContent = state.counterDate ? formatINR(total) : '—'
		if (exportBtn) exportBtn.disabled = state.counterTickets.length === 0
		updatePagination()
	}

	const fetchCounterTickets = async (date, page = 1) => {
		setEmpty('Loading counter tickets...')
		try {
			const params = new URLSearchParams()
			if (date) params.set('date', date)
			params.set('page', page)
			params.set('limit', state.counterPagination.limit)
			const url = `${backendOrigin}/api/counter/history?${params.toString()}`
			console.debug('[admin] counter fetch', { url })
			const payload = await adminFetch(url, {
				headers: adminAuthHeaders(),
			})
			state.counterDate = date || ''
			state.counterTickets = Array.isArray(payload?.tickets) ? payload.tickets : []
			const totalRecords = Number(payload?.pagination?.total || state.counterTickets.length || 0)
			const limit = Number(payload?.pagination?.limit || state.counterPagination.limit || 100)
			const hasNext = Boolean(payload?.pagination?.hasNext)
			const currentPage = Number(payload?.pagination?.page || page)
			state.counterPagination = { page: currentPage, limit, total: totalRecords, hasNext }
			setContext(state.counterDate ? `Showing counter tickets for ${state.counterDate}` : 'Showing all counter-issued tickets')
			console.debug('[admin] counter loaded', {
				date: state.counterDate,
				returned: state.counterTickets.length,
				total: state.counterPagination.total,
				page: state.counterPagination.page,
			})
			renderTable()
		} catch (error) {
			console.error('Failed to fetch counter tickets', error)
			state.counterTickets = []
			state.counterPagination = { page: 1, limit: state.counterPagination.limit, total: 0, hasNext: false }
			setEmpty('Unable to load counter tickets')
		}
	}

	const exportCsv = () => {
		if (!state.counterTickets.length) return
		const header = ['Counter Ticket ID', 'Issue Date & Time', 'Ticket Type', 'Quantity', 'Amount', 'Payment Mode', 'Issued By', 'Breakdown']
		const csvRows = [header.join(',')]
		state.counterTickets.forEach((t) => {
			const displayType = summarizeItemsCompact(t.items, 2)
			const displayQuantity = t.hasBreakdown ? (t.quantityTotal || '—') : '—'
			const breakdown = Array.isArray(t.items)
				? t.items
						.map((i) => {
							const label = (i.label || i.itemCode || 'Item').replace(/,/g, ';')
							const qty = Number(i.quantity || 0)
							const unit = Number(i.unitPrice || 0)
							const amount = Number((i.amount ?? (qty * unit)) || 0)
							const pricePart = unit === 0 ? 'FREE' : unit
							return `${label} x${qty} @${pricePart}=${amount}`
						})
						.join(' | ')
				: ''
			csvRows.push([
				t.ticketId,
				formatDateTime(t.issueDate),
				displayType,
				displayQuantity,
				t.totalAmount,
				t.paymentMode,
				t.issuedBy || '',
				breakdown,
			].join(','))
		})
		const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' })
		const url = URL.createObjectURL(blob)
		const link = document.createElement('a')
		link.href = url
		link.download = `counter-tickets-${state.counterDate || 'selected'}.csv`
		link.click()
		URL.revokeObjectURL(url)
	}

	const openBreakdown = (ticketId) => {
		if (!breakdownModal || !breakdownBody) return
		const ticket = state.counterTickets.find((t) => t.ticketId === ticketId)
		breakdownBody.innerHTML = '<p>No breakdown available.</p>'
		if (ticket && Array.isArray(ticket.items) && ticket.items.length) {
			breakdownBody.innerHTML = `
				<div class="detail-list">
					${ticket.items
						.map(
							(item) => `
							<div>
								<strong>${item.label || item.itemCode || 'Item'}</strong>
								<div>Quantity: ${item.quantity}</div>
								<div>Unit Price: ${Number(item.unitPrice || 0) === 0 ? 'FREE' : formatINR(item.unitPrice)}</div>
								<div>Line Total: ${formatINR(item.amount)}</div>
							</div>
						`,
						)
						.join('')}
				</div>
			`
		}
		// lock background and attach cleanup
		_modalState.lastFocused = document.activeElement
		lockBodyForModal()
		attachModalCleanup(breakdownModal)
		try { breakdownModal.showModal() } catch (_) { breakdownModal.setAttribute('open', '') }
	}

	dateFilter?.addEventListener('change', (event) => {
		const value = event.target?.value
		fetchCounterTickets(value, 1)
	})

	counterPrevBtn?.addEventListener('click', () => {
		const prevPage = Math.max(1, state.counterPagination.page - 1)
		fetchCounterTickets(state.counterDate, prevPage)
	})

	counterNextBtn?.addEventListener('click', () => {
		const nextPage = state.counterPagination.page + 1
		fetchCounterTickets(state.counterDate, nextPage)
	})

	tableBody.addEventListener('click', (event) => {
		const target = event.target
		if (!(target instanceof HTMLElement)) return
		if (target.dataset.action === 'view-ticket' && target.dataset.id) {
			openTicketPreview(target.dataset.id, { source: 'counter' })
		}
	})

	exportBtn?.addEventListener('click', exportCsv)
	fetchCounterTickets('', 1)

	breakdownModal?.addEventListener('click', (event) => {
		if (event.target === breakdownModal) breakdownModal.close()
	})
}

function setupScannerLogs() {
	const dateFilter = document.getElementById('logDateFilter')
	const searchInput = document.getElementById('logSearchInput')
	const tableBody = document.getElementById('logTableBody')
	if (!tableBody) return

	let searchTimeout

	const setMessage = (message) => {
		tableBody.innerHTML = `<tr><td colspan="5">${message}</td></tr>`
	}

	const renderTable = () => {
		if (!state.scannerLogs.length) {
			setMessage('No scan logs for the selected filters.')
			return
		}

		tableBody.innerHTML = state.scannerLogs
			.map(
				(log) => `
					<tr>
						<td>${log.bookingId || '—'}</td>
						<td>${log.ticketSource || '—'}</td>
						<td>${formatDateTime(log.scannedAt || log.timestamp)}</td>
						<td>${log.gateId || log.gate || '—'}</td>
						<td><span class="status-pill ${pillClass(log.result)}">${log.result}</span></td>
					</tr>
				`,
			)
			.join('')
	}

	const fetchScannerLogs = async () => {
		setMessage('Loading scan logs...')
		try {
			const params = new URLSearchParams()
			const date = dateFilter?.value?.trim()
			const bookingId = searchInput?.value?.trim()
			if (date) params.set('date', date)
			if (bookingId) params.set('bookingId', bookingId)
			const url = `${adminApiBase}/scanner-logs?${params.toString()}`
			console.debug('[admin] scanlogs fetch', { url })
			const payload = await adminFetch(url, {
				headers: adminAuthHeaders(),
			})
			state.scannerLogs = Array.isArray(payload?.data) ? payload.data : []
			console.debug('[admin] scanlogs loaded', {
				returned: state.scannerLogs.length,
				page: payload?.pagination?.page,
				total: payload?.pagination?.total,
			})
			renderTable()
		} catch (error) {
			console.error('Failed to fetch scan logs', error)
			state.scannerLogs = []
			setMessage('Unable to load scan logs.')
		}
	}

	dateFilter?.addEventListener('change', fetchScannerLogs)
	searchInput?.addEventListener('input', () => {
		clearTimeout(searchTimeout)
		searchTimeout = setTimeout(fetchScannerLogs, 250)
	})

	fetchScannerLogs()
	setupScannerLogs.render = fetchScannerLogs
}

function renderScannerLogs() {
	setupScannerLogs.render?.()
}

function setupAdoptions() {
	const tableBody = document.getElementById('adoptionTableBody')
	const detailModal = document.getElementById('adoptionDetailModal')
	const detailBody = document.getElementById('adoptionDetailBody')
	const extendModal = document.getElementById('extendAdoptionModal')
	const extendForm = document.getElementById('extendAdoptionForm')
	const extendLabel = document.getElementById('extendAdoptionLabel')

	if (!tableBody) return

	let extendTargetId = null

	const renderTable = () => {
		if (!state.adoptions.length) {
			tableBody.innerHTML = '<tr><td colspan="9">No adoption records available.</td></tr>'
			return
		}

		tableBody.innerHTML = state.adoptions
			.map((a) => {
				const disableCertificateActions = a.paymentStatus !== 'Paid'
				const disableIssued = a.paymentStatus !== 'Paid' || a.certificateStatus === 'Issued'
				return `
					<tr>
						<td>${a.id}</td>
						<td>${a.adopterName}</td>
						<td>${a.animalName}</td>
						<td>${a.species}</td>
						<td>${a.durationDays} days</td>
						<td>${formatINR(a.contributionAmount)}</td>
						<td><span class="status-pill ${pillClass(a.paymentStatus)}">${a.paymentStatus}</span></td>
						<td><span class="status-pill ${pillClass(a.certificateStatus)}">${a.certificateStatus}</span></td>
						<td class="actions">
							<button class="link" data-action="view" data-id="${a.id}">View</button>
							<button class="link" data-action="upload" data-id="${a.id}" ${disableCertificateActions ? 'disabled' : ''}>Upload Cert</button>
							<button class="link" data-action="issue" data-id="${a.id}" ${disableIssued ? 'disabled' : ''}>Mark Issued</button>
							<button class="link" data-action="extend" data-id="${a.id}">Extend</button>
						</td>
					</tr>
				`
			})
			.join('')
	}

	tableBody.addEventListener('click', (event) => {
		const target = event.target
		if (!(target instanceof HTMLElement)) return
		const action = target.dataset.action
		const id = target.dataset.id
		if (!action || !id) return
		const adoption = state.adoptions.find((a) => a.id === id)
		if (!adoption) return

		if (action === 'view') {
			if (!detailModal || !detailBody) return
			detailBody.innerHTML = detailList([
				['Adoption ID', adoption.id],
				['Adopter', adoption.adopterName],
				['Animal', adoption.animalName],
				['Species', adoption.species],
				['Duration', `${adoption.durationDays} days`],
				['Contribution', formatINR(adoption.contributionAmount)],
				['Payment Status', adoption.paymentStatus],
				['Certificate Status', adoption.certificateStatus],
				['Start Date', adoption.startDate],
				['End Date', adoption.endDate],
			])
				// lock background and attach cleanup
				_modalState.lastFocused = document.activeElement
				lockBodyForModal()
				attachModalCleanup(detailModal)
				try { detailModal.showModal() } catch (_) { detailModal.setAttribute('open', '') }
				return
		}

		if (action === 'upload') {
			if (adoption.paymentStatus !== 'Paid') return alert('Certificate upload only after payment success.')
			adoption.certificateStatus = 'Uploaded'
			renderTable()
			return
		}

		if (action === 'issue') {
			if (adoption.paymentStatus !== 'Paid') return
			adoption.certificateStatus = 'Issued'
			renderTable()
			return
		}

		if (action === 'extend') {
			extendTargetId = adoption.id
			if (extendLabel) extendLabel.textContent = `Extend ${adoption.id} (${adoption.animalName})`
			extendForm?.reset()
				// lock background and attach cleanup for extend modal
				_modalState.lastFocused = document.activeElement
				lockBodyForModal()
				attachModalCleanup(extendModal)
				try { extendModal?.showModal() } catch (_) { if (extendModal) extendModal.setAttribute('open', '') }
		}
	})

	extendForm?.addEventListener('submit', (event) => {
		event.preventDefault()
		if (!extendTargetId) return extendModal?.close()
		const formData = new FormData(extendForm)
		const days = Number(formData.get('days') || 0)
		if (!days || Number.isNaN(days)) return
		const adoption = state.adoptions.find((a) => a.id === extendTargetId)
		if (!adoption) return
		adoption.durationDays += days
		adoption.endDate = addDays(adoption.endDate, days)
		extendModal?.close()
		renderTable()
	})

	extendModal?.addEventListener('click', (event) => {
		if (event.target === extendModal) extendModal.close()
	})

	renderTable()
}

function setupReports() {
	const fromInput = document.getElementById('reportFrom')
	const toInput = document.getElementById('reportTo')
	const typeSelect = document.getElementById('reportType')
	const sourceSelect = document.getElementById('reportSourceFilter')
	const categorySelect = document.getElementById('reportCategoryFilter')
	const ticketFilterInput = document.getElementById('reportTicketFilter')
	const runBtn = document.getElementById('runReportBtn')
	const exportCsvBtn = document.getElementById('exportCsvBtn')
	const exportExcelBtn = document.getElementById('exportExcelBtn')
	const exportPdfBtn = document.getElementById('exportPdfBtn')
	const tableHead = document.getElementById('reportTableHead')
	const tableBody = document.getElementById('reportTableBody')
	const meta = document.getElementById('reportMeta')

	if (!fromInput || !toInput || !typeSelect || !tableHead || !tableBody) return

	const todayDate = today
	fromInput.value = todayDate
	toInput.value = todayDate

	const API_TYPE_MAP = {
		'daily-summary': 'daily-summary',
		'ticket-wise': 'ticket-wise',
		'category-wise': 'category-wise',
		'revenue-summary': 'category-wise',
		'entry-status': 'entry-compliance',
	}

	const setExportsEnabled = (enabled) => {
		const flag = !enabled
		if (exportCsvBtn) exportCsvBtn.disabled = flag
		if (exportExcelBtn) exportExcelBtn.disabled = flag
		if (exportPdfBtn) exportPdfBtn.disabled = flag
	}

	const resetTable = (message) => {
		tableHead.innerHTML = ''
		tableBody.innerHTML = `<tr><td>${message}</td></tr>`
		setExportsEnabled(false)
	}

	const updateSummaryCards = (rows, type) => {
		let totals = { tickets: 0, online: 0, counter: 0, revenue: 0, pending: 0 }
		if (type === 'daily-summary' && Array.isArray(rows)) {
			rows.forEach((row) => {
				totals.tickets += Number(row.tickets || 0)
				totals.online += Number(row.onlineTickets || 0)
				totals.counter += Number(row.counterTickets || 0)
				totals.revenue += Number(row.revenue || 0)
			})
		}
		setTextSafe('reportTotalTickets', totals.tickets ? totals.tickets.toLocaleString('en-IN') : '--')
		setTextSafe('reportOnlineTickets', totals.online ? totals.online.toLocaleString('en-IN') : '--')
		setTextSafe('reportCounterTickets', totals.counter ? totals.counter.toLocaleString('en-IN') : '--')
		setTextSafe('reportTotalRevenue', totals.revenue ? formatINR(totals.revenue) : '₹ --')
	}

	const renderCategoryCharts = () => {}

	const renderTrendChart = () => {}

	const renderReportTable = (type, rows) => {
		let headers = []
		if (type === 'daily-summary') {
			headers = ['Date', 'Total Tickets', 'Online Tickets', 'Counter Tickets', 'Revenue (₹)', 'Online Revenue', 'Counter Revenue']
			tableHead.innerHTML = `<tr>${headers.map((h) => `<th>${h}</th>`).join('')}</tr>`
			tableBody.innerHTML = rows.length
				? rows
						.map(
							(row) => `
								<tr>
									<td>${escapeHtml(row._id)}</td>
									<td>${Number(row.tickets || 0)}</td>
									<td>${Number(row.onlineTickets || 0)}</td>
									<td>${Number(row.counterTickets || 0)}</td>
									<td>${formatINR(row.revenue || 0)}</td>
									<td>${formatINR(row.onlineRevenue || 0)}</td>
									<td>${formatINR(row.counterRevenue || 0)}</td>
								</tr>`
						)
						.join('')
				: '<tr><td colspan="7">No data for range.</td></tr>'
			renderTrendChart(rows)
		} else if (type === 'ticket-wise') {
			headers = ['Ticket Type', 'Quantity', 'Amount (₹)']
			tableHead.innerHTML = `<tr>${headers.map((h) => `<th>${h}</th>`).join('')}</tr>`
			const ordered = [...rows].sort((a, b) => {
				const orderA = TARIFF_DISPLAY_ORDER[a?._id] || 999
				const orderB = TARIFF_DISPLAY_ORDER[b?._id] || 999
				return orderA - orderB || (a.ticketType || a._id || '').localeCompare(b.ticketType || b._id || '')
			})
			tableBody.innerHTML = ordered.length
				? ordered
						.map(
							(row) => `<tr><td>${escapeHtml(row.ticketType || row._id || 'Ticket')}</td><td>${Number(row.quantity || 0)}</td><td>${formatINR(row.amount || 0)}</td></tr>`,
						)
						.join('')
				: '<tr><td colspan="3">No tickets in range.</td></tr>'
			renderTrendChart(ordered.map((r) => ({ _id: r.ticketType || r._id, quantity: r.quantity || 0 })))
		} else if (type === 'category-wise' || type === 'revenue-summary') {
			headers = ['Category', 'Quantity', 'Revenue (₹)']
			tableHead.innerHTML = `<tr>${headers.map((h) => `<th>${h}</th>`).join('')}</tr>`
			tableBody.innerHTML = rows.length
				? rows
						.map(
							(row) => `<tr><td>${escapeHtml(mapCategory(row._id))}</td><td>${Number(row.quantity || 0)}</td><td>${formatINR(row.amount || 0)}</td></tr>`,
						)
						.join('')
				: '<tr><td colspan="3">No categories in range.</td></tr>'
			renderCategoryCharts(rows)
		} else if (type === 'entry-compliance') {
			headers = ['Metric', 'Value']
			tableHead.innerHTML = `<tr>${headers.map((h) => `<th>${h}</th>`).join('')}</tr>`
			tableBody.innerHTML = rows.length
				? rows
						.map((row) => `<tr><td>${escapeHtml(row.metric)}</td><td>${Number(row.value || 0)}</td></tr>`)
						.join('')
				: '<tr><td colspan="2">No entry data.</td></tr>'
			renderTrendChart([])
		}
	}

	const getFilters = () => {
		return {
			from: fromInput.value,
			to: toInput.value,
			uiType: typeSelect.value,
			source: sourceSelect?.value || '',
			category: categorySelect?.value || '',
			ticketFilter: ticketFilterInput?.value?.trim() || '',
		}
	}

	const runReport = async (exportFormat = 'json') => {
		const { from, to, uiType, source, category, ticketFilter } = getFilters()
		if (!from || !to || !uiType) {
			resetTable('Select from/to dates and report type.')
			return
		}

		const apiType = API_TYPE_MAP[uiType] || 'daily-summary'
		const params = new URLSearchParams({ type: apiType, from, to })
		if (source) params.set('source', source)
		if (category) params.set('category', category)
		if (exportFormat !== 'json') params.set('format', exportFormat)

		if (meta) meta.textContent = exportFormat === 'json' ? 'Running report...' : 'Preparing export...'
		setExportsEnabled(false)

		try {
			if (exportFormat !== 'json') {
				const res = await fetch(`${adminApiBase}/reports?${params.toString()}`, {
					headers: adminAuthHeaders(),
				})
				if (!res.ok) throw new Error('Export failed')
				const blob = await res.blob()
				const link = document.createElement('a')
				const extension = exportFormat === 'excel' ? 'xlsx' : exportFormat === 'pdf' ? 'pdf' : 'csv'
				link.href = URL.createObjectURL(blob)
				link.download = `${uiType}-${from}-${to}.${extension}`
				link.click()
				URL.revokeObjectURL(link.href)
				if (meta) meta.textContent = `Exported ${uiType} for ${from} to ${to}`
				return
			}

			const data = await adminFetch(`${adminApiBase}/reports?${params.toString()}`, {
				headers: adminAuthHeaders(),
			})
			if (data?.success === false) throw new Error(data?.message || 'Report fetch failed')

			let rows = Array.isArray(data.rows) ? data.rows : []
			if (uiType === 'ticket-wise' && ticketFilter) {
				const needle = ticketFilter.toLowerCase()
				rows = rows.filter((r) => (r.ticketType || r._id || '').toLowerCase().includes(needle))
			}
			renderReportTable(apiType, rows)
			updateSummaryCards(rows, apiType)
			setExportsEnabled(rows.length > 0)
			if (meta) meta.textContent = `Showing ${uiType} for ${from} to ${to}`
		} catch (error) {
			console.error('Report error', error)
			resetTable(error?.message || 'Unable to load report')
			if (meta) meta.textContent = ''
		}
	}

	runBtn?.addEventListener('click', () => runReport('json'))
	exportCsvBtn?.addEventListener('click', () => runReport('csv'))
	exportExcelBtn?.addEventListener('click', () => runReport('excel'))
	exportPdfBtn?.addEventListener('click', () => runReport('pdf'))
}

function detailList(pairs) {
	return `
		<dl class="detail-list">
			${pairs
				.map((pair) => {
					const [label, value] = pair
					return `<div><dt>${label}</dt><dd>${value}</dd></div>`
				})
				.join('')}
		</dl>
	`
}

function formatDateTime(value) {
	if (!value) return '—'
	const date = new Date(value)
	if (Number.isNaN(date.getTime())) return value
	return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

function formatCount(value) {
	if (Array.isArray(value)) {
		const total = value.reduce((sum, item) => sum + Number(item?.quantity || 0), 0)
		return total || '—'
	}
	const numeric = Number(value)
	if (Number.isFinite(numeric) && numeric > 0) return numeric
	return '—'
}

function summarizeItems(items) {
	if (!Array.isArray(items) || !items.length) return '—'
	if (items.length === 1) return items[0]?.itemLabel || items[0]?.category || '—'
	return `${items.length} items`
}

function formatINR(value) {
	return `₹ ${Number(value || 0).toLocaleString('en-IN')}`
}

function mapCategory(value) {
	const normalized = (value || '').toString().toLowerCase()
	if (normalized === 'zoo' || normalized === 'entry') return 'Entry'
	if (normalized === 'parking') return 'Parking'
	if (normalized === 'transport') return 'Transport'
	if (normalized === 'camera') return 'Camera'
	return value || 'Category'
}

function escapeHtml(value) {
	return String(value || '')
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;')
}

function pillClass(status) {
	const normalized = status?.toLowerCase() || ''
	if (normalized.includes('paid') || normalized.includes('valid') || normalized.includes('issued')) return 'success'
	if (normalized.includes('pending') || normalized.includes('not')) return 'warning'
	if (normalized.includes('fail') || normalized.includes('cancel') || normalized.includes('invalid')) return 'danger'
	return 'info'
}

function addDays(dateString, days) {
	const date = new Date(dateString)
	if (Number.isNaN(date.getTime())) return dateString
	date.setDate(date.getDate() + days)
	return date.toISOString().slice(0, 10)
}

function isWithin(date, from, to) {
	if (!date || !from || !to) return false
	return date >= from && date <= to
}

// FINAL BIND — after full parse
document.addEventListener('DOMContentLoaded', () => {
	[
		'setupDashboard',
		'setupBookings',
		'setupCounterTickets',
		'setupScannerLogs',
		'setupAdoptions',
		'setupReports',
		'setupAnalytics',
	].forEach((name) => {
		if (typeof window[name] !== 'function' && typeof globalThis[name] === 'function') {
			window[name] = globalThis[name]
		}
	})

	if (page === 'login' && typeof initLogin === 'function') {
		initLogin()
		return
	}

	if (page === 'dashboard' && typeof guardDashboard === 'function' && typeof initDashboard === 'function') {
		guardDashboard()
		initDashboard()
		return
	}

	if (page === 'users' && typeof guardAdminPage === 'function' && typeof initUserManagement === 'function') {
		guardAdminPage()
		initUserManagement()
	}
})



