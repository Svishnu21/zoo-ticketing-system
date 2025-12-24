const page = window.location.pathname.split('/').pop() || 'login.html'

const credentials = {
  username: 'scanner',
  password: 'scanner@123',
}

const sessionKey = 'scannerAuth'
const logKey = 'scannerLogs'

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

  form.addEventListener('submit', (event) => {
    event.preventDefault()
    const data = new FormData(form)
    const username = data.get('username')?.toString().trim()
    const password = data.get('password')?.toString().trim()

    if (username === credentials.username && password === credentials.password) {
      const token = {
        token: 'demo-scanner-jwt',
        role: 'SCANNER',
        gateId: 'Gate-1',
        user: username,
        issuedAt: Date.now(),
      }
      sessionStorage.setItem(sessionKey, JSON.stringify(token))
      window.location.href = './validate.html'
    } else {
      errorBox.textContent = 'Invalid credentials'
      form.classList.add('shake')
      setTimeout(() => form.classList.remove('shake'), 400)
    }
  })
}

function guardScanner() {
  const raw = sessionStorage.getItem(sessionKey)
  if (!raw) {
    window.location.href = './login.html'
    return
  }
  try {
    const parsed = JSON.parse(raw)
    if (parsed.role !== 'SCANNER') {
      sessionStorage.removeItem(sessionKey)
      window.location.href = './login.html'
    }
  } catch (e) {
    sessionStorage.removeItem(sessionKey)
    window.location.href = './login.html'
  }
}

function initValidate() {
  const auth = JSON.parse(sessionStorage.getItem(sessionKey) || '{}')
  const gateEl = document.getElementById('scannerGate')
  const userEl = document.getElementById('scannerUser')
  const logoutBtn = document.getElementById('logoutBtn')
  const manualForm = document.getElementById('manualForm')
  const manualInput = document.getElementById('manualInput')
  const statusPanel = document.getElementById('statusPanel')
  const statusTitle = document.getElementById('statusTitle')
  const statusMessage = document.getElementById('statusMessage')
  const startCamera = document.getElementById('startCamera')
  const stopCamera = document.getElementById('stopCamera')
  const logList = document.getElementById('logList')

  let resetTimer = null

  if (gateEl) gateEl.textContent = `Gate: ${auth.gateId || 'Unknown'}`
  if (userEl) userEl.textContent = `Scanner: ${auth.user || 'Unknown'}`

  logoutBtn?.addEventListener('click', () => {
    sessionStorage.removeItem(sessionKey)
    sessionStorage.removeItem(logKey)
    window.location.href = './login.html'
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
            <div>${log.bookingId}</div>
            <div class="log-result ${log.statusClass}">${log.result}</div>
          </div>
        `,
      )
      .join('')
  }

  renderLogs(JSON.parse(sessionStorage.getItem(logKey) || '[]'))

  manualForm?.addEventListener('submit', async (event) => {
    event.preventDefault()
    const token = manualInput?.value?.trim()
    if (!token) return
    await handleValidation(token)
    manualForm.reset()
    manualInput?.focus()
  })

  startCamera?.addEventListener('click', () => {
    setStatus('', 'Camera ready', 'Point the camera at the QR code.')
    // Hook actual camera + decoder here in production.
  })

  stopCamera?.addEventListener('click', () => {
    setStatus('', 'Scanning paused', 'Camera stopped. Use manual input to continue.')
  })

  async function handleValidation(token) {
    setStatus('', 'Validating…', 'Checking with backend for authenticity and usage status.')
    try {
      const result = await mockValidateWithBackend(token)
      const now = new Date()
      const stamp = `${now.toISOString().slice(0, 10)} ${now.toTimeString().slice(0, 5)}`
      appendLog({ bookingId: result.bookingId, result: result.label, statusClass: result.className, time: stamp })
      if (result.className === 'success') {
        setStatus('success', 'VALID – ALLOW ENTRY', `Marked as used at ${stamp}.`)
      } else if (result.className === 'warning') {
        setStatus('warning', result.label.toUpperCase(), result.detail)
      } else {
        setStatus('danger', result.label.toUpperCase(), result.detail)
      }
    } catch (error) {
      setStatus('danger', 'Network / Validation Error', error.message || 'Check Internet Connection')
    }
  }
}

async function mockValidateWithBackend(token) {
  // Replace this with real backend call.
  await wait(450)
  if (token.toUpperCase() === 'NETERR') {
    throw new Error('Check Internet Connection')
  }

  const normalized = token.trim().toUpperCase()

  if (normalized.startsWith('USED')) {
    return {
      bookingId: normalized.replace('USED-', '') || 'UNKNOWN',
      label: 'Already Used',
      detail: 'Entry already recorded for this ticket.',
      className: 'danger',
    }
  }

  if (normalized.startsWith('EXP')) {
    return {
      bookingId: normalized.replace('EXP-', '') || 'UNKNOWN',
      label: 'Expired',
      detail: 'Visit date is past. Deny entry.',
      className: 'warning',
    }
  }

  if (normalized.startsWith('QR-')) {
    return {
      bookingId: normalized,
      label: 'Valid – Allow Entry',
      detail: 'Backend marked this booking as used and logged the scan.',
      className: 'success',
    }
  }

  return {
    bookingId: normalized || 'UNKNOWN',
    label: 'Invalid Ticket',
    detail: 'Token failed signature or does not exist.',
    className: 'danger',
  }
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
