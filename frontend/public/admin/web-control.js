const backendOrigin = window.location.origin.startsWith('http://localhost:5173')
  ? 'http://localhost:5000'
  : window.location.origin
const adminApiBase = `${backendOrigin}/admin`
const DEFAULT_FREEZE_MESSAGE =
  'Online ticket booking is temporarily unavailable due to technical maintenance. Please try again later. We apologize for the inconvenience.'

const messageEl = document.getElementById('webControlMessage')
const tableBody = document.getElementById('overrideTableBody')
const form = document.getElementById('tuesdayOverrideForm')
const saveBtn = document.getElementById('saveOverrideBtn')
const freezeToggle = document.getElementById('freezeOnlineBookingToggle')
const freezeToggleState = document.getElementById('freezeToggleState')
const freezeMessageInput = document.getElementById('freezeMessageInput')
const saveFreezeBtn = document.getElementById('saveFreezeBtn')
const resetFreezeDefaultBtn = document.getElementById('resetFreezeDefaultBtn')
const freezeControlMessageEl = document.getElementById('freezeControlMessage')

const getAuthToken = () => sessionStorage.getItem('token') || localStorage.getItem('token')

const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;')

const clearAdminSession = () => {
  sessionStorage.removeItem('token')
  sessionStorage.removeItem('role')
  sessionStorage.removeItem('isLoggedIn')
  sessionStorage.removeItem('user')
  localStorage.removeItem('token')
  localStorage.removeItem('role')
}

const setMessage = (text, tone = 'muted') => {
  if (!messageEl) return
  messageEl.textContent = text || ''

  if (!text) {
    messageEl.style.color = ''
    return
  }

  if (tone === 'success') {
    messageEl.style.color = 'var(--success)'
    return
  }

  if (tone === 'error') {
    messageEl.style.color = 'var(--danger)'
    return
  }

  messageEl.style.color = 'var(--muted)'
}

const setFreezeMessage = (text, tone = 'muted') => {
  if (!freezeControlMessageEl) return
  freezeControlMessageEl.textContent = text || ''

  if (!text) {
    freezeControlMessageEl.style.color = ''
    return
  }

  if (tone === 'success') {
    freezeControlMessageEl.style.color = 'var(--success)'
    return
  }

  if (tone === 'error') {
    freezeControlMessageEl.style.color = 'var(--danger)'
    return
  }

  freezeControlMessageEl.style.color = 'var(--muted)'
}

const updateFreezeToggleLabel = () => {
  if (!freezeToggleState) return
  freezeToggleState.textContent = freezeToggle?.checked ? 'ON' : 'OFF'
}

const formatDateOnly = (isoDate) => {
  if (!isoDate) return '--'
  const parsed = new Date(`${isoDate}T00:00:00.000Z`)
  if (Number.isNaN(parsed.getTime())) return isoDate
  return parsed.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })
}

const formatDateTime = (value) => {
  if (!value) return '--'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const authHeaders = () => {
  const token = getAuthToken()
  return token
    ? {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    : { 'Content-Type': 'application/json' }
}

const adminRequest = async (path, options = {}) => {
  const response = await fetch(`${adminApiBase}${path}`, {
    credentials: 'include',
    ...options,
    headers: {
      ...authHeaders(),
      ...(options.headers || {}),
    },
  })

  const payload = await response.json().catch(() => ({}))

  if (response.status === 401 || response.status === 403) {
    clearAdminSession()
    window.location.href = '/admin/login'
    throw new Error('Admin session is not valid. Please sign in again.')
  }

  if (!response.ok || payload?.success !== true) {
    throw new Error(payload?.message || 'Request failed')
  }

  return payload
}

const apiRequest = async (path, options = {}) => {
  const response = await fetch(`${backendOrigin}${path}`, {
    credentials: 'include',
    ...options,
    headers: {
      ...authHeaders(),
      ...(options.headers || {}),
    },
  })

  const payload = await response.json().catch(() => ({}))

  if (response.status === 401 || response.status === 403) {
    clearAdminSession()
    window.location.href = '/admin/login'
    throw new Error('Admin session is not valid. Please sign in again.')
  }

  if (!response.ok || payload?.success !== true) {
    throw new Error(payload?.message || 'Request failed')
  }

  return payload
}

const isTuesday = (isoDate) => {
  if (!isoDate) return false
  const parsed = new Date(`${isoDate}T00:00:00.000Z`)
  if (Number.isNaN(parsed.getTime())) return false
  return parsed.getUTCDay() === 2
}

const renderOverrides = (rows = []) => {
  if (!tableBody) return

  if (!Array.isArray(rows) || rows.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="3">No overrides configured.</td></tr>'
    return
  }

  tableBody.innerHTML = rows
    .map((entry) => {
      const status = (entry?.status || '').toLowerCase()
      const statusLabel = status === 'open' ? 'Open Booking' : 'Closed'
      const statusClass = status === 'open' ? 'success' : 'danger'

      return `
        <tr>
          <td>${escapeHtml(formatDateOnly(entry?.date))}</td>
          <td><span class="status-pill ${statusClass}">${escapeHtml(statusLabel)}</span></td>
          <td>${escapeHtml(formatDateTime(entry?.createdAt))}</td>
        </tr>
      `
    })
    .join('')
}

const loadOverrides = async () => {
  setMessage('Loading overrides...')

  try {
    const payload = await adminRequest('/web-control/overrides?limit=300')
    const rows = payload?.data?.overrides || []
    renderOverrides(rows)
    setMessage('')
  } catch (error) {
    renderOverrides([])
    setMessage(error?.message || 'Unable to load overrides.', 'error')
  }
}

const normalizeFreezeMessage = (value) => {
  if (typeof value !== 'string') return DEFAULT_FREEZE_MESSAGE
  const trimmed = value.trim()
  return trimmed || DEFAULT_FREEZE_MESSAGE
}

const applyFreezeSettings = (settings = {}) => {
  const freezeOnlineBooking = Boolean(settings?.freezeOnlineBooking)
  const freezeMessage = normalizeFreezeMessage(settings?.freezeMessage)

  if (freezeToggle) freezeToggle.checked = freezeOnlineBooking
  if (freezeMessageInput) freezeMessageInput.value = freezeMessage
  updateFreezeToggleLabel()
}

const loadFreezeSettings = async () => {
  setFreezeMessage('Loading emergency booking control...')

  try {
    const payload = await apiRequest('/api/system-settings')
    applyFreezeSettings(payload?.data || {})
    setFreezeMessage('')
  } catch (error) {
    applyFreezeSettings({
      freezeOnlineBooking: false,
      freezeMessage: DEFAULT_FREEZE_MESSAGE,
    })
    setFreezeMessage(error?.message || 'Unable to load emergency control settings.', 'error')
  }
}

const saveFreezeSettings = async () => {
  const freezeOnlineBooking = Boolean(freezeToggle?.checked)
  const freezeMessage = normalizeFreezeMessage(freezeMessageInput?.value || '')

  if (saveFreezeBtn) saveFreezeBtn.disabled = true
  if (resetFreezeDefaultBtn) resetFreezeDefaultBtn.disabled = true
  setFreezeMessage('Saving emergency booking control...')

  try {
    const payload = await apiRequest('/api/system-settings/update-freeze', {
      method: 'POST',
      body: JSON.stringify({
        freezeOnlineBooking,
        freezeMessage,
      }),
    })

    applyFreezeSettings(payload?.data || {})
    setFreezeMessage('Emergency booking control saved successfully.', 'success')
  } catch (error) {
    setFreezeMessage(error?.message || 'Unable to save emergency booking control.', 'error')
  } finally {
    if (saveFreezeBtn) saveFreezeBtn.disabled = false
    if (resetFreezeDefaultBtn) resetFreezeDefaultBtn.disabled = false
  }
}

const resetFreezeMessageToDefault = () => {
  if (freezeMessageInput) freezeMessageInput.value = DEFAULT_FREEZE_MESSAGE
  setFreezeMessage('Public notice message reset to default.', 'success')
}

const saveOverride = async (event) => {
  event.preventDefault()

  const dateInput = document.getElementById('overrideDate')
  const statusInput = document.getElementById('overrideStatus')

  const date = dateInput?.value || ''
  const status = statusInput?.value || 'open'

  if (!date) {
    setMessage('Please select a date.', 'error')
    return
  }

  if (!isTuesday(date)) {
    setMessage('Only Tuesday dates can be overridden.', 'error')
    return
  }

  if (saveBtn) saveBtn.disabled = true
  setMessage('Saving override...')

  try {
    await adminRequest('/web-control/overrides', {
      method: 'POST',
      body: JSON.stringify({ date, status }),
    })

    setMessage('Override saved successfully.', 'success')
    await loadOverrides()
  } catch (error) {
    setMessage(error?.message || 'Unable to save override.', 'error')
  } finally {
    if (saveBtn) saveBtn.disabled = false
  }
}

const bindLogout = () => {
  const logoutBtn = document.getElementById('logoutBtn')
  logoutBtn?.addEventListener('click', async () => {
    clearAdminSession()

    try {
      await fetch(`${backendOrigin}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      })
    } catch (_error) {
      // Ignore network failures during logout.
    }

    window.location.href = '/admin/login'
  })
}

const applyRoleVisibility = () => {
  const role = (sessionStorage.getItem('role') || localStorage.getItem('role') || '').toUpperCase()
  const adminOnly = document.querySelectorAll('[data-requires-role="ADMIN"]')
  adminOnly.forEach((el) => {
    el.style.display = role && role !== 'ADMIN' ? 'none' : ''
  })
}

document.addEventListener('DOMContentLoaded', () => {
  applyRoleVisibility()
  bindLogout()
  form?.addEventListener('submit', saveOverride)
  freezeToggle?.addEventListener('change', updateFreezeToggleLabel)
  saveFreezeBtn?.addEventListener('click', () => {
    void saveFreezeSettings()
  })
  resetFreezeDefaultBtn?.addEventListener('click', resetFreezeMessageToDefault)
  void loadOverrides()
  void loadFreezeSettings()
})
