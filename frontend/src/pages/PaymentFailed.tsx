// Failure page shown after Easebuzz redirects to backend failure callback and back to frontend.
import { useCallback, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

/** Clear all booking-related sessionStorage so the next booking starts fresh. */
function resetBookingSessionState() {
  sessionStorage.removeItem('bookingFlowState')
  sessionStorage.removeItem('latestTxnId')
  sessionStorage.removeItem('latestBookingId')
  sessionStorage.removeItem('latestVerificationToken')
}

export function PaymentFailed() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const txnid = searchParams.get('txnid') || 'N/A'

  // Clear stale booking state on mount so the next booking flow starts clean.
  useEffect(() => {
    resetBookingSessionState()
  }, [])

  const handleRetry = useCallback(() => {
    resetBookingSessionState()
    navigate('/tickets/zoo')
  }, [navigate])

  return (
    <section className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-3xl font-bold text-red-700">Payment Failed</h1>
      <p className="mt-2 text-sm text-gray-700">We could not complete your payment. Please try again.</p>

      <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4">
        <p><strong>Transaction ID:</strong> {txnid}</p>
        <p className="mt-2">No amount has been confirmed for this transaction.</p>
      </div>

      <div className="mt-5">
        <button
          type="button"
          onClick={handleRetry}
          className="rounded-md bg-green-700 px-4 py-2 font-semibold text-white hover:bg-green-800"
        >
          Retry Booking
        </button>
      </div>
    </section>
  )
}
