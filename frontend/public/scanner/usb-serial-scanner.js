/**
 * USB Serial Scanner Module
 * 
 * Self-contained Web Serial API integration for MJ2818A 2D wired barcode scanner.
 * Reads QR/barcode data via USB Virtual COM (RS232 mode), extracts the token
 * identically to Camera Scanner (raw payload, no transformation), and feeds it
 * into the existing validateWithBackend() call path.
 *
 * Usage:
 *   const usb = initUsbScanner({ setStatus, appendLog, handleQrValidation, auth })
 *   // later: usb.destroy()
 */

// ── Serial port configuration (match your PuTTY session settings) ───────────
const SERIAL_BAUD_RATE = 9600
const SERIAL_DATA_BITS = 8
const SERIAL_STOP_BITS = 1
const SERIAL_PARITY = 'none'

// ── Behavior tuning ─────────────────────────────────────────────────────────
const SCAN_COOLDOWN_MS = 1500
const DEV_MODE = typeof window !== 'undefined' && window.location.search.includes('debug=true')

// ── State enum for the status indicator ─────────────────────────────────────
const UsbState = Object.freeze({
  NOT_CONNECTED: 'not_connected',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  SCANNING: 'scanning',
  DISCONNECTED: 'disconnected',
  ERROR: 'error',
})

/**
 * Check whether the Web Serial API is available in the current browser.
 * @returns {boolean}
 */
export function isWebSerialSupported() {
  return typeof navigator !== 'undefined' && 'serial' in navigator
}

/**
 * Initialize the USB Serial Scanner.
 *
 * @param {Object} deps Shared dependencies from the parent scanner page.
 * @param {Function} deps.setStatus   — setStatus(className, title, message)
 * @param {Function} deps.appendLog   — appendLog({ bookingId, result, statusClass, time, mode })
 * @param {Function} deps.handleQrValidation — handleQrValidation(token) (same as Camera uses)
 * @param {Object}   deps.auth        — { gateId, user, token }
 * @returns {{ destroy: Function }}
 */
export function initUsbScanner(deps) {
  const { setStatus, appendLog, handleQrValidation } = deps

  // ── DOM references ──────────────────────────────────────────────────────
  const statusDot = document.getElementById('usbStatusDot')
  const statusText = document.getElementById('usbStatusText')
  const connectBtn = document.getElementById('usbConnectBtn')
  const disconnectBtn = document.getElementById('usbDisconnectBtn')
  const errorEl = document.getElementById('usbError')
  const browserWarning = document.getElementById('usbBrowserWarning')

  // ── Internal state ──────────────────────────────────────────────────────
  let port = null
  let reader = null
  let readLoopActive = false
  let buffer = ''
  let cooldownActive = false
  let cooldownTimer = null
  let destroyed = false

  // ── Browser support check ───────────────────────────────────────────────
  if (!isWebSerialSupported()) {
    if (browserWarning) {
      browserWarning.textContent = 'USB Scanner requires Chrome 89+ or Edge 89+. This browser does not support Web Serial.'
      browserWarning.style.color = 'var(--red)'
      browserWarning.style.fontWeight = '700'
    }
    if (connectBtn) connectBtn.disabled = true
    updateIndicator(UsbState.ERROR)
    return { destroy: () => {} }
  }

  // ── Status indicator helpers ────────────────────────────────────────────
  function updateIndicator(state) {
    const dotColors = {
      [UsbState.NOT_CONNECTED]: '#9ca3af',
      [UsbState.CONNECTING]: '#f59e0b',
      [UsbState.CONNECTED]: '#22c55e',
      [UsbState.SCANNING]: '#3b82f6',
      [UsbState.DISCONNECTED]: '#ef4444',
      [UsbState.ERROR]: '#ef4444',
    }
    const labels = {
      [UsbState.NOT_CONNECTED]: 'Not connected',
      [UsbState.CONNECTING]: 'Connecting…',
      [UsbState.CONNECTED]: 'Connected — ready to scan',
      [UsbState.SCANNING]: 'Processing scan…',
      [UsbState.DISCONNECTED]: 'Scanner disconnected — please reconnect',
      [UsbState.ERROR]: 'Connection failed',
    }
    if (statusDot) {
      statusDot.style.background = dotColors[state] || '#9ca3af'
    }
    if (statusText) {
      statusText.textContent = labels[state] || state
    }
  }

  function showError(msg) {
    if (errorEl) {
      errorEl.textContent = msg
    }
  }

  function clearError() {
    if (errorEl) {
      errorEl.textContent = ''
    }
  }

  // ── Serial disconnect handler ───────────────────────────────────────────
  function onSerialDisconnect(event) {
    // Only react if *our* port was the one disconnected
    if (event.target === port) {
      readLoopActive = false
      updateIndicator(UsbState.DISCONNECTED)
      setStatus('danger', 'Scanner Disconnected', 'The USB scanner was unplugged. Reconnect the device and click "Connect Scanner".')
      showError('Scanner disconnected — check the USB cable and try reconnecting.')
      showConnectBtn()
    }
  }

  // ── Button visibility helpers ───────────────────────────────────────────
  function showConnectBtn() {
    if (connectBtn) connectBtn.classList.remove('hidden')
    if (disconnectBtn) disconnectBtn.classList.add('hidden')
  }

  function showDisconnectBtn() {
    if (connectBtn) connectBtn.classList.add('hidden')
    if (disconnectBtn) disconnectBtn.classList.remove('hidden')
  }

  // ── Connect to serial port ──────────────────────────────────────────────
  async function connect() {
    if (destroyed) return
    clearError()
    updateIndicator(UsbState.CONNECTING)

    try {
      // User gesture required — browser shows port picker
      port = await navigator.serial.requestPort()
    } catch (err) {
      // User cancelled the dialog or denied permission
      updateIndicator(UsbState.NOT_CONNECTED)
      const msg = err.name === 'NotFoundError'
        ? 'No port selected — please pick your scanner device.'
        : 'Could not connect to scanner — check the device or try again.'
      showError(msg)
      setStatus('warning', 'Connection Cancelled', msg)
      showConnectBtn()
      return
    }

    try {
      await port.open({
        baudRate: SERIAL_BAUD_RATE,
        dataBits: SERIAL_DATA_BITS,
        stopBits: SERIAL_STOP_BITS,
        parity: SERIAL_PARITY,
      })
    } catch (err) {
      updateIndicator(UsbState.ERROR)
      const msg = err.message?.includes('already open')
        ? 'Port is already open in another tab or application.'
        : `Could not open port: ${err.message || 'Unknown error'}`
      showError(msg)
      setStatus('danger', 'Connection Failed', msg)
      port = null
      showConnectBtn()
      return
    }

    // Successfully connected
    navigator.serial.addEventListener('disconnect', onSerialDisconnect)
    updateIndicator(UsbState.CONNECTED)
    setStatus('', 'USB Scanner Ready', 'Connected. Point the scanner at a ticket QR code.')
    clearError()
    showDisconnectBtn()

    // Start reading
    startReadLoop()
  }

  // ── Serial read loop ────────────────────────────────────────────────────
  async function startReadLoop() {
    if (!port || !port.readable) return
    readLoopActive = true
    buffer = ''

    // Use TextDecoderStream to decode incoming bytes to text
    const textDecoder = new TextDecoderStream()
    const readableStreamClosed = port.readable.pipeTo(textDecoder.writable)
    reader = textDecoder.readable.getReader()

    try {
      while (readLoopActive && !destroyed) {
        const { value, done } = await reader.read()
        if (done) break
        if (!value) continue

        // Accumulate chunks into the buffer
        buffer += value

        // Check for terminator (\r or \n) indicating complete payload
        const terminatorIndex = findTerminator(buffer)
        if (terminatorIndex !== -1) {
          const rawPayload = buffer.substring(0, terminatorIndex)
          // Clear buffer — keep anything after the terminator for next scan
          buffer = buffer.substring(terminatorIndex + 1).replace(/^[\r\n]+/, '')

          const cleanedToken = cleanToken(rawPayload)
          if (cleanedToken) {
            await handleScannedToken(cleanedToken, rawPayload)
          }
        }
      }
    } catch (err) {
      if (!destroyed && readLoopActive) {
        console.error('USB Serial read error:', err)
        updateIndicator(UsbState.ERROR)
        setStatus('danger', 'Read Error', `Scanner read failed: ${err.message || 'Unknown error'}`)
        showError('Read error — try disconnecting and reconnecting the scanner.')
      }
    } finally {
      // Release the reader lock
      try {
        reader?.releaseLock()
      } catch (_e) { /* ignore */ }
      reader = null

      // Wait for the pipe to finish
      try {
        await readableStreamClosed
      } catch (_e) { /* ignore — expected if we cancelled */ }
    }
  }

  /**
   * Find the index of the first \r or \n in the buffer.
   * @param {string} buf
   * @returns {number} index or -1
   */
  function findTerminator(buf) {
    for (let i = 0; i < buf.length; i++) {
      if (buf[i] === '\r' || buf[i] === '\n') return i
    }
    return -1
  }

  /**
   * Clean the raw serial payload.
   * ONLY strip leading/trailing whitespace and control characters.
   * NEVER apply a generic "remove non-alphanumeric" filter.
   * Preserves full base64url character set: A-Z a-z 0-9 - _ =
   *
   * @param {string} raw
   * @returns {string}
   */
  function cleanToken(raw) {
    // Strip control characters (\r \n \t \0) and whitespace from edges
    return raw.replace(/^[\s\r\n\t\0]+/, '').replace(/[\s\r\n\t\0]+$/, '')
  }

  /**
   * Handle a fully received and cleaned token from the scanner.
   * Mirrors Camera Scanner behavior: pass token directly to handleQrValidation().
   *
   * @param {string} token - cleaned token string
   * @param {string} rawBuffer - original raw buffer (for dev logging)
   */
  async function handleScannedToken(token, rawBuffer) {
    if (cooldownActive || destroyed) return

    // Start cooldown immediately to prevent rapid duplicate scans
    cooldownActive = true
    updateIndicator(UsbState.SCANNING)

    // Dev-only logging (remove or gate behind DEV_MODE for production)
    if (DEV_MODE) {
      console.log('[USB Scanner] Raw buffer:', JSON.stringify(rawBuffer))
      console.log('[USB Scanner] Final token:', token)
    }

    let finalToken = token
    let decodedValue = null

    try {
      if (token.startsWith('http://') || token.startsWith('https://')) {
        const url = new URL(token)
        decodedValue = url.searchParams.get('ticketId') || url.searchParams.get('token')
      } else if (token.startsWith('{')) {
        const parsed = JSON.parse(token)
        decodedValue = parsed.ticketId || parsed.token || parsed.qrToken
      } else {
        try {
          const decoded = atob(token)
          // Ensure the decoded string looks like our standard IDs
          if (decoded.startsWith('KZP-') || decoded.startsWith('kzp_')) {
            decodedValue = decoded
          }
        } catch (e) {
          // Not Base64
        }
      }
    } catch (e) {
      // Ignore parsing errors
    }

    if (decodedValue) {
      finalToken = decodedValue
    }

    // Call the EXACT same validation path Camera Scanner uses.
    // handleQrValidation() calls validateWithBackend(token, gateId)
    // and handles setStatus + appendLog for the result.
    try {
      await handleQrValidation(finalToken)
    } catch (err) {
      console.error('[USB Scanner] Validation error:', err)
    }

    // Cooldown before accepting next scan
    cooldownTimer = setTimeout(() => {
      cooldownActive = false
      if (!destroyed && readLoopActive) {
        updateIndicator(UsbState.CONNECTED)
      }
    }, SCAN_COOLDOWN_MS)
  }

  // ── Disconnect from serial port ─────────────────────────────────────────
  async function disconnect() {
    readLoopActive = false

    // Cancel the reader if active
    if (reader) {
      try {
        await reader.cancel()
      } catch (_e) { /* ignore */ }
      try {
        reader.releaseLock()
      } catch (_e) { /* ignore */ }
      reader = null
    }

    // Close the port
    if (port) {
      try {
        await port.close()
      } catch (_e) { /* ignore — port may already be closed */ }
      port = null
    }

    navigator.serial.removeEventListener('disconnect', onSerialDisconnect)
    buffer = ''
    updateIndicator(UsbState.NOT_CONNECTED)
    showConnectBtn()
    clearError()
  }

  // ── Destroy (full cleanup for unmount / mode switch) ────────────────────
  async function destroy() {
    destroyed = true
    readLoopActive = false

    if (cooldownTimer) {
      clearTimeout(cooldownTimer)
      cooldownTimer = null
    }
    cooldownActive = false

    await disconnect()
  }

  // ── Tab visibility handling ─────────────────────────────────────────────
  function onVisibilityChange() {
    if (document.visibilityState === 'visible' && port) {
      // Check if port is still readable after tab regains focus
      if (!port.readable) {
        updateIndicator(UsbState.DISCONNECTED)
        setStatus('warning', 'Connection Lost', 'The scanner connection was lost while the tab was inactive. Please reconnect.')
        showError('Connection lost — click Connect Scanner to reconnect.')
        showConnectBtn()
      }
    }
  }
  document.addEventListener('visibilitychange', onVisibilityChange)

  // ── Wire button events ──────────────────────────────────────────────────
  connectBtn?.addEventListener('click', connect)
  disconnectBtn?.addEventListener('click', async () => {
    await disconnect()
    setStatus('', 'Scanner Disconnected', 'USB scanner disconnected. Click Connect to resume.')
  })

  // ── Initial state ──────────────────────────────────────────────────────
  updateIndicator(UsbState.NOT_CONNECTED)

  // ── Public API ──────────────────────────────────────────────────────────
  return {
    destroy: async () => {
      document.removeEventListener('visibilitychange', onVisibilityChange)
      connectBtn?.removeEventListener('click', connect)
      await destroy()
    },
  }
}
