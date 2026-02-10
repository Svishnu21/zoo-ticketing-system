const page = window.location.pathname.split('/').pop() || 'login.html'

const sessionKey = 'scannerAuth'
const logKey = 'scannerLogs'
const SCANNER_LOGIN_PATH = './login.html'

const getScannerSession = () => {
  try {
    return JSON.parse(sessionStorage.getItem(sessionKey) || '{}')
  } catch (_err) {
    return {}
  }
}

const clearScannerSession = () => {
  sessionStorage.removeItem(sessionKey)
  sessionStorage.removeItem(logKey)
}

const withScannerAuthHeaders = (base = {}) => {
  const headers = { ...base }
  const token = getScannerSession().token
  if (token) headers.Authorization = `Bearer ${token}`
  return headers
}

async function scannerFetch(url, options = {}) {
  const response = await fetch(url, { ...options, headers: withScannerAuthHeaders(options.headers || {}) })
  if (response.status === 401 || response.status === 403) {
    clearScannerSession()
    window.location.href = SCANNER_LOGIN_PATH
    throw new Error('Scanner session expired.')
  }
  return response
}

if (page === 'login.html') {
  initLogin()
} else if (page === 'validate.html') {
  guardScanner()
  initValidate()
}

function initLogin() {
  const form = document.getElementById('scannerLoginForm')
  const errorBox = document.getElementById('loginError')
  if (!form) return

  form.addEventListener('submit', async (event) => {
    event.preventDefault()
    const data = new FormData(form)
    const email = data.get('username')?.toString().trim()
    const password = data.get('password')?.toString().trim()

    if (!email || !password) {
      errorBox.textContent = 'Enter username and password'
      return
    }

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(payload?.message || 'Login failed')
      if (payload.role !== 'SCANNER') throw new Error('Role not permitted for scanner console')

      sessionStorage.setItem(sessionKey, JSON.stringify({
        token: payload.token,
        role: payload.role,
        gateId: payload.user?.counterId || 'Gate',
        user: payload.user?.fullName || email,
        issuedAt: Date.now(),
      }))
      window.location.href = './validate.html'
    } catch (err) {
      errorBox.textContent = err?.message || 'Invalid credentials'
      form.classList.add('shake')
      setTimeout(() => form.classList.remove('shake'), 400)
    }
  })
}

function guardScanner() {
  const session = getScannerSession()
  if (session.role !== 'SCANNER' || !session.token) {
    clearScannerSession()
    window.location.href = SCANNER_LOGIN_PATH
  }
}

function initValidate() {
  const auth = getScannerSession()
  const gateEl = document.getElementById('scannerGate')
  const userEl = document.getElementById('scannerUser')
  const logoutBtn = document.getElementById('logoutBtn')
  const manualForm = document.getElementById('manualForm')
  const manualInput = document.getElementById('manualInput')
  const modeSelect = document.getElementById('validationMode')
  const manualWarning = document.getElementById('manualWarning')
  const manualInputLabel = document.getElementById('manualInputLabel')
  const manualReasonField = document.getElementById('manualReasonField')
  const manualReasonInput = document.getElementById('manualReason')
  const statusPanel = document.getElementById('statusPanel')
  const statusTitle = document.getElementById('statusTitle')
  const statusMessage = document.getElementById('statusMessage')
  const startCamera = document.getElementById('startCamera')
  const stopCamera = document.getElementById('stopCamera')
  const logList = document.getElementById('logList')
  const videoEl = document.getElementById('cameraVideo')
  const canvasEl = document.getElementById('cameraCanvas')

  let resetTimer = null

  if (gateEl) gateEl.textContent = `Gate: ${auth.gateId || 'Unknown'}`
  if (userEl) userEl.textContent = `Scanner: ${auth.user || 'Unknown'}`

  logoutBtn?.addEventListener('click', () => {
    clearScannerSession()
    window.location.href = SCANNER_LOGIN_PATH
  })

  const setStatus = (status, title, message) => {
    if (!statusPanel || !statusTitle || !statusMessage) return
    statusPanel.classList.remove('success', 'danger', 'warning')
    if (status) statusPanel.classList.add(status)
    statusTitle.textContent = title
    statusMessage.textContent = message
    if (resetTimer) clearTimeout(resetTimer)
    resetTimer = setTimeout(() => {
      statusPanel.classList.remove('success', 'danger', 'warning')
      statusTitle.textContent = 'Awaiting Scan'
      statusMessage.textContent = 'Scan a QR code to validate entry.'
    }, 3500)
  }

  const appendLog = (entry) => {
    const existing = JSON.parse(sessionStorage.getItem(logKey) || '[]')
    const next = [entry, ...existing].slice(0, 20)
    sessionStorage.setItem(logKey, JSON.stringify(next))
    renderLogs(next)
  }

  const renderLogs = (logs) => {
    if (!logList) return
    if (!logs.length) {
      logList.innerHTML = '<div class="muted">No scans yet.</div>'
      return
    }
    logList.innerHTML = logs
      .slice(0, 10)
      .map(
        (log) => `
          <div class="log-row">
            <div>${log.time}</div>
            <div>${log.bookingId} <span class="chip">${log.mode || 'QR'}</span></div>
            <div class="log-result ${log.statusClass}">${log.result}</div>
          </div>
        `,
      )
      .join('')
  }

  renderLogs(JSON.parse(sessionStorage.getItem(logKey) || '[]'))

  const updateManualModeUI = (mode = modeSelect?.value || 'qr') => {
    const isTicketMode = mode === 'ticket'
    if (manualWarning) manualWarning.classList.toggle('hidden', !isTicketMode)
    if (manualReasonField) manualReasonField.classList.toggle('hidden', !isTicketMode)
    if (manualInputLabel) manualInputLabel.textContent = isTicketMode ? 'Ticket ID' : 'QR Token'
    if (manualInput)
      manualInput.placeholder = isTicketMode ? 'Enter Ticket ID (fallback use only)' : 'Paste or type QR token'
  }

  updateManualModeUI()
  modeSelect?.addEventListener('change', (event) => updateManualModeUI(event.target.value))

  manualForm?.addEventListener('submit', async (event) => {
    event.preventDefault()
    const mode = modeSelect?.value || 'qr'
    const tokenOrId = manualInput?.value?.trim()

    if (!tokenOrId) {
      setStatus('warning', 'Input required', 'Provide the QR token or ticket ID.')
      return
    }

    if (mode === 'ticket') {
      const reason = manualReasonInput?.value?.trim()
      if (!reason) {
        setStatus('warning', 'Reason required', 'Manual entry needs a reason to proceed.')
        manualReasonInput?.focus()
        return
      }
      await handleManualTicket(tokenOrId, reason)
    } else {
      await handleQrValidation(tokenOrId)
    }

    manualForm.reset()
    updateManualModeUI(modeSelect?.value || 'qr')
    manualInput?.focus()
  })

  let _stream = null
  let _scanning = false
  let _raf = null

  const stopVideoAndScan = () => {
    _scanning = false
    if (_raf) cancelAnimationFrame(_raf)
    try {
      if (videoEl) {
        videoEl.pause()
        try { videoEl.srcObject = null } catch (e) {}
      }
      if (_stream) {
        _stream.getTracks().forEach((t) => t.stop())
        _stream = null
      }
    } catch (err) {
      console.warn('Error stopping camera', err)
    }
    setStatus('', 'Scanning paused', 'Camera stopped. Use manual input to continue.')
  }

  const startVideoAndScan = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setStatus('danger', 'Camera unsupported', 'This browser cannot access the camera.')
      return
    }

    try {
      _stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      if (videoEl) {
        videoEl.srcObject = _stream
        await videoEl.play()
      }

      setStatus('', 'Camera ready', 'Point the camera at the QR code.')
      _scanning = true

      const ctx = canvasEl && canvasEl.getContext ? canvasEl.getContext('2d') : null

      const scanFrame = () => {
        if (!_scanning) return
        try {
          const w = videoEl.videoWidth || 640
          const h = videoEl.videoHeight || 480
          if (canvasEl) {
            if (canvasEl.width !== w || canvasEl.height !== h) {
              canvasEl.width = w
              canvasEl.height = h
            }
          }

          if (ctx && videoEl.readyState === videoEl.HAVE_ENOUGH_DATA) {
            ctx.drawImage(videoEl, 0, 0, canvasEl.width, canvasEl.height)
            const imageData = ctx.getImageData(0, 0, canvasEl.width, canvasEl.height)
            const code = typeof jsQR === 'function' ? jsQR(imageData.data, canvasEl.width, canvasEl.height) : null
            if (code && code.data) {
              // Found a QR payload — stop camera and validate
              stopVideoAndScan()
              handleQrValidation(code.data)
              return
            }
          }
        } catch (err) {
          console.warn('Scan frame error', err)
        }
        _raf = requestAnimationFrame(scanFrame)
      }

      _raf = requestAnimationFrame(scanFrame)
    } catch (err) {
      setStatus('danger', 'Camera Error', err?.message || 'Failed to access camera')
      if (_stream) {
        try { _stream.getTracks().forEach((t) => t.stop()) } catch (e) {}
        _stream = null
      }
    }
  }

  startCamera?.addEventListener('click', () => startVideoAndScan())
  stopCamera?.addEventListener('click', () => stopVideoAndScan())

  async function handleQrValidation(token) {
    setStatus('', 'Validating…', 'Checking with backend for authenticity and usage status.')
    try {
      const result = await validateWithBackend(token, auth.gateId)
      const now = new Date()
      const stamp = `${now.toISOString().slice(0, 10)} ${now.toTimeString().slice(0, 5)}`
      appendLog({ bookingId: result.ticketId, result: result.label, statusClass: result.className, time: stamp, mode: result.mode || 'QR' })
      if (result.className === 'success') {
        setStatus('success', 'VALID – ALLOW ENTRY', result.detail || `Marked as used at ${stamp}.`)
      } else if (result.className === 'warning') {
        setStatus('warning', result.label.toUpperCase(), result.detail)
      } else {
        setStatus('danger', result.label.toUpperCase(), result.detail)
      }
    } catch (error) {
      setStatus('danger', 'Network / Validation Error', error.message || 'Check Internet Connection')
    }
  }

  async function handleManualTicket(ticketId, reason) {
    setStatus('', 'Manual validation…', 'Using ticket ID fallback. Record the reason for audit.')
    try {
      const result = await validateTicketIdWithBackend(ticketId, reason, auth.gateId)
      const now = new Date()
      const stamp = `${now.toISOString().slice(0, 10)} ${now.toTimeString().slice(0, 5)}`
      appendLog({ bookingId: result.ticketId, result: result.label, statusClass: result.className, time: stamp, mode: result.mode || 'MANUAL' })
      if (result.className === 'success') {
        setStatus('success', 'VALID – ALLOW ENTRY', result.detail || `Manual entry recorded at ${stamp}.`)
      } else if (result.className === 'warning') {
        setStatus('warning', result.label.toUpperCase(), result.detail)
      } else {
        setStatus('danger', result.label.toUpperCase(), result.detail)
      }
    } catch (error) {
      setStatus('danger', 'Manual Validation Failed', error.message || 'Unable to validate ticket ID')
    }
  }
}

async function validateWithBackend(token, gateId) {
  const API_BASE = window.__API_BASE_URL || ''
  const response = await scannerFetch(`${API_BASE}/api/scanner/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, gateId }),
  })

  const payload = await response.json().catch(() => ({}))

  if (response.ok) {
    return {
      ticketId: payload.ticketId || 'UNKNOWN',
      label: 'Valid – Allow Entry',
      detail: payload.qrUsedAt ? `Marked as used at ${payload.qrUsedAt}` : 'Entry permitted.',
      className: 'success',
      mode: 'QR',
    }
  }

  const message = payload?.message || 'Validation failed.'

  if (response.status === 409) {
    return { ticketId: payload.ticketId || 'UNKNOWN', label: 'Already Used', detail: message, className: 'danger' }
  }
  if (response.status === 404) {
    return { ticketId: 'UNKNOWN', label: 'Invalid Ticket', detail: message, className: 'danger' }
  }
  if (response.status === 400) {
    return { ticketId: 'UNKNOWN', label: 'Wrong Date', detail: message, className: 'warning' }
  }

  throw new Error(message)
}

async function validateTicketIdWithBackend(ticketId, reason, gateId) {
  const API_BASE = window.__API_BASE_URL || ''
  const response = await scannerFetch(`${API_BASE}/api/scanner/validate-ticket-id`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ticketId, gateId, reason }),
  })

  const payload = await response.json().catch(() => ({}))

  if (response.ok) {
    return {
      ticketId: payload.ticketId || 'UNKNOWN',
      label: 'Manual Valid – Allow Entry',
      detail: payload.usedAt ? `Manual entry recorded at ${payload.usedAt}` : 'Entry permitted with ticket ID.',
      className: 'success',
      mode: 'MANUAL',
    }
  }

  const message = payload?.message || 'Validation failed.'

  if (response.status === 409) {
    return { ticketId: payload.ticketId || 'UNKNOWN', label: 'Already Used', detail: message, className: 'danger', mode: 'MANUAL' }
  }
  if (response.status === 404) {
    return { ticketId: 'UNKNOWN', label: 'Invalid Ticket', detail: message, className: 'danger', mode: 'MANUAL' }
  }
  if (response.status === 400) {
    return { ticketId: 'UNKNOWN', label: 'Wrong Date / Input', detail: message, className: 'warning', mode: 'MANUAL' }
  }
  if (response.status === 403) {
    return { ticketId: payload.ticketId || 'UNKNOWN', label: 'Payment Pending', detail: message, className: 'warning', mode: 'MANUAL' }
  }

  throw new Error(message)
}
