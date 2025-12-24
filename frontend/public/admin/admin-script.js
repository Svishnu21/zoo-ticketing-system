const credentials = {
	username: 'admin',
	password: 'admin@123',
	otp: '0000',
}

const today = new Date().toISOString().slice(0, 10)

const state = {
	bookings: [
		{
			id: 'BK-25001',
			visitorName: 'S. Kumar',
			mobile: '9000001234',
			visitDate: today,
			ticketCount: 4,
			totalAmount: 800,
			paymentStatus: 'Paid',
			entryStatus: 'Entered',
			channel: 'Online',
			createdAt: '2025-12-17T08:45:00',
			manualEntryReason: null,
		},
		{
			id: 'BK-25002',
			visitorName: 'Priya V',
			mobile: '9000005678',
			visitDate: today,
			ticketCount: 2,
			totalAmount: 400,
			paymentStatus: 'Pending',
			entryStatus: 'Not Entered',
			channel: 'Online',
			createdAt: '2025-12-17T10:15:00',
			manualEntryReason: null,
		},
		{
			id: 'BK-25003',
			visitorName: 'R. Shankar',
			mobile: '9884077001',
			visitDate: today,
			ticketCount: 3,
			totalAmount: 600,
			paymentStatus: 'Paid',
			entryStatus: 'Not Entered',
			channel: 'Online',
			createdAt: '2025-12-17T11:05:00',
			manualEntryReason: null,
		},
		{
			id: 'BK-24099',
			visitorName: 'Meena D',
			mobile: '9600002200',
			visitDate: '2025-12-17',
			ticketCount: 5,
			totalAmount: 1000,
			paymentStatus: 'Paid',
			entryStatus: 'Entered',
			channel: 'Online',
			createdAt: '2025-12-16T15:10:00',
			manualEntryReason: null,
		},
		{
			id: 'BK-24098',
			visitorName: 'Demo Failure',
			mobile: '9555512345',
			visitDate: today,
			ticketCount: 1,
			totalAmount: 200,
			paymentStatus: 'Failed',
			entryStatus: 'Not Entered',
			channel: 'Online',
			createdAt: '2025-12-17T07:40:00',
			manualEntryReason: null,
		},
	],
	counterTickets: [
		{ id: 'CT-18001', date: today, time: '09:35', type: 'Zoo Entry', quantity: 2, amount: 400, paymentMode: 'Cash', issuedBy: 'Counter-1' },
		{ id: 'CT-18002', date: today, time: '11:10', type: 'Parking', quantity: 1, amount: 60, paymentMode: 'UPI', issuedBy: 'Counter-2' },
		{ id: 'CT-17099', date: '2025-12-17', time: '15:25', type: 'Zoo Entry', quantity: 3, amount: 600, paymentMode: 'Card', issuedBy: 'Counter-1' },
	],
	scannerLogs: [
		{ bookingId: 'BK-25001', timestamp: `${today}T10:05:00`, gate: 'Gate-1', result: 'Valid' },
		{ bookingId: 'BK-25003', timestamp: `${today}T10:45:00`, gate: 'Gate-2', result: 'Valid' },
		{ bookingId: 'BK-25002', timestamp: `${today}T10:50:00`, gate: 'Gate-2', result: 'Invalid' },
		{ bookingId: 'BK-24099', timestamp: '2025-12-17T16:05:00', gate: 'Gate-1', result: 'Already Used' },
	],
	tariffs: [
		{ id: 'TR-1', category: 'Adult', price: 200, status: 'Active', updatedAt: '2025-12-10' },
		{ id: 'TR-2', category: 'Child', price: 120, status: 'Active', updatedAt: '2025-12-10' },
		{ id: 'TR-3', category: 'Parking', price: 60, status: 'Active', updatedAt: '2025-12-12' },
		{ id: 'TR-4', category: 'Camera', price: 80, status: 'Inactive', updatedAt: '2025-12-05' },
	],
	adoptions: [
		{
			id: 'ADP-1001',
			adopterName: 'Priya Raman',
			animalName: 'Asian Elephant',
			species: 'Elephas maximus',
			durationDays: 90,
			contributionAmount: 45000,
			paymentStatus: 'Paid',
			certificateStatus: 'Pending',
			startDate: '2025-12-01',
			endDate: '2026-02-29',
		},
		{
			id: 'ADP-1002',
			adopterName: 'Kumaravel & Co.',
			animalName: 'Spotted Deer',
			species: 'Axis axis',
			durationDays: 30,
			contributionAmount: 12000,
			paymentStatus: 'Paid',
			certificateStatus: 'Issued',
			startDate: '2025-11-20',
			endDate: '2025-12-20',
		},
		{
			id: 'ADP-1003',
			adopterName: 'Student Group',
			animalName: 'Indian Peafowl',
			species: 'Pavo cristatus',
			durationDays: 30,
			contributionAmount: 8000,
			paymentStatus: 'Pending',
			certificateStatus: 'Not Ready',
			startDate: '2025-12-15',
			endDate: '2026-01-14',
		},
	],
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
	const bookingsToday = state.bookings.filter((b) => b.visitDate === today)
	const onlineCount = bookingsToday.length
	const counterToday = state.counterTickets.filter((t) => t.date === today)
	const counterTicketsIssued = counterToday.reduce((sum, t) => sum + Number(t.quantity || 0), 0)
	const revenueOnline = bookingsToday
		.filter((b) => b.paymentStatus === 'Paid')
		.reduce((sum, b) => sum + Number(b.totalAmount || 0), 0)
	const revenueCounter = counterToday.reduce((sum, t) => sum + Number(t.amount || 0), 0)
	const entered = bookingsToday
		.filter((b) => b.entryStatus.includes('Entered'))
		.reduce((sum, b) => sum + Number(b.ticketCount || 0), 0)
	const pending = bookingsToday.filter((b) => b.entryStatus.startsWith('Not')).length

	const onlineTrend = `${onlineCount} scheduled today`

	document.getElementById('metricOnlineToday').textContent = onlineCount.toString()
	document.getElementById('metricOnlineTrend').textContent = onlineTrend
	document.getElementById('metricCounterToday').textContent = counterTicketsIssued.toString()
	document.getElementById('metricRevenueToday').textContent = formatINR(revenueOnline + revenueCounter)
	document.getElementById('metricEntered').textContent = entered.toString()
	document.getElementById('metricPending').textContent = pending.toString()
}

function setupBookings() {
	const dateFilter = document.getElementById('bookingDateFilter')
	const paymentFilter = document.getElementById('bookingPaymentFilter')
	const entryFilter = document.getElementById('bookingEntryFilter')
	const searchInput = document.getElementById('bookingSearchInput')
	const tableBody = document.getElementById('bookingTableBody')
	const bookingDetailModal = document.getElementById('bookingDetailModal')
	const bookingDetailBody = document.getElementById('bookingDetailBody')
	const manualEntryModal = document.getElementById('manualEntryModal')
	const manualEntryForm = document.getElementById('manualEntryForm')
	const manualEntryLabel = document.getElementById('manualEntryBooking')

	if (!tableBody) return

	let manualEntryTarget = null

	const renderTable = () => {
		const filters = {
			date: dateFilter?.value,
			payment: paymentFilter?.value ?? 'all',
			entry: entryFilter?.value ?? 'all',
			search: searchInput?.value?.trim().toLowerCase() ?? '',
		}

		const rows = state.bookings
			.filter((b) => !filters.date || b.visitDate === filters.date)
			.filter((b) => filters.payment === 'all' || b.paymentStatus === filters.payment)
			.filter((b) => filters.entry === 'all' || b.entryStatus === filters.entry)
			.filter((b) => {
				if (!filters.search) return true
				return b.id.toLowerCase().includes(filters.search) || b.mobile.toLowerCase().includes(filters.search)
			})

		if (!rows.length) {
			tableBody.innerHTML = '<tr><td colspan="9">No bookings match the selected filters.</td></tr>'
			return
		}

		tableBody.innerHTML = rows
			.map((b) => {
				const disableCancel = b.paymentStatus === 'Paid' || b.paymentStatus === 'Cancelled'
				const disableManualEntry = b.entryStatus.includes('Entered') || b.paymentStatus !== 'Paid' || b.paymentStatus === 'Cancelled'
				return `
					<tr>
						<td>${b.id}</td>
						<td>${b.visitorName}</td>
						<td>${b.mobile}</td>
						<td>${b.visitDate}</td>
						<td>${b.ticketCount}</td>
						<td>${formatINR(b.totalAmount)}</td>
						<td><span class="status-pill ${pillClass(b.paymentStatus)}">${b.paymentStatus}</span></td>
						<td><span class="status-pill ${pillClass(b.entryStatus)}">${b.entryStatus}</span></td>
						<td class="actions">
							<button class="link" data-action="view" data-id="${b.id}">View</button>
							<button class="link danger" data-action="cancel" data-id="${b.id}" ${disableCancel ? 'disabled' : ''}>Cancel</button>
							<button class="link" data-action="manual-entry" data-id="${b.id}" ${disableManualEntry ? 'disabled' : ''}>Mark Entry</button>
						</td>
					</tr>
				`
			})
			.join('')
	}

	dateFilter?.addEventListener('change', renderTable)
	paymentFilter?.addEventListener('change', renderTable)
	entryFilter?.addEventListener('change', renderTable)
	searchInput?.addEventListener('input', renderTable)

	tableBody.addEventListener('click', (event) => {
		const target = event.target
		if (!(target instanceof HTMLElement)) return
		const action = target.dataset.action
		const id = target.dataset.id
		if (!action || !id) return

		const booking = state.bookings.find((b) => b.id === id)
		if (!booking) return

		if (action === 'view') {
			if (!bookingDetailModal || !bookingDetailBody) return
			bookingDetailBody.innerHTML = detailList([
				['Booking ID', booking.id],
				['Visitor', booking.visitorName],
				['Mobile', booking.mobile],
				['Visit Date', booking.visitDate],
				['Ticket Count', booking.ticketCount],
				['Total Amount', formatINR(booking.totalAmount)],
				['Payment Status', booking.paymentStatus],
				['Entry Status', booking.entryStatus],
				['Manual Entry Reason', booking.manualEntryReason || '—'],
				['Created At', formatDateTime(booking.createdAt)],
			])
			bookingDetailModal.showModal()
			return
		}

		if (action === 'cancel') {
			if (booking.paymentStatus === 'Paid') return
			const confirmed = confirm('Cancel this booking? Payments already settled cannot be cancelled here.')
			if (!confirmed) return
			booking.paymentStatus = 'Cancelled'
			booking.entryStatus = 'Not Entered'
			booking.manualEntryReason = null
			renderTable()
			renderOverview()
			return
		}

		if (action === 'manual-entry') {
			manualEntryTarget = booking.id
			manualEntryLabel.textContent = `Booking ${booking.id} - ${booking.visitorName}`
			manualEntryForm?.reset()
			manualEntryModal?.showModal()
		}
	})

	manualEntryForm?.addEventListener('submit', (event) => {
		event.preventDefault()
		if (!manualEntryTarget) return manualEntryModal?.close()
		const formData = new FormData(manualEntryForm)
		const reason = formData.get('reason')?.toString().trim()
		if (!reason) return
		const booking = state.bookings.find((b) => b.id === manualEntryTarget)
		if (!booking) return
		booking.entryStatus = 'Entered (Manual)'
		booking.manualEntryReason = reason
		state.scannerLogs.push({ bookingId: booking.id, timestamp: new Date().toISOString(), gate: 'Manual', result: 'Manual Entry Recorded' })
		manualEntryModal?.close()
		renderTable()
		renderOverview()
		renderScannerLogs()
	})

	manualEntryModal?.addEventListener('click', (event) => {
		if (event.target === manualEntryModal) manualEntryModal.close()
	})

	renderTable()
}

function setupCounterTickets() {
	const dateFilter = document.getElementById('counterDateFilter')
	const tableBody = document.getElementById('counterTableBody')
	const dailyTotal = document.getElementById('counterDailyTotal')
	const exportBtn = document.getElementById('exportCounterBtn')

	if (!tableBody) return

	const renderTable = () => {
		const selectedDate = dateFilter?.value
		const rows = state.counterTickets.filter((t) => !selectedDate || t.date === selectedDate)

		if (!rows.length) {
			tableBody.innerHTML = '<tr><td colspan="7">No counter tickets for the selected date.</td></tr>'
		} else {
			tableBody.innerHTML = rows
				.map(
					(t) => `
						<tr>
							<td>${t.id}</td>
							<td>${t.date} ${t.time}</td>
							<td>${t.type}</td>
							<td>${t.quantity}</td>
							<td>${formatINR(t.amount)}</td>
							<td>${t.paymentMode}</td>
							<td>${t.issuedBy}</td>
						</tr>
					`,
				)
				.join('')
		}

		const total = rows.reduce((sum, t) => sum + Number(t.amount || 0), 0)
		if (dailyTotal) dailyTotal.textContent = formatINR(total)
	}

	const exportCsv = () => {
		const selectedDate = dateFilter?.value
		const rows = state.counterTickets.filter((t) => !selectedDate || t.date === selectedDate)
		if (!rows.length) return alert('No rows to export for the selected date.')
		const header = ['Counter Ticket ID', 'Date', 'Time', 'Ticket Type', 'Quantity', 'Amount', 'Payment Mode', 'Issued By']
		const csvRows = [header.join(',')]
		rows.forEach((t) => {
			csvRows.push([t.id, t.date, t.time, t.type, t.quantity, t.amount, t.paymentMode, t.issuedBy].join(','))
		})
		const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' })
		const url = URL.createObjectURL(blob)
		const link = document.createElement('a')
		link.href = url
		link.download = `counter-tickets-${selectedDate || 'all'}.csv`
		link.click()
		URL.revokeObjectURL(url)
	}

	dateFilter?.addEventListener('change', renderTable)
	exportBtn?.addEventListener('click', exportCsv)
	renderTable()
}

function setupScannerLogs() {
	const dateFilter = document.getElementById('logDateFilter')
	const searchInput = document.getElementById('logSearchInput')
	const tableBody = document.getElementById('logTableBody')
	if (!tableBody) return

	const renderTable = () => {
		const selectedDate = dateFilter?.value
		const search = searchInput?.value?.trim().toLowerCase() ?? ''

		const rows = state.scannerLogs
			.filter((log) => !selectedDate || log.timestamp.startsWith(selectedDate))
			.filter((log) => !search || log.bookingId.toLowerCase().includes(search))

		if (!rows.length) {
			tableBody.innerHTML = '<tr><td colspan="4">No scan logs for the selected filters.</td></tr>'
			return
		}

		tableBody.innerHTML = rows
			.map(
				(log) => `
					<tr>
						<td>${log.bookingId}</td>
						<td>${formatDateTime(log.timestamp)}</td>
						<td>${log.gate}</td>
						<td><span class="status-pill ${pillClass(log.result)}">${log.result}</span></td>
					</tr>
				`,
			)
			.join('')
	}

	dateFilter?.addEventListener('change', renderTable)
	searchInput?.addEventListener('input', renderTable)

	renderTable()
	setupScannerLogs.render = renderTable
}

function renderScannerLogs() {
	setupScannerLogs.render?.()
}

function setupTariffs() {
	const form = document.getElementById('tariffForm')
	const tableBody = document.getElementById('tariffTableBody')
	const message = document.getElementById('tariffMessage')

	if (!form || !tableBody) return

	const renderTable = () => {
		if (!state.tariffs.length) {
			tableBody.innerHTML = '<tr><td colspan="5">No tariff records.</td></tr>'
			return
		}

		tableBody.innerHTML = state.tariffs
			.map(
				(t) => `
					<tr>
						<td>${t.category}</td>
						<td>${formatINR(t.price)}</td>
						<td><span class="status-pill ${pillClass(t.status)}">${t.status}</span></td>
						<td>${t.updatedAt}</td>
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
		const id = data.id || `TR-${Date.now()}`
		const existing = state.tariffs.find((t) => t.id === id)
		const now = new Date().toISOString().slice(0, 10)
		if (existing) {
			existing.category = data.category
			existing.price = Number(data.price)
			existing.status = data.status
			existing.updatedAt = now
		} else {
			state.tariffs.push({ id, category: data.category, price: Number(data.price), status: data.status, updatedAt: now })
		}
		form.reset()
		form.elements.namedItem('id').value = ''
		if (message) {
			message.textContent = 'Saved. Applies to future bookings only.'
			setTimeout(() => (message.textContent = ''), 2500)
		}
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

function formatINR(value) {
	return `₹ ${Number(value || 0).toLocaleString('en-IN')}`
}

function formatDateTime(value) {
	if (!value) return '—'
	const date = new Date(value)
	if (Number.isNaN(date.getTime())) return value
	return `${date.toISOString().slice(0, 10)} ${date.toTimeString().slice(0, 5)}`
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

