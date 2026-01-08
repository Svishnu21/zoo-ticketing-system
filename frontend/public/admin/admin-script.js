const credentials = {
	username: 'admin',
	password: 'admin@123',
	otp: '0000',
}

const backendOrigin = window.location.origin.startsWith('http://localhost:5173')
	? 'http://localhost:5000'
	: window.location.origin
const adminApiBase = `${backendOrigin}/admin`
const today = new Date().toISOString().slice(0, 10)

const state = {
	bookings: [],
	bookingPagination: { page: 1, limit: 20, total: 0, hasNext: false },
	bookingFilters: { date: '', payment: 'all', entry: 'all', search: '' },
	counterTickets: [],
	counterPagination: { page: 1, limit: 100, total: 0, hasNext: false },
	counterDate: '',
	scannerLogs: [],
	tariffs: [],
	adoptions: [],
}

const page = window.location.pathname.split('/').pop() || 'login.html'

if (page === 'login.html') {
	initLogin()
} else if (page === 'dashboard.html') {
	guardDashboard()
	initDashboard()
}

function initLogin() {
	const form = document.getElementById('adminLoginForm')
	if (!form) return
	const errorBox = document.getElementById('loginError')

	form.addEventListener('submit', (event) => {
		event.preventDefault()
		const formData = new FormData(form)
		const username = formData.get('username')?.toString().trim()
		const password = formData.get('password')?.toString().trim()
		const otp = formData.get('otp')?.toString().trim()

		if (username === credentials.username && password === credentials.password && otp === credentials.otp) {
			sessionStorage.setItem('isLoggedIn', 'true')
			window.location.href = './dashboard.html'
		} else {
			errorBox.textContent = 'Invalid Credentials'
			form.classList.add('shake')
			setTimeout(() => form.classList.remove('shake'), 400)
		}
	})
}

function guardDashboard() {
	if (sessionStorage.getItem('isLoggedIn') !== 'true') {
		window.location.href = './login.html'
	}
}

function initDashboard() {
	setupNavigation()
	setupBookings()
	setupCounterTickets()
	setupScannerLogs()
	setupTariffs()
	setupAdoptions()
	setupReports()
	renderOverview()
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
		tariffs: 'Future-only tariff configuration.',
		adoptions: 'Manage adoption records and certificates.',
		reports: 'Quick operational reports.',
	}

	navLinks.forEach((btn) => {
		btn.addEventListener('click', () => {
			const target = btn.dataset.target
			navLinks.forEach((b) => b.classList.toggle('active', b === btn))
			panels.forEach((panel) => panel.classList.toggle('active', panel.id === target))
			sectionTitle.textContent = btn.textContent ?? 'Admin Dashboard'
			sectionSubtitle.textContent = subtitles[target] ?? subtitles.overview
		})
	})

	logoutBtn?.addEventListener('click', () => {
		sessionStorage.removeItem('isLoggedIn')
		window.location.href = './login.html'
	})
}

function renderOverview() {
	const hasTodayFilter = state.bookingFilters?.date === today
	const bookingsToday = hasTodayFilter ? state.bookings : []
	const onlineCount = hasTodayFilter ? state.bookingPagination?.total ?? bookingsToday.length : 0
	const counterToday = state.counterTickets.filter((t) => t.date === today)
	// Counter tickets are summary transactions; quantity/type not stored — do not infer or display counts.
	const counterTicketsIssued = '--'
	const revenueOnline = hasTodayFilter
		? bookingsToday.filter((b) => (b.paymentStatus || '').toString().toUpperCase() === 'PAID').reduce((sum, b) => sum + Number(b.totalAmount || 0), 0)
		: 0
	const revenueCounter = counterToday.reduce((sum, t) => sum + Number(t.amount || 0), 0)
	const entered = hasTodayFilter
		? bookingsToday
				.filter((b) => (b.entryStatus || '').toString().toLowerCase().includes('entered'))
				.reduce((sum, b) => sum + Number(b.ticketCount || 0), 0)
		: 0
	const pending = hasTodayFilter
		? bookingsToday.filter((b) => (b.entryStatus || '').toString().toLowerCase().startsWith('not')).length
		: 0

	const onlineTrend = hasTodayFilter ? `${onlineCount} scheduled today` : 'Apply Visit Date = today for live counts'

	document.getElementById('metricOnlineToday').textContent = hasTodayFilter ? onlineCount.toString() : '--'
	document.getElementById('metricOnlineTrend').textContent = onlineTrend
	document.getElementById('metricCounterToday').textContent = '--'
	document.getElementById('metricRevenueToday').textContent = hasTodayFilter ? formatINR(revenueOnline + revenueCounter) : '--'
	document.getElementById('metricEntered').textContent = hasTodayFilter ? entered.toString() : '--'
	document.getElementById('metricPending').textContent = hasTodayFilter ? pending.toString() : '--'
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
		setLoading('Loading bookings…')
		try {
			const query = buildQuery(page)
			const response = await fetch(`${adminApiBase}/bookings?${query}`, { credentials: 'include' })
			if (!response.ok) {
				const status = response.status
				let message = `Failed to load bookings (${status}).`
				if (status === 404) message = 'No records available for the selected filters'
				else if (status === 401 || status === 403) message = 'Session expired or unauthorized'
				else if (status >= 500) message = 'Unable to fetch bookings at this time'

				state.bookings = []
				state.bookingPagination = { ...state.bookingPagination, page, total: 0, hasNext: false }
				tableBody.innerHTML = `<tr><td colspan="9">${message}</td></tr>`
				updatePagination()
				return
			}

			const payload = await response.json()
			state.bookings = Array.isArray(payload?.data) ? payload.data : []
			state.bookingPagination = {
				page: payload?.pagination?.page || page,
				limit: payload?.pagination?.limit || state.bookingPagination.limit,
				total: payload?.pagination?.total || state.bookings.length,
				hasNext: Boolean(payload?.pagination?.hasNext),
			}
			renderTable()
			renderOverview()
		} catch (error) {
			console.error('Failed to fetch bookings', error)
			state.bookings = []
			state.bookingPagination = { ...state.bookingPagination, page, total: 0, hasNext: false }
			tableBody.innerHTML = '<tr><td colspan="9">Unable to fetch bookings at this time</td></tr>'
			updatePagination()
		}
	}

	const openBookingDetail = async (ticketId) => {
		if (!bookingDetailModal || !bookingDetailBody) return
		bookingDetailBody.innerHTML = '<p>Loading…</p>'
		bookingDetailModal.showModal()
		try {
			const response = await fetch(`${adminApiBase}/bookings/${ticketId}`)
			if (!response.ok) throw new Error('Unable to load booking details.')
			const data = await response.json()
			bookingDetailBody.innerHTML = detailList([
				['Booking ID', data.ticketId],
				['Visitor', data.visitorName || '—'],
				['Mobile', data.visitorMobile || '—'],
				['Visit Date', data.visitDate || '—'],
				['Issue Date', data.issueDate ? formatDateTime(data.issueDate) : '—'],
				['Total Amount', formatINR(data.totalAmount)],
				['Payment Mode', data.paymentMode || '—'],
				['Payment Status', data.paymentStatus || '—'],
				['Entry Status', data.entryStatus || '—'],
				['Entry Timestamp', data.entryTimestamp ? formatDateTime(data.entryTimestamp) : '—'],
				['Payment Reference', data.paymentReference || '—'],
			])

			if (data.qrImage) {
				const qr = document.createElement('img')
				qr.src = data.qrImage
				qr.alt = 'Ticket QR'
				qr.className = 'qr-preview'
				bookingDetailBody.appendChild(qr)
			}
		} catch (error) {
			bookingDetailBody.innerHTML = `<p>${error?.message || 'Unable to load booking details.'}</p>`
		}
	}

	const requestResend = async (ticketId) => {
		const confirmed = confirm('Resend ticket communication to the visitor?')
		if (!confirmed) return
		try {
			const response = await fetch(`${adminApiBase}/bookings/${ticketId}/resend`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
			})
			const payload = await response.json()
			if (!response.ok) throw new Error(payload?.message || 'Resend failed.')
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

		if (action === 'view') return openBookingDetail(id)
		if (action === 'resend') return requestResend(id)
	})

	fetchBookings(1)
}

	// Counter ticket items must NOT be used to infer type/quantity in admin UI.
	// Ticket Type: show static label 'Counter'
	// Quantity: show neutral placeholder '—'

function setupCounterTickets() {
	const dateFilter = document.getElementById('counterDateFilter')
	const tableBody = document.getElementById('counterTableBody')
	const dailyTotal = document.getElementById('counterDailyTotal')
	const exportBtn = document.getElementById('exportCounterBtn')
	const counterPageLabel = document.getElementById('counterPageLabel')
	const counterPrevBtn = document.getElementById('counterPrevBtn')
	const counterNextBtn = document.getElementById('counterNextBtn')
	const counterContextLabel = document.getElementById('counterContextLabel')

	if (!tableBody) return

	const setContext = (text) => {
		if (counterContextLabel) counterContextLabel.textContent = text
	}

	const setEmpty = (message) => {
		tableBody.innerHTML = `<tr><td colspan="7">${message}</td></tr>`
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
				const displayType = 'Counter'
				const displayQuantity = '—'
				return `
					<tr>
						<td>${t.ticketId}</td>
						<td>${issuedAt}</td>
						<td>${displayType}</td>
						<td>${displayQuantity}</td>
						<td>${formatINR(t.totalAmount)}</td>
						<td>${t.paymentMode || '—'}</td>
						<td>${t.issuedBy || '—'}</td>
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
		setEmpty('Loading counter tickets…')
		try {
			const params = new URLSearchParams()
			if (date) params.set('date', date)
			const response = await fetch(`${backendOrigin}/api/counter/history?${params.toString()}`)
			if (!response.ok) {
				state.counterTickets = []
				state.counterPagination = { page: 1, limit: state.counterPagination.limit, total: 0, hasNext: false }
				setEmpty('Unable to load counter tickets')
				return
			}
			const payload = await response.json()
			state.counterDate = date || ''
			state.counterTickets = Array.isArray(payload?.tickets) ? payload.tickets : []
			const totalRecords = Number(payload?.pagination?.total || state.counterTickets.length || 0)
			const limit = Number(payload?.pagination?.limit || state.counterPagination.limit || 100)
			const hasNext = Boolean(payload?.pagination?.hasNext)
			state.counterPagination = { page, limit, total: totalRecords, hasNext }
			setContext(state.counterDate ? `Showing counter tickets for ${state.counterDate}` : 'Showing all counter-issued tickets')
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
		const header = ['Counter Ticket ID', 'Issue Date & Time', 'Ticket Type', 'Quantity', 'Amount', 'Payment Mode', 'Issued By']
		const csvRows = [header.join(',')]
		state.counterTickets.forEach((t) => {
			const displayType = 'Counter'
			const displayQuantity = '—'
			csvRows.push([
				t.ticketId,
				formatDateTime(t.issueDate),
				displayType,
				displayQuantity,
				t.totalAmount,
				t.paymentMode,
				t.issuedBy || '',
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

	exportBtn?.addEventListener('click', exportCsv)
	fetchCounterTickets('', 1)
}

function setupScannerLogs() {
	const dateFilter = document.getElementById('logDateFilter')
	const searchInput = document.getElementById('logSearchInput')
	const tableBody = document.getElementById('logTableBody')
	if (!tableBody) return

	let searchTimeout

	const setMessage = (message) => {
		tableBody.innerHTML = `<tr><td colspan="4">${message}</td></tr>`
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
						<td>${formatDateTime(log.scannedAt || log.timestamp)}</td>
						<td>${log.gateId || log.gate || '—'}</td>
						<td><span class="status-pill ${pillClass(log.result)}">${log.result}</span></td>
					</tr>
				`,
			)
			.join('')
	}

	const fetchScannerLogs = async () => {
		setMessage('Loading scan logs…')
		try {
			const params = new URLSearchParams()
			const date = dateFilter?.value?.trim()
			const bookingId = searchInput?.value?.trim()
			if (date) params.set('date', date)
			if (bookingId) params.set('bookingId', bookingId)
			const response = await fetch(`${adminApiBase}/scanner-logs?${params.toString()}`, { credentials: 'include' })
			if (!response.ok) {
				state.scannerLogs = []
				setMessage('Unable to load scan logs.')
				return
			}
			const payload = await response.json()
			state.scannerLogs = Array.isArray(payload?.data) ? payload.data : []
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

function setupTariffs() {
	const form = document.getElementById('tariffForm')
	const tableBody = document.getElementById('tariffTableBody')
	const message = document.getElementById('tariffMessage')
	const helper = document.getElementById('tariffHelper')

	if (!form || !tableBody) return

	const setMessage = (text, tone = 'info') => {
		if (!message) return
		message.textContent = text
		message.className = `form-feedback ${tone}`
		setTimeout(() => {
			message.textContent = ''
			message.className = 'form-feedback'
		}, 3000)
	}

	if (helper) {
		helper.textContent = 'Tariffs apply to online bookings only. Price changes take effect for future online purchases and do not alter past bookings or counter tickets.'
	}

	const renderTable = () => {
		if (!state.tariffs.length) {
			tableBody.innerHTML = '<tr><td colspan="5">No tariff records.</td></tr>'
			return
		}

		tableBody.innerHTML = state.tariffs
			.slice()
			.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0))
			.map(
				(t) => `
					<tr>
						<td>${t.category}</td>
						<td>${formatINR(t.price)}</td>
						<td><span class="status-pill ${pillClass(t.status)}">${t.status}</span></td>
						<td>${t.updatedAt ? formatDateTime(t.updatedAt) : '—'}</td>
						<td class="actions">
							<button class="link" data-action="edit" data-id="${t.id}">Edit</button>
							<button class="link" data-action="toggle" data-id="${t.id}">${t.status === 'Active' ? 'Disable' : 'Enable'}</button>
						</td>
					</tr>
				`,
			)
			.join('')
	}

	form.addEventListener('submit', (event) => {
		event.preventDefault()
		const data = Object.fromEntries(new FormData(form))
		const category = data.category?.toString().trim()
		const priceValue = Number(data.price)
		if (!category) {
			setMessage('Provide an online booking ticket category.', 'warning')
			return
		}
		if (!Number.isFinite(priceValue) || priceValue < 0) {
			setMessage('Enter a valid price (0 or above).', 'warning')
			return
		}
		const id = data.id || `TR-${Date.now()}`
		const existing = state.tariffs.find((t) => t.id === id)
		const now = new Date().toISOString().slice(0, 10)
		if (existing) {
			existing.category = category
			existing.price = priceValue
			existing.status = data.status
			existing.updatedAt = now
		} else {
			state.tariffs.push({ id, category, price: priceValue, status: data.status, updatedAt: now })
		}
		form.reset()
		form.elements.namedItem('id').value = ''
		setMessage('Saved. Applies to future online bookings only; counter tickets and past bookings stay unchanged.', 'success')
		renderTable()
	})

	tableBody.addEventListener('click', (event) => {
		const target = event.target
		if (!(target instanceof HTMLElement)) return
		const action = target.dataset.action
		const id = target.dataset.id
		if (!action || !id) return
		const tariff = state.tariffs.find((t) => t.id === id)
		if (!tariff) return

		if (action === 'edit') {
			form.elements.namedItem('id').value = tariff.id
			form.elements.namedItem('category').value = tariff.category
			form.elements.namedItem('price').value = tariff.price
			form.elements.namedItem('status').value = tariff.status
			return
		}

		if (action === 'toggle') {
			tariff.status = tariff.status === 'Active' ? 'Inactive' : 'Active'
			tariff.updatedAt = new Date().toISOString().slice(0, 10)
			renderTable()
		}
	})

	renderTable()
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
			detailModal.showModal()
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
			extendModal?.showModal()
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
	const dailyForm = document.getElementById('dailyReportForm')
	const dailyResult = document.getElementById('dailyReportResult')
	const rangeForm = document.getElementById('rangeReportForm')
	const rangeResult = document.getElementById('rangeReportResult')
	const adoptionForm = document.getElementById('adoptionReportForm')
	const adoptionResult = document.getElementById('adoptionReportResult')

	dailyForm?.addEventListener('submit', (event) => {
		event.preventDefault()
		const date = dailyForm.elements.namedItem('date').value
		const bookings = state.bookings.filter((b) => b.visitDate === date)
		const counter = state.counterTickets.filter((t) => t.date === date)
		const onlinePaid = bookings.filter((b) => b.paymentStatus === 'Paid').reduce((sum, b) => sum + Number(b.totalAmount || 0), 0)
		const counterTotal = counter.reduce((sum, t) => sum + Number(t.amount || 0), 0)
		const entries = bookings.filter((b) => b.entryStatus.includes('Entered')).reduce((sum, b) => sum + Number(b.ticketCount || 0), 0)
		if (dailyResult) {
			dailyResult.textContent = `Online bookings: ${bookings.length}, Counter tickets: ${counter.length}, Revenue: ${formatINR(
				onlinePaid + counterTotal,
			)}, Visitors entered: ${entries}`
		}
	})

	rangeForm?.addEventListener('submit', (event) => {
		event.preventDefault()
		const from = rangeForm.elements.namedItem('from').value
		const to = rangeForm.elements.namedItem('to').value
		const bookings = state.bookings.filter((b) => isWithin(b.visitDate, from, to))
		const counter = state.counterTickets.filter((t) => isWithin(t.date, from, to))
		const revenue = bookings.filter((b) => b.paymentStatus === 'Paid').reduce((sum, b) => sum + Number(b.totalAmount || 0), 0)
		const counterTotal = counter.reduce((sum, t) => sum + Number(t.amount || 0), 0)
		if (rangeResult) {
			rangeResult.textContent = `Bookings: ${bookings.length}, Counter tickets: ${counter.length}, Revenue: ${formatINR(
				revenue + counterTotal,
			)}`
		}
	})

	adoptionForm?.addEventListener('submit', (event) => {
		event.preventDefault()
		const from = adoptionForm.elements.namedItem('from').value
		const to = adoptionForm.elements.namedItem('to').value
		const adoptions = state.adoptions.filter((a) => a.paymentStatus === 'Paid' && isWithin(a.startDate, from, to))
		const revenue = adoptions.reduce((sum, a) => sum + Number(a.contributionAmount || 0), 0)
		if (adoptionResult) {
			adoptionResult.textContent = `Paid adoptions: ${adoptions.length}, Revenue: ${formatINR(revenue)}`
		}
	})
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

