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
		credentials: 'include',
		...options,
		headers: {
			...adminAuthHeaders(),
			...(options.headers || {}),
		},
	}

	const res = await fetch(url, opts)

	if (res.status === 401 || res.status === 403) {
		await logoutAdmin({ redirect: true })
		throw new Error('Admin session is not valid. Please sign in again.')
	}

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

function clearLocalAdminSession() {
	sessionStorage.removeItem('token')
	sessionStorage.removeItem('role')
	sessionStorage.removeItem('isLoggedIn')
	sessionStorage.removeItem('user')
	localStorage.removeItem('token')
	localStorage.removeItem('role')
}

async function logoutAdmin({ redirect = false } = {}) {
	clearLocalAdminSession()

	try {
		await fetch(`${backendOrigin}/api/auth/logout`, {
			method: 'POST',
			credentials: 'include',
		})
	} catch (_err) {
		// Ignore logout network failures and still clear client state.
	}

	if (redirect) {
		window.location.href = '/admin/login'
	}
}

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
	bookingPagination: { page: 1, limit: 15, total: 0, hasNext: false },
	bookingFilters: { date: '', entry: 'all', search: '' },
	counterTickets: [],
	counterPagination: { page: 1, limit: 15, total: 0, hasNext: false },
	counterDate: '',
	scannerLogs: [],
	adoptions: [],
	analyticsFilter: { range: 'today', from: today, to: today },
	analytics: {
		summary: null,
		ticketTypes: [],
		categories: [],
		sourceSplit: [],
		entries: null,
		scanlogs: null,
	},
}

let analyticsSetupDone = false

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
						<div><strong>Booked At:</strong> ${data.bookedAt ? formatDateTime(data.bookedAt) : (data.issueDate ? formatDateTime(data.issueDate) : '—')}</div>
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
						<div><strong>Ticket Count:</strong> ${formatCount(data.ticketCount ?? data.items)}</div>
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
	const normalizedPath = pathname.toLowerCase()
	if (/\/admin\/counter\/[^/]+\/print\/?$/.test(normalizedPath)) return 'counter-print'
	if (normalizedPath.includes('/admin/booking/')) return 'booking-detail'
	if (/\/admin\/counter\/[^/]+\/?$/.test(normalizedPath)) return 'counter-detail'
	const last = pathname.split('/').filter(Boolean).pop() || ''
	const cleaned = last.split('?')[0].split('#')[0].toLowerCase()
	if (!cleaned || cleaned === 'admin' || cleaned === 'index' || cleaned === 'index.html') return 'login'
	if (cleaned === 'dashboard' || cleaned === 'dashboard.html') return 'dashboard'
	if (cleaned === 'users' || cleaned === 'users.html') return 'users'
	if (cleaned === 'booking' || cleaned === 'booking.html') return 'booking-detail'
	if (cleaned === 'counter-ticket' || cleaned === 'counter-ticket.html') return 'counter-detail'
	if (cleaned === 'login' || cleaned === 'login.html') return 'login'
	return cleaned
})()

const getCounterTicketIdFromLocation = () => {
	const parts = (window.location.pathname || '').split('/').filter(Boolean)
	const idx = parts.findIndex((part) => part.toLowerCase() === 'counter')
	if (idx >= 0 && parts[idx + 1]) return decodeURIComponent(parts[idx + 1])
	return new URLSearchParams(window.location.search).get('ticketId') || ''
}

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
		window.location.href = '/admin/login'
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
		localStorage.setItem('token', data.token)
		localStorage.setItem('role', data.role)
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

		loginWithCredentials({ email, password, secretCode: otp, expectedRole: 'ADMIN', errorBox, onSuccess: () => window.location.href = '/admin/dashboard.html' })
	})
}

function guardDashboard() {
	const role = getCurrentRole()
	if (!role) {
		window.location.href = '/admin/login'
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
			if (!target) return
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
		void logoutAdmin({ redirect: true })
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
		void logoutAdmin({ redirect: true })
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

const RANGE_LABELS = {
	today: 'Today',
	yesterday: 'Yesterday',
	last7: 'Last 7 Days',
	month: 'This Month',
	custom: 'Custom Range',
}

const startOfMonthIso = (value) => {
	const date = new Date(value)
	if (Number.isNaN(date.getTime())) return ''
	date.setDate(1)
	return date.toISOString().slice(0, 10)
}

const normalizeDateInput = (value) => {
	if (!value) return ''
	const date = new Date(value)
	return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10)
}

const deriveRange = (filter = {}) => {
	const { range, from, to } = filter
	const preset = (range || 'today').toString().toLowerCase()
	if (preset === 'today') return { range: 'today', from: today, to: today }
	if (preset === 'yesterday') {
		const y = addDays(today, -1)
		return { range: 'yesterday', from: y, to: y }
	}
	if (preset === 'last7') return { range: 'last7', from: addDays(today, -6), to: today }
	if (preset === 'month') return { range: 'month', from: startOfMonthIso(today), to: today }
	return { range: 'custom', from: normalizeDateInput(from), to: normalizeDateInput(to) }
}

const rangeLabel = (filter) => {
	const resolved = deriveRange(filter)
	if (resolved.range === 'custom') {
		if (resolved.from && resolved.to) return `${resolved.from} to ${resolved.to}`
		return RANGE_LABELS.custom
	}
	return RANGE_LABELS[resolved.range] || 'All Dates'
}

const buildAnalyticsQuery = (filter) => {
	const resolved = deriveRange(filter)
	const params = new URLSearchParams()
	if (resolved.range === 'custom') {
		if (resolved.from && resolved.to) {
			params.set('from', resolved.from)
			params.set('to', resolved.to)
		}
	} else {
		params.set('range', resolved.range)
	}
	return params.toString() ? `?${params.toString()}` : ''
}

const syncReportRange = (filter) => {
	const resolved = deriveRange(filter)
	const reportFrom = document.getElementById('reportFrom')
	const reportTo = document.getElementById('reportTo')
	if (reportFrom) reportFrom.value = resolved.from || ''
	if (reportTo) reportTo.value = resolved.to || ''
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
	if (analyticsSetupDone) return
	analyticsSetupDone = true

	const toggle = document.getElementById('dateRangeToggle')
	const labelEl = document.getElementById('dateRangeLabel')
	const menu = document.getElementById('dateRangeMenu')
	const customFields = document.getElementById('customRangeFields')
	const fromInput = document.getElementById('rangeFrom')
	const toInput = document.getElementById('rangeTo')
	const applyBtn = document.getElementById('applyRangeBtn')
	const statusEl = document.getElementById('analyticsStatus')
	const messageEl = document.getElementById('rangeMessage')

	const closeMenu = () => menu?.classList.add('hidden')
	const openMenu = () => menu?.classList.remove('hidden')

	const syncUi = () => {
		const resolved = deriveRange(state.analyticsFilter)
		state.analyticsFilter = resolved
		if (labelEl) labelEl.textContent = rangeLabel(resolved)
		if (customFields) {
			if (resolved.range === 'custom') customFields.classList.remove('hidden')
			else customFields.classList.add('hidden')
		}
		if (fromInput) fromInput.value = resolved.range === 'custom' ? resolved.from || '' : ''
		if (toInput) toInput.value = resolved.range === 'custom' ? resolved.to || '' : ''
		if (messageEl) messageEl.textContent = ''
		syncReportRange(resolved)
	}

	toggle?.addEventListener('click', (event) => {
		event.stopPropagation()
		if (menu?.classList.contains('hidden')) openMenu()
		else closeMenu()
	})

	document.addEventListener('click', (event) => {
		if (!menu) return
		if (menu.contains(event.target) || toggle?.contains(event.target)) return
		closeMenu()
	})

	if (menu) {
		menu.querySelectorAll('button[data-range]').forEach((btn) => {
			btn.addEventListener('click', () => {
				const selected = btn.dataset.range || 'today'
				if (messageEl) messageEl.textContent = ''
				if (selected === 'custom') {
					const currentFrom = normalizeDateInput(fromInput?.value) || today
					const currentTo = normalizeDateInput(toInput?.value) || today
					state.analyticsFilter = deriveRange({ range: 'custom', from: currentFrom, to: currentTo })
					syncUi()
					closeMenu()
					return
				}
				state.analyticsFilter = deriveRange({ range: selected })
				syncUi()
				closeMenu()
				loadAnalytics()
			})
		})
	}

	applyBtn?.addEventListener('click', () => {
		const from = normalizeDateInput(fromInput?.value)
		const to = normalizeDateInput(toInput?.value)
		if (!from || !to) {
			if (messageEl) messageEl.textContent = 'Select both From and To dates.'
			return
		}
		if (from > to) {
			if (messageEl) messageEl.textContent = 'From date cannot be greater than To date.'
			window.alert('From date cannot be greater than To date.')
			return
		}
		if (messageEl) messageEl.textContent = ''
		state.analyticsFilter = { range: 'custom', from, to }
		syncUi()
		closeMenu()
		loadAnalytics()
	})

	syncUi()
	if (statusEl) statusEl.textContent = 'Loading analytics...'
	loadAnalytics()
}

async function loadAnalytics() {
	const statusEl = document.getElementById('analyticsStatus')
	const messageEl = document.getElementById('rangeMessage')
	const resolvedFilter = deriveRange(state.analyticsFilter)
	state.analyticsFilter = resolvedFilter
	const query = buildAnalyticsQuery(resolvedFilter)
	const label = rangeLabel(resolvedFilter)
	const fetchDashboard = async () => {
		const url = `${adminApiBase}/dashboard${query}`
		console.debug('[admin] dashboard fetch', { url })
		const data = await adminFetch(url)
		if (data?.success === false) throw new Error(data?.message || 'Dashboard fetch failed')
		return data
	}

	const fetchLegacy = async () => {
		const fetchJson = async (path) => {
			const url = `${adminApiBase}${path}${query}`
			console.debug('[admin] analytics fetch', { url })
			const data = await adminFetch(url)
			if (data?.success === false) throw new Error(data?.message || 'Analytics fetch failed')
			return data
		}

		const [summary, ticketTypes, categories, sourceSplit, entries, scanlogs] = await Promise.all([
			fetchJson('/analytics/summary'),
			fetchJson('/analytics/ticket-types'),
			fetchJson('/analytics/categories'),
			fetchJson('/analytics/source-split'),
			fetchJson('/analytics/entries'),
			fetchJson('/analytics/scanlogs'),
		])

		return {
			summary,
			ticketTypes: ticketTypes?.rows || [],
			categories: categories?.rows || [],
			sourceSplit: sourceSplit?.rows || [],
			entries: entries || null,
			scanlogs: scanlogs || null,
		}
	}

	try {
		if (messageEl) messageEl.textContent = ''
		if (statusEl) statusEl.textContent = `Loading ${label.toLowerCase()}...`
		state.analytics.summary = null
		state.analytics.ticketTypes = []
		state.analytics.categories = []
		state.analytics.sourceSplit = []
		state.analytics.entries = null
		state.analytics.scanlogs = null

		let dashboardData
		try {
			dashboardData = await fetchDashboard()
		} catch (dashboardError) {
			console.warn('[admin] dashboard endpoint unavailable, using analytics fallback', dashboardError)
			dashboardData = await fetchLegacy()
		}

		state.analytics.summary = dashboardData?.summary || null
		state.analytics.ticketTypes = Array.isArray(dashboardData?.ticketTypes) ? dashboardData.ticketTypes : []
		state.analytics.categories = Array.isArray(dashboardData?.categories) ? dashboardData.categories : []
		state.analytics.sourceSplit = Array.isArray(dashboardData?.sourceSplit) ? dashboardData.sourceSplit : []
		state.analytics.entries = dashboardData?.entries || null
		state.analytics.scanlogs = dashboardData?.scanlogs || null
		console.debug('[admin] analytics loaded', {
			filter: resolvedFilter,
			summary: state.analytics.summary,
			ticketTypes: state.analytics.ticketTypes.length,
			categories: state.analytics.categories.length,
			sourceSplit: state.analytics.sourceSplit.length,
			entries: state.analytics.entries,
			scanlogs: state.analytics.scanlogs,
		})

		renderOverview()
		renderTicketDistribution()
		renderCategoryChart()
		if (statusEl) statusEl.textContent = label
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
		console.error('[admin] analytics error', { filter: resolvedFilter, error })
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
					<td>${b.bookedAt ? formatDateTime(b.bookedAt) : (b.issueDate ? formatDateTime(b.issueDate) : '—')}</td>
					<td>${formatCount(b.ticketCount ?? b.items)}</td>
					<td>${formatINR(b.totalAmount)}</td>
					<td><span class="status-pill ${pillClass(b.entryStatus)}">${b.entryStatus || 'Not Entered'}</span></td>
					<td class="actions">
						<button class="link" data-action="view" data-id="${b.ticketId}">View</button>
						<button class="link" data-action="resend" data-id="${b.ticketId}">Resend</button>
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
			entryStatus: entryFilter?.value || 'all',
			search: searchInput?.value?.trim() || '',
			page,
			limit: state.bookingPagination.limit,
		}

		state.bookingFilters = { date: filters.visitDate, entry: filters.entryStatus, search: filters.search }

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

	const openAdminBookingDetailsPage = (ticketId) => {
		if (!ticketId) return
		window.location.href = `/admin/booking/${encodeURIComponent(ticketId)}`
	}

	dateFilter?.addEventListener('change', () => fetchBookings(1))
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

		if (action === 'view') return openAdminBookingDetailsPage(id)
		if (action === 'resend') return requestResend(id)
	})

	fetchBookings(1)
}

function initBookingDetailsPage() {
	const titleEl = document.getElementById('bookingDetailTitle')
	const messageEl = document.getElementById('bookingDetailMessage')
	const qrImageEl = document.getElementById('detailQrImage')
	const qrPlaceholderEl = document.getElementById('detailQrPlaceholder')
	const resendBtn = document.getElementById('detailResendBtn')
	const downloadBtn = document.getElementById('detailDownloadBtn')
	const viewQrBtn = document.getElementById('detailViewQrBtn')
	const backBtn = document.getElementById('backToBookingsBtn')
	const logoutBtn = document.getElementById('logoutBtn')

	const setField = (id, value) => {
		const el = document.getElementById(id)
		if (el) el.textContent = value
	}

	const setMessage = (text, tone = 'muted') => {
		if (!messageEl) return
		messageEl.textContent = text || ''
		messageEl.style.color = tone === 'error' ? 'var(--danger)' : 'var(--muted)'
	}

	const ticketIdFromPath = (() => {
		const parts = (window.location.pathname || '').split('/').filter(Boolean)
		const idx = parts.findIndex((part) => part.toLowerCase() === 'booking')
		if (idx >= 0 && parts[idx + 1]) return decodeURIComponent(parts[idx + 1])
		return new URLSearchParams(window.location.search).get('ticketId') || ''
	})()

	if (!ticketIdFromPath) {
		setMessage('Missing booking ID.', 'error')
		return
	}

	if (titleEl) titleEl.textContent = `Booking Details: ${ticketIdFromPath}`
	setField('detailBookingId', ticketIdFromPath)

	backBtn?.addEventListener('click', () => {
		window.location.href = '/admin/dashboard.html#bookings'
	})

	logoutBtn?.addEventListener('click', () => {
		void logoutAdmin({ redirect: true })
	})

	let bookingData = null

	const wireActions = () => {
		resendBtn?.addEventListener('click', async () => {
			try {
				const confirmed = confirm('Resend ticket communication to the visitor?')
				if (!confirmed) return
				resendBtn.disabled = true
				const payload = await adminFetch(`${adminApiBase}/bookings/${encodeURIComponent(ticketIdFromPath)}/resend`, {
					method: 'POST',
				})
				setMessage(payload?.message || 'Resend queued.')
			} catch (error) {
				setMessage(error?.message || 'Resend failed.', 'error')
			} finally {
				resendBtn.disabled = false
			}
		})

		downloadBtn?.addEventListener('click', () => {
			window.open(`/admin/ticket/download/${encodeURIComponent(ticketIdFromPath)}`, '_blank')
		})

		viewQrBtn?.addEventListener('click', () => {
			if (!bookingData?.qrImage) {
				setMessage('QR code is not available for this booking.', 'error')
				return
			}
			window.open(bookingData.qrImage, '_blank')
		})
	}

	const renderBooking = (data) => {
		bookingData = data || {}
		const source = (data?.ticketSource || 'ONLINE').toString().toUpperCase()
		const sourceLabel = source === 'ONLINE' ? 'Online' : source
		const countValue = Number(data?.ticketCount || formatCount(data?.items) || 0)

		setField('detailBookingId', data?.ticketId || ticketIdFromPath)
		setField('detailVisitorName', data?.visitorName || '—')
		setField('detailVisitorMobile', data?.visitorMobile || '—')
		setField('detailVisitDate', data?.visitDate || '—')
		setField('detailBookedAt', data?.bookedAt ? formatDateTime(data.bookedAt) : (data?.issueDate ? formatDateTime(data.issueDate) : '—'))
		setField('detailTicketCount', Number.isFinite(countValue) && countValue > 0 ? String(countValue) : '—')
		setField('detailTotalAmount', formatINR(data?.totalAmount || 0))
		setField('detailTicketSource', sourceLabel)

		const entryEl = document.getElementById('detailEntryStatus')
		if (entryEl) {
			const statusText = data?.entryStatus || 'Not Entered'
			entryEl.innerHTML = `<span class="status-pill ${pillClass(statusText)}">${escapeHtml(statusText)}</span>`
		}

		if (qrImageEl) {
			if (data?.qrImage) {
				qrImageEl.src = data.qrImage
				qrImageEl.alt = 'Booking QR code'
				qrImageEl.classList.remove('hidden')
				if (qrPlaceholderEl) qrPlaceholderEl.classList.add('hidden')
				if (viewQrBtn) viewQrBtn.disabled = false
			} else {
				qrImageEl.removeAttribute('src')
				qrImageEl.classList.add('hidden')
				if (qrPlaceholderEl) qrPlaceholderEl.classList.remove('hidden')
				if (viewQrBtn) viewQrBtn.disabled = true
			}
		}
	}

	wireActions()

	setMessage('Loading booking details...')
	adminFetch(`${adminApiBase}/bookings/${encodeURIComponent(ticketIdFromPath)}`, {
		headers: adminAuthHeaders(),
	})
		.then((data) => {
			renderBooking(data)
			setMessage('')
		})
		.catch((error) => {
			setMessage(error?.message || 'Unable to load booking details.', 'error')
		})
}

function setupCounterTickets() {
	const fromDateFilter = document.getElementById('counterFromDateFilter')
	const toDateFilter = document.getElementById('counterToDateFilter')
	const paymentModeFilter = document.getElementById('counterPaymentModeFilter')
	const searchInput = document.getElementById('counterSearchInput')
	const tableBody = document.getElementById('counterTableBody')
	const counterPageLabel = document.getElementById('counterPageLabel')
	const counterPrevBtn = document.getElementById('counterPrevBtn')
	const counterNextBtn = document.getElementById('counterNextBtn')
	const counterContextLabel = document.getElementById('counterContextLabel')

	if (!tableBody) return

	let searchTimeout

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

	const readFilters = () => ({
		from: fromDateFilter?.value || '',
		to: toDateFilter?.value || '',
		paymentMode: (paymentModeFilter?.value || 'ALL').toUpperCase(),
		search: searchInput?.value?.trim() || '',
	})

	const buildContextText = (filters) => {
		const parts = []
		if (filters.from) parts.push(`From ${filters.from}`)
		if (filters.to) parts.push(`To ${filters.to}`)
		if (filters.paymentMode && filters.paymentMode !== 'ALL') parts.push(`Payment ${filters.paymentMode}`)
		if (filters.search) parts.push(`Ticket ID contains "${filters.search}"`)
		return parts.length ? `Filtered by: ${parts.join(' | ')}` : 'Showing all counter-issued tickets.'
	}

	const validateDateRange = (filters) => {
		if (filters.from && filters.to && filters.from > filters.to) {
			setContext('From date cannot be greater than To date.')
			return false
		}
		return true
	}

	const setEmpty = (message) => {
		tableBody.innerHTML = `<tr><td colspan="8">${escapeHtml(message)}</td></tr>`
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
			setEmpty('No counter tickets for the selected filters.')
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
		updatePagination()
	}

	const buildQuery = (page = 1) => {
		const filters = readFilters()
		const params = new URLSearchParams()
		if (filters.from) params.set('from', filters.from)
		if (filters.to) params.set('to', filters.to)
		if (filters.paymentMode && filters.paymentMode !== 'ALL') params.set('paymentMode', filters.paymentMode)
		if (filters.search) params.set('search', filters.search)
		params.set('page', page)
		params.set('limit', state.counterPagination.limit)
		return { params, filters }
	}

	const fetchCounterTickets = async (page = 1) => {
		const { params, filters } = buildQuery(page)
		if (!validateDateRange(filters)) {
			state.counterTickets = []
			state.counterPagination = { ...state.counterPagination, page: 1, total: 0, hasNext: false }
			setEmpty('Select a valid date range to continue.')
			return
		}

		setEmpty('Loading counter tickets...')
		try {
			const url = `${backendOrigin}/api/counter/history?${params.toString()}`
			console.debug('[admin] counter fetch', { url })
			const payload = await adminFetch(url, {
				headers: adminAuthHeaders(),
			})

			state.counterTickets = Array.isArray(payload?.tickets) ? payload.tickets : []
			const totalRecords = Number(payload?.pagination?.total || state.counterTickets.length || 0)
			const limit = Number(payload?.pagination?.limit || state.counterPagination.limit || 15)
			const hasNext = Boolean(payload?.pagination?.hasNext)
			const currentPage = Number(payload?.pagination?.page || page)
			state.counterPagination = { page: currentPage, limit, total: totalRecords, hasNext }
			setContext(buildContextText(filters))
			console.debug('[admin] counter loaded', {
				filters,
				returned: state.counterTickets.length,
				total: state.counterPagination.total,
				page: state.counterPagination.page,
			})
			renderTable()
		} catch (error) {
			console.error('Failed to fetch counter tickets', error)
			state.counterTickets = []
			state.counterPagination = { page: 1, limit: state.counterPagination.limit, total: 0, hasNext: false }
			setEmpty(error?.message || 'Unable to load counter tickets')
		}
	}

	const openCounterTicketDetailsPage = (ticketId) => {
		if (!ticketId) return
		window.location.href = `/admin/counter/${encodeURIComponent(ticketId)}`
	}

	fromDateFilter?.addEventListener('change', () => fetchCounterTickets(1))
	toDateFilter?.addEventListener('change', () => fetchCounterTickets(1))
	paymentModeFilter?.addEventListener('change', () => fetchCounterTickets(1))
	searchInput?.addEventListener('input', () => {
		clearTimeout(searchTimeout)
		searchTimeout = setTimeout(() => fetchCounterTickets(1), 250)
	})

	counterPrevBtn?.addEventListener('click', () => {
		const prevPage = Math.max(1, state.counterPagination.page - 1)
		fetchCounterTickets(prevPage)
	})

	counterNextBtn?.addEventListener('click', () => {
		const nextPage = state.counterPagination.page + 1
		fetchCounterTickets(nextPage)
	})

	tableBody.addEventListener('click', (event) => {
		const target = event.target
		if (!(target instanceof HTMLElement)) return
		if (target.dataset.action === 'view-ticket' && target.dataset.id) {
			openCounterTicketDetailsPage(target.dataset.id)
		}
	})

	fetchCounterTickets(1)
}

function initCounterTicketDetailsPage() {
	const titleEl = document.getElementById('counterDetailTitle')
	const messageEl = document.getElementById('counterDetailMessage')
	const itemsBody = document.getElementById('counterDetailItemsBody')
	const qrImageEl = document.getElementById('counterDetailQrImage')
	const qrPlaceholderEl = document.getElementById('counterDetailQrPlaceholder')
	const viewQrBtn = document.getElementById('counterDetailViewQrBtn')
	const printBtn = document.getElementById('counterDetailPrintBtn')
	const backBtn = document.getElementById('backToCounterBtn')
	const logoutBtn = document.getElementById('logoutBtn')

	const setField = (id, value) => {
		const el = document.getElementById(id)
		if (el) el.textContent = value
	}

	const setMessage = (text, tone = 'muted') => {
		if (!messageEl) return
		messageEl.textContent = text || ''
		messageEl.style.color = tone === 'error' ? 'var(--danger)' : 'var(--muted)'
	}

	const ticketIdFromPath = getCounterTicketIdFromLocation()

	if (!ticketIdFromPath) {
		setMessage('Missing counter ticket ID.', 'error')
		if (itemsBody) itemsBody.innerHTML = '<tr><td colspan="4">Missing counter ticket ID.</td></tr>'
		return
	}

	if (titleEl) titleEl.textContent = `Counter Ticket Details: ${ticketIdFromPath}`
	setField('counterDetailTicketId', ticketIdFromPath)

	backBtn?.addEventListener('click', () => {
		window.location.href = '/admin/dashboard.html#counter'
	})

	logoutBtn?.addEventListener('click', () => {
		void logoutAdmin({ redirect: true })
	})

	let ticketData = null

	viewQrBtn?.addEventListener('click', () => {
		if (!ticketData?.qrImage) {
			setMessage('QR code is not available for this ticket.', 'error')
			return
		}
		window.open(ticketData.qrImage, '_blank')
	})

	printBtn?.addEventListener('click', () => {
		const printUrl = `/admin/counter/${encodeURIComponent(ticketIdFromPath)}/print`
		const popup = window.open(printUrl, '_blank', 'noopener')
		if (!popup) {
			window.location.href = printUrl
		}
	})

	const renderItems = (items = []) => {
		if (!itemsBody) return
		if (!Array.isArray(items) || !items.length) {
			itemsBody.innerHTML = '<tr><td colspan="4">No stored item breakdown for this ticket.</td></tr>'
			return
		}

		itemsBody.innerHTML = items
			.map((item) => {
				const label = escapeHtml(item.label || item.itemLabel || item.itemCode || 'Item')
				const quantity = Number(item.quantity || 0)
				const unitPrice = Number(item.unitPrice ?? item.price ?? 0)
				const amount = Number(item.amount ?? quantity * unitPrice)
				const unitDisplay = Number(unitPrice) === 0 ? 'FREE' : formatINR(unitPrice)
				const amountDisplay = Number(amount) === 0 ? 'FREE' : formatINR(amount)
				return `
					<tr>
						<td>${label}</td>
						<td>${quantity || '—'}</td>
						<td>${unitDisplay}</td>
						<td>${amountDisplay}</td>
					</tr>
				`
			})
			.join('')
	}

	const renderTicket = (ticket) => {
		ticketData = ticket || {}
		const items = Array.isArray(ticketData.items) ? ticketData.items : []
		const quantityTotal = Number(ticketData.quantityTotal || items.reduce((sum, item) => sum + Number(item?.quantity || 0), 0))
		const ticketType = ticketData.ticketTypeSummary || (items.length ? items.map((item) => item.label || item.itemLabel || item.itemCode).join(', ') : '—')

		setField('counterDetailTicketId', ticketData.ticketId || ticketIdFromPath)
		setField('counterDetailDateTime', ticketData.issueDate ? formatDateTime(ticketData.issueDate) : '—')
		setField('counterDetailTicketType', ticketType || '—')
		setField('counterDetailQuantity', Number.isFinite(quantityTotal) && quantityTotal > 0 ? String(quantityTotal) : '—')
		setField('counterDetailAmount', formatINR(ticketData.totalAmount || 0))
		setField('counterDetailPaymentMode', (ticketData.paymentMode || '—').toString().toUpperCase())
		setField('counterDetailIssuedBy', ticketData.issuedBy || ticketData.visitorName || 'COUNTER')

		renderItems(items)

		if (qrImageEl) {
			if (ticketData.qrImage) {
				qrImageEl.src = ticketData.qrImage
				qrImageEl.alt = 'Counter ticket QR code'
				qrImageEl.classList.remove('hidden')
				if (qrPlaceholderEl) qrPlaceholderEl.classList.add('hidden')
				if (viewQrBtn) viewQrBtn.disabled = false
			} else {
				qrImageEl.removeAttribute('src')
				qrImageEl.classList.add('hidden')
				if (qrPlaceholderEl) qrPlaceholderEl.classList.remove('hidden')
				if (viewQrBtn) viewQrBtn.disabled = true
			}
		}
	}

	setMessage('Loading counter ticket details...')
	adminFetch(`${backendOrigin}/api/counter/tickets/${encodeURIComponent(ticketIdFromPath)}`, {
		headers: adminAuthHeaders(),
	})
		.then((payload) => {
			const ticket = payload?.ticket || payload
			renderTicket(ticket)
			setMessage('')
		})
		.catch((error) => {
			if (itemsBody) itemsBody.innerHTML = '<tr><td colspan="4">Unable to load ticket details.</td></tr>'
			setMessage(error?.message || 'Unable to load counter ticket details.', 'error')
		})
}

function initCounterTicketPrintPage() {
	const ticketIdFromPath = getCounterTicketIdFromLocation()
	const messageEl = document.getElementById('counterPrintMessage')
	const itemsBody = document.getElementById('counterPrintItemsBody')
	const qrImageEl = document.getElementById('counterPrintQrImage')
	const qrPlaceholderEl = document.getElementById('counterPrintQrPlaceholder')
	const printBtn = document.getElementById('counterPrintBtn')
	const backBtn = document.getElementById('counterPrintBackBtn')

	const setField = (id, value) => {
		const el = document.getElementById(id)
		if (el) el.textContent = value
	}

	const setMessage = (text, tone = 'muted') => {
		if (!messageEl) return
		messageEl.textContent = text || ''
		messageEl.style.color = tone === 'error' ? 'var(--danger)' : 'var(--muted)'
	}

	let printTriggered = false
	const triggerPrint = () => {
		if (printTriggered) return
		printTriggered = true
		window.setTimeout(() => window.print(), 180)
	}

	printBtn?.addEventListener('click', () => {
		window.print()
	})

	backBtn?.addEventListener('click', () => {
		window.location.href = '/admin/dashboard.html#counter'
	})

	if (!ticketIdFromPath) {
		setMessage('Missing counter ticket ID.', 'error')
		if (itemsBody) itemsBody.innerHTML = '<tr><td colspan="3">Missing counter ticket ID.</td></tr>'
		if (printBtn) printBtn.disabled = true
		return
	}

	const renderItems = (items = []) => {
		if (!itemsBody) return
		if (!Array.isArray(items) || !items.length) {
			itemsBody.innerHTML = '<tr><td colspan="3">No stored item breakdown for this ticket.</td></tr>'
			return
		}

		itemsBody.innerHTML = items
			.map((item) => {
				const label = escapeHtml(item.label || item.itemLabel || item.itemCode || 'Item')
				const quantity = Number(item.quantity || 0)
				const unitPrice = Number(item.unitPrice ?? item.price ?? 0)
				const amount = Number(item.amount ?? quantity * unitPrice)
				const amountDisplay = Number(amount) === 0 ? 'FREE' : formatINR(amount)
				return `
					<tr>
						<td>${label}</td>
						<td>${quantity || '—'}</td>
						<td>${amountDisplay}</td>
					</tr>
				`
			})
			.join('')
	}

	const renderTicket = (ticket) => {
		const items = Array.isArray(ticket?.items) ? ticket.items : []
		const quantityTotal = Number(ticket?.quantityTotal || items.reduce((sum, item) => sum + Number(item?.quantity || 0), 0))

		setField('counterPrintTicketId', ticket?.ticketId || ticketIdFromPath)
		setField('counterPrintDateTime', ticket?.issueDate ? formatDateTime(ticket.issueDate) : '—')
		setField('counterPrintPaymentMode', (ticket?.paymentMode || '—').toString().toUpperCase())
		setField('counterPrintIssuedBy', ticket?.issuedBy || ticket?.visitorName || 'COUNTER')
		setField('counterPrintQuantity', Number.isFinite(quantityTotal) && quantityTotal > 0 ? String(quantityTotal) : '—')
		setField('counterPrintAmount', formatINR(ticket?.totalAmount || 0))

		renderItems(items)

		if (qrImageEl) {
			if (ticket?.qrImage) {
				qrImageEl.onload = () => triggerPrint()
				qrImageEl.onerror = () => triggerPrint()
				qrImageEl.src = ticket.qrImage
				qrImageEl.classList.remove('hidden')
				if (qrPlaceholderEl) qrPlaceholderEl.classList.add('hidden')
			} else {
				qrImageEl.removeAttribute('src')
				qrImageEl.classList.add('hidden')
				if (qrPlaceholderEl) qrPlaceholderEl.classList.remove('hidden')
				triggerPrint()
			}
		} else {
			triggerPrint()
		}
	}

	setMessage('Loading counter ticket print view...')
	adminFetch(`${backendOrigin}/api/counter/tickets/${encodeURIComponent(ticketIdFromPath)}`, {
		headers: adminAuthHeaders(),
	})
		.then((payload) => {
			const ticket = payload?.ticket || payload
			renderTicket(ticket)
			setMessage('')
		})
		.catch((error) => {
			if (itemsBody) itemsBody.innerHTML = '<tr><td colspan="3">Unable to load ticket details.</td></tr>'
			setMessage(error?.message || 'Unable to load counter ticket print view.', 'error')
			if (printBtn) printBtn.disabled = true
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
	const CATEGORY_SORT_ORDER = {
		entry: 1,
		parking: 2,
		transport: 3,
		camera: 4,
	}
	const BALANCE_EPSILON = 0.01

	const setExportsEnabled = (enabled) => {
		const flag = !enabled
		if (exportCsvBtn) exportCsvBtn.disabled = flag
		if (exportExcelBtn) exportExcelBtn.disabled = flag
		if (exportPdfBtn) exportPdfBtn.disabled = flag
	}

	const resetTable = (message, colspan = 1) => {
		tableHead.innerHTML = ''
		tableBody.innerHTML = `<tr><td colspan="${colspan}">${message}</td></tr>`
		setExportsEnabled(false)
	}

	const toNumber = (value) => {
		const numeric = Number(value)
		return Number.isFinite(numeric) ? numeric : 0
	}

	const normalizeMode = (value) => (value || '').toString().trim().toUpperCase()

	const normalizeCategoryKey = (value) => {
		const normalized = (value || '').toString().trim().toLowerCase()
		if (!normalized) return ''
		if (normalized === 'zoo' || normalized === 'entry') return 'entry'
		if (normalized.includes('parking')) return 'parking'
		if (normalized.includes('transport') || normalized.includes('battery')) return 'transport'
		if (normalized.includes('camera')) return 'camera'
		return normalized
	}

	const mapCategoryLabel = (value) => {
		const key = normalizeCategoryKey(value)
		if (key === 'entry') return 'Entry'
		if (key === 'parking') return 'Parking'
		if (key === 'transport') return 'Transport'
		if (key === 'camera') return 'Camera'
		if (!key) return 'Category'
		return key.charAt(0).toUpperCase() + key.slice(1)
	}

	const toApiCategory = (value) => {
		const key = normalizeCategoryKey(value)
		if (key === 'entry') return 'zoo'
		return key
	}

	const isKidsZoneType = (itemCode, label) => {
		const code = (itemCode || '').toString().toLowerCase()
		const text = (label || '').toString().toLowerCase()
		return code === 'zoo_kid_zone' || text.includes('kids zone') || text.includes('kid zone')
	}

	const formatQuantityCell = (value) => Math.max(0, Math.round(toNumber(value))).toLocaleString('en-IN')

	const formatAmountCell = (value) => {
		const amount = toNumber(value)
		const isWhole = Math.abs(amount - Math.round(amount)) < 0.001
		return amount.toLocaleString('en-IN', {
			minimumFractionDigits: isWhole ? 0 : 2,
			maximumFractionDigits: 2,
		})
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

	const fetchReportRows = async ({ type, from, to, source, category }) => {
		const params = new URLSearchParams({ type, from, to })
		if (source) params.set('source', source)
		const apiCategory = toApiCategory(category)
		if (apiCategory) params.set('category', apiCategory)
		const payload = await adminFetch(`${adminApiBase}/reports?${params.toString()}`, {
			headers: adminAuthHeaders(),
		})
		if (payload?.success === false) throw new Error(payload?.message || 'Report fetch failed')
		return Array.isArray(payload?.rows) ? payload.rows : []
	}

	const fetchPricingConfig = async () => {
		const payload = await adminFetch(`${backendOrigin}/api/bookings/pricing`, {
			headers: adminAuthHeaders(),
		})
		if (payload?.success === false) throw new Error(payload?.message || 'Unable to load ticket configuration')
		return Array.isArray(payload?.data) ? payload.data : []
	}

	const fetchCounterTicketsForRange = async ({ from, to }) => {
		const tickets = []
		let page = 1
		const limit = 200

		while (page <= 500) {
			const params = new URLSearchParams({
				from,
				to,
				page: String(page),
				limit: String(limit),
			})
			const payload = await adminFetch(`${backendOrigin}/api/counter/history?${params.toString()}`, {
				headers: adminAuthHeaders(),
			})
			const chunk = Array.isArray(payload?.tickets) ? payload.tickets : []
			tickets.push(...chunk)
			if (!payload?.pagination?.hasNext || chunk.length === 0) break
			page += 1
		}

		return tickets
	}

	const renderCollectionSummaryTable = ({ pricingRows, metricsByCode }) => {
		const headers = ['DESCRIPTION', 'PRICE', 'QUANTITY', 'AMOUNT', 'ZAT', 'VCF', 'CASH', 'BANK']
		tableHead.innerHTML = `<tr>${headers
			.map((header, index) => `<th${index === 0 ? '' : ' class="report-num"'}>${header}</th>`)
			.join('')}</tr>`

		if (!Array.isArray(pricingRows) || pricingRows.length === 0) {
			tableBody.innerHTML = '<tr><td colspan="8">No ticket types available for the selected filters.</td></tr>'
			return
		}

		const grouped = new Map()
		pricingRows.forEach((row) => {
			const key = row.categoryKey || 'other'
			if (!grouped.has(key)) grouped.set(key, [])
			grouped.get(key).push(row)
		})

		const sortedCategories = [...grouped.keys()].sort((a, b) => {
			const orderA = CATEGORY_SORT_ORDER[a] || 99
			const orderB = CATEGORY_SORT_ORDER[b] || 99
			return orderA - orderB || a.localeCompare(b)
		})

		const total = {
			total_quantity: 0,
			total_amount: 0,
			total_zat: 0,
			total_vcf: 0,
			total_cash: 0,
			total_bank: 0,
		}

		const html = []
		sortedCategories.forEach((categoryKey) => {
			html.push(`<tr class="report-group-row"><td colspan="8">${escapeHtml(mapCategoryLabel(categoryKey))}</td></tr>`)
			const rows = grouped.get(categoryKey) || []
			rows.forEach((row) => {
				const metric = metricsByCode.get(row.itemCode) || {
					quantity: 0,
					row_amount: 0,
					zat_amount: 0,
					vcf_amount: 0,
					cash_amount: 0,
					bank_amount: 0,
				}

				total.total_quantity += toNumber(metric.quantity)
				total.total_amount += toNumber(metric.row_amount)
				total.total_zat += toNumber(metric.zat_amount)
				total.total_vcf += toNumber(metric.vcf_amount)
				total.total_cash += toNumber(metric.cash_amount)
				total.total_bank += toNumber(metric.bank_amount)

				html.push(`
					<tr>
						<td>${escapeHtml(row.label)}</td>
						<td class="report-num">${formatAmountCell(row.price)}</td>
						<td class="report-num">${formatQuantityCell(metric.quantity)}</td>
						<td class="report-num">${formatAmountCell(metric.row_amount)}</td>
						<td class="report-num">${formatAmountCell(metric.zat_amount)}</td>
						<td class="report-num">${formatAmountCell(metric.vcf_amount)}</td>
						<td class="report-num">${formatAmountCell(metric.cash_amount)}</td>
						<td class="report-num">${formatAmountCell(metric.bank_amount)}</td>
					</tr>
				`)
			})
		})

		html.push(`
			<tr class="report-total-row">
				<td>TOTAL</td>
				<td class="report-num">-</td>
				<td class="report-num">${formatQuantityCell(total.total_quantity)}</td>
				<td class="report-num">${formatAmountCell(total.total_amount)}</td>
				<td class="report-num">${formatAmountCell(total.total_zat)}</td>
				<td class="report-num">${formatAmountCell(total.total_vcf)}</td>
				<td class="report-num">${formatAmountCell(total.total_cash)}</td>
				<td class="report-num">${formatAmountCell(total.total_bank)}</td>
			</tr>
		`)

		tableBody.innerHTML = html.join('')
	}

	const buildCollectionSummaryData = async ({ from, to, source, category, ticketFilter }) => {
		const sourceMode = normalizeMode(source)
		const includeOnline = sourceMode !== 'COUNTER'
		const includeCounter = sourceMode !== 'ONLINE'

		const pricingPromise = fetchPricingConfig()
		const ticketWisePromise = fetchReportRows({ type: 'ticket-wise', from, to, source: sourceMode, category })
		const onlineTicketWisePromise = includeOnline
			? (sourceMode === 'ONLINE'
				? ticketWisePromise
				: fetchReportRows({ type: 'ticket-wise', from, to, source: 'ONLINE', category }))
			: Promise.resolve([])
		const counterHistoryPromise = includeCounter ? fetchCounterTicketsForRange({ from, to }) : Promise.resolve([])

		const [pricingRaw, ticketWiseRows, onlineTicketWiseRows, counterTickets] = await Promise.all([
			pricingPromise,
			ticketWisePromise,
			onlineTicketWisePromise,
			counterHistoryPromise,
		])

		const selectedCategory = normalizeCategoryKey(category)
		const ticketNeedle = (ticketFilter || '').toString().trim().toLowerCase()

		const dedupedPricing = new Map()
		;(Array.isArray(pricingRaw) ? pricingRaw : []).forEach((entry) => {
			const itemCode = (entry?.itemCode || entry?.code || '').toString().trim().toLowerCase()
			if (!itemCode) return
			const record = {
				itemCode,
				label: (entry?.label || entry?.itemCode || entry?.code || 'Ticket').toString(),
				price: Math.max(0, toNumber(entry?.price)),
				displayOrder: toNumber(entry?.displayOrder) || 999,
				categoryKey: normalizeCategoryKey(entry?.category),
			}

			const previous = dedupedPricing.get(itemCode)
			if (!previous || record.displayOrder < previous.displayOrder) {
				dedupedPricing.set(itemCode, record)
			}
		})

		const pricingRows = [...dedupedPricing.values()]
			.filter((row) => !selectedCategory || row.categoryKey === selectedCategory)
			.filter((row) => {
				if (!ticketNeedle) return true
				return row.label.toLowerCase().includes(ticketNeedle) || row.itemCode.includes(ticketNeedle)
			})
			.sort((a, b) => {
				const catOrderA = CATEGORY_SORT_ORDER[a.categoryKey] || 99
				const catOrderB = CATEGORY_SORT_ORDER[b.categoryKey] || 99
				if (catOrderA !== catOrderB) return catOrderA - catOrderB
				if (a.displayOrder !== b.displayOrder) return a.displayOrder - b.displayOrder
				return a.label.localeCompare(b.label)
			})

		const metricsByCode = new Map()
		pricingRows.forEach((row) => {
			metricsByCode.set(row.itemCode, {
				quantity: 0,
				row_amount: 0,
				zat_amount: 0,
				vcf_amount: 0,
				cash_amount: 0,
				bank_amount: 0,
				isKidsZone: isKidsZoneType(row.itemCode, row.label),
			})
		})

		const toPaidAmount = (value) => {
			const paid = toNumber(value)
			return paid > 0 ? paid : 0
		}

		const applyTicketWiseBookingRows = () => {
			metricsByCode.forEach((metric) => {
				metric.quantity = 0
				metric.row_amount = 0
			})

			;(Array.isArray(ticketWiseRows) ? ticketWiseRows : []).forEach((row) => {
				const ticket_type = (row?._id || row?.itemCode || '').toString().trim().toLowerCase()
				const metric = metricsByCode.get(ticket_type)
				if (!metric) return

				const quantity = Math.max(0, Math.round(toNumber(row?.quantity)))
				const paid_amount = toPaidAmount(row?.amount ?? row?.row_amount)

				metric.quantity += quantity
				metric.row_amount += paid_amount
			})
		}

		const resolveCounterBookingPaidAmount = (booking) => {
			return toPaidAmount(booking?.amount_paid ?? booking?.amountPaid ?? booking?.paymentAmount ?? booking?.totalAmount)
		}

		const resolveCounterTicketTypePaidAmount = (item) => {
			return toPaidAmount(item?.amount_paid ?? item?.amountPaid ?? item?.amount)
		}

		const allocateCounterBookingToTicketTypes = (booking) => {
			const paid_amount = resolveCounterBookingPaidAmount(booking)
			if (paid_amount <= 0) return []

			const lines = []
			let ticket_type_paid_total = 0
			;(Array.isArray(booking?.items) ? booking.items : []).forEach((item) => {
				const ticket_type = (item?.itemCode || item?.code || '').toString().trim().toLowerCase()
				const metric = metricsByCode.get(ticket_type)
				if (!metric) return

				const ticket_type_paid_amount = resolveCounterTicketTypePaidAmount(item)
				ticket_type_paid_total += ticket_type_paid_amount
				lines.push({ metric, ticket_type_paid_amount })
			})

			if (!lines.length) return []

			if (ticket_type_paid_total > BALANCE_EPSILON) {
				return lines.map((line) => ({
					metric: line.metric,
					paid_amount: paid_amount * (line.ticket_type_paid_amount / ticket_type_paid_total),
				}))
			}

			const equal_share = paid_amount / lines.length
			return lines.map((line) => ({ metric: line.metric, paid_amount: equal_share }))
		}

		const applyPaymentSplitFromBookingRecords = () => {
			metricsByCode.forEach((metric) => {
				metric.cash_amount = 0
				metric.bank_amount = 0
			})

			if (includeCounter && Array.isArray(counterTickets)) {
				counterTickets.forEach((booking) => {
					const payment_mode = normalizeMode(booking?.paymentMode)
					const allocated_rows = allocateCounterBookingToTicketTypes(booking)
					if (!allocated_rows.length) return

					if (payment_mode === 'CASH') {
						allocated_rows.forEach((row) => {
							row.metric.cash_amount += row.paid_amount
						})
						return
					}

					allocated_rows.forEach((row) => {
						row.metric.bank_amount += row.paid_amount
					})
				})
			}

			if (includeOnline) {
				;(Array.isArray(onlineTicketWiseRows) ? onlineTicketWiseRows : []).forEach((row) => {
					const ticket_type = (row?._id || row?.itemCode || '').toString().trim().toLowerCase()
					const metric = metricsByCode.get(ticket_type)
					if (!metric) return

					const paid_amount = toPaidAmount(row?.amount ?? row?.row_amount)
					metric.bank_amount += paid_amount
				})
			}

			metricsByCode.forEach((metric) => {
				metric.row_amount = toPaidAmount(metric.row_amount)
				metric.cash_amount = toPaidAmount(metric.cash_amount)
				metric.bank_amount = toPaidAmount(metric.bank_amount)

				if (Math.abs((metric.cash_amount + metric.bank_amount) - metric.row_amount) > BALANCE_EPSILON) {
					metric.cash_amount = Math.min(metric.row_amount, metric.cash_amount)
					metric.bank_amount = Math.max(0, metric.row_amount - metric.cash_amount)
				}

				if (metric.isKidsZone) {
					metric.vcf_amount = metric.row_amount
					metric.zat_amount = 0
				} else {
					metric.zat_amount = metric.row_amount
					metric.vcf_amount = 0
				}
			})
		}

		const applyBookingRecordCalculations = () => {
			applyTicketWiseBookingRows()
			applyPaymentSplitFromBookingRecords()

			metricsByCode.forEach((metric) => {
				metric.quantity = Math.max(0, Math.round(toNumber(metric.quantity)))
			})
		}

		const computeRenderedTotals = () => {
			const totals = {
				total_quantity: 0,
				total_amount: 0,
				total_zat: 0,
				total_vcf: 0,
				total_cash: 0,
				total_bank: 0,
			}

			metricsByCode.forEach((metric) => {
				totals.total_quantity += toNumber(metric.quantity)
				totals.total_amount += toNumber(metric.row_amount)
				totals.total_zat += toNumber(metric.zat_amount)
				totals.total_vcf += toNumber(metric.vcf_amount)
				totals.total_cash += toNumber(metric.cash_amount)
				totals.total_bank += toNumber(metric.bank_amount)
			})

			return totals
		}

		applyBookingRecordCalculations()
		let totals = computeRenderedTotals()

		// Validation rule: if total_cash + total_bank != total_amount, recompute from booking rows.
		if (Math.abs((totals.total_cash + totals.total_bank) - totals.total_amount) > BALANCE_EPSILON) {
			applyBookingRecordCalculations()
			totals = computeRenderedTotals()
		}

		return { pricingRows, metricsByCode }
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
			resetTable('Select from/to dates and report type.', 8)
			return
		}

		const apiType = API_TYPE_MAP[uiType] || 'daily-summary'
		const params = new URLSearchParams({ type: apiType, from, to })
		if (source) params.set('source', source)
		const apiCategory = toApiCategory(category)
		if (apiCategory) params.set('category', apiCategory)
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

			const summaryPromise = fetchReportRows({ type: apiType, from, to, source, category })
			const tablePromise = buildCollectionSummaryData({ from, to, source, category, ticketFilter })

			const [summaryRows, tableData] = await Promise.all([summaryPromise, tablePromise])

			renderCollectionSummaryTable(tableData)
			updateSummaryCards(summaryRows, apiType)
			setExportsEnabled(Array.isArray(tableData?.pricingRows) && tableData.pricingRows.length > 0)
			if (meta) meta.textContent = `Showing ${uiType} for ${from} to ${to}`
		} catch (error) {
			console.error('Report error', error)
			resetTable(error?.message || 'Unable to load report', 8)
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
		'initBookingDetailsPage',
		'initCounterTicketDetailsPage',
		'initCounterTicketPrintPage',
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
		return
	}

	if (page === 'booking-detail' && typeof guardAdminPage === 'function' && typeof initBookingDetailsPage === 'function') {
		guardAdminPage()
		initBookingDetailsPage()
		return
	}

	if (page === 'counter-detail' && typeof guardAdminPage === 'function' && typeof initCounterTicketDetailsPage === 'function') {
		guardAdminPage()
		initCounterTicketDetailsPage()
		return
	}

	if (page === 'counter-print' && typeof guardAdminPage === 'function' && typeof initCounterTicketPrintPage === 'function') {
		guardAdminPage()
		initCounterTicketPrintPage()
	}
})



