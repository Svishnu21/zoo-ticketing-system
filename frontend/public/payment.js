document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('payment-form')
  const summaryStatus = document.getElementById('summary-status')
  const overlay = document.getElementById('payment-message')
  const messageTitle = document.getElementById('payment-message-title')
  const messageBody = document.getElementById('payment-message-body')
  const closeButton = document.getElementById('payment-message-close')
  const cardNumberInput = document.getElementById('card-number')
  const nameInput = document.getElementById('cardholder-name')
  const expiryInput = document.getElementById('expiry-date')
  const cvcInput = document.getElementById('card-cvc')
  const totalDisplay = document.querySelector('[data-grand-total]')

  const ADOPTION_FLOW_KEY = 'adoptionFlow'
  const ADOPTION_SELECTION_KEY = 'adoptionSelection'
  const ADOPTION_SELECTIONS_KEY = 'adoptionSelections'
  // Consider adoption flow active only when the flag is set AND there is adoption selection data saved.
  const rawAdoptionData = localStorage.getItem(ADOPTION_SELECTIONS_KEY) || localStorage.getItem(ADOPTION_SELECTION_KEY)
  const adoptionFlowActive = localStorage.getItem(ADOPTION_FLOW_KEY) === 'true' && !!rawAdoptionData
  const latestTicketId = sessionStorage.getItem('latestTicketId')
  const successRedirect = adoptionFlowActive
    ? '/adoption-success.html'
    : latestTicketId
      ? `/success.html?ticketId=${encodeURIComponent(latestTicketId)}`
      : null
  const successButtonLabel = adoptionFlowActive ? 'View Certificate' : 'Get Your Ticket'

  const safeParse = (raw) => {
    if (!raw) return null
    try {
      return JSON.parse(raw)
    } catch {
      return null
    }
  }

  const adoptionSelections = adoptionFlowActive ? safeParse(localStorage.getItem(ADOPTION_SELECTIONS_KEY)) : null
  const adoptionSelection = adoptionFlowActive && !adoptionSelections ? safeParse(localStorage.getItem(ADOPTION_SELECTION_KEY)) : null
  const formatCurrency = (value) =>
    `₹ ${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  if (adoptionSelections && Array.isArray(adoptionSelections) && totalDisplay) {
    const total = adoptionSelections.reduce((s, it) => s + (it.priceINR || 0), 0)
    totalDisplay.textContent = formatCurrency(total)
  } else if (adoptionSelection?.amount && totalDisplay) {
    totalDisplay.textContent = formatCurrency(adoptionSelection.amount)
  }
  closeButton.textContent = successButtonLabel

  const VALIDATION_TARGETS = {
    name: 'vishnu',
    expiry: '11/25',
    cvc: '123',
  }

  const toggleOverlay = (visible, title = '', body = '') => {
    if (visible) {
      messageTitle.textContent = title
      messageBody.textContent = body
      overlay.setAttribute('data-visible', 'true')
    } else {
      overlay.setAttribute('data-visible', 'false')
      messageTitle.textContent = ''
      messageBody.textContent = ''
    }
  }

  const showStatus = (message, type) => {
    summaryStatus.textContent = message
    summaryStatus.hidden = false
    summaryStatus.className = type === 'error' ? 'status-banner status-error' : 'status-banner status-success'
  }

  const sanitiseCardNumber = (value) => value.replace(/\D/g, '').slice(0, 16)

  cardNumberInput.addEventListener('input', (event) => {
    const digitsOnly = sanitiseCardNumber(event.target.value)
    const groups = digitsOnly.match(/.{1,4}/g) || []
    event.target.value = groups.join(' ')
  })

  expiryInput.addEventListener('input', (event) => {
    const digits = event.target.value.replace(/\D/g, '').slice(0, 4)
    if (digits.length >= 3) {
      event.target.value = `${digits.slice(0, 2)} / ${digits.slice(2)}`
    } else {
      event.target.value = digits
    }
  })

  const redirectToSuccess = () => {
    if (!successRedirect) {
      alert('Ticket ID missing from booking response. Please complete booking again.')
      return
    }
    window.location.href = successRedirect
  }

  closeButton.addEventListener('click', redirectToSuccess)

  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) {
      if (adoptionFlowActive) {
        redirectToSuccess()
      } else {
        toggleOverlay(false)
        form.reset()
        summaryStatus.hidden = true
      }
    }
  })

  form.addEventListener('submit', (event) => {
    event.preventDefault()

    const rawCardNumber = sanitiseCardNumber(cardNumberInput.value)
    const cardholderName = nameInput.value.trim().toLowerCase()
    const expiry = expiryInput.value.replace(/\s/g, '')
    const cvc = cvcInput.value.trim()

    if (rawCardNumber.length !== 16) {
      showStatus('Card number must contain 16 digits.', 'error')
      return
    }

    if (!cardholderName) {
      showStatus('Enter the cardholder name.', 'error')
      return
    }

    if (!expiry || expiry.length !== 5 || expiry.charAt(2) !== '/') {
      showStatus('Enter a valid expiry date in MM/YY format.', 'error')
      return
    }

    if (cvc.length !== 3) {
      showStatus('CVC must be a 3-digit code.', 'error')
      return
    }

    const isValidDetails =
      cardholderName === VALIDATION_TARGETS.name &&
      expiry === VALIDATION_TARGETS.expiry &&
      cvc === VALIDATION_TARGETS.cvc

    if (!isValidDetails) {
      showStatus('Payment declined. Please verify the cardholder name, expiry, and CVC.', 'error')
      return
    }

    showStatus('Details look good. Processing your payment...', 'success')
    const successMessage = adoptionFlowActive ? 'Your adoption payment is complete.' : 'Your ticket has been successfully generated.'
    toggleOverlay(true, 'Payment Successful!', successMessage)
  })
})
