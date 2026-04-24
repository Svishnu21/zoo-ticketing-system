// Confirmation page that fetches booking and payment status by Easebuzz transaction id.
import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'

const API_BASE_URL = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? 'http://localhost:5000'
  : ''

interface BookingItem {
  itemCode: string
  label: string
  quantity: number
  unitPrice: number
  lineTotal: number
}

interface BookingPayload {
  bookingId: string
  customerName: string
  customerEmail: string
  customerPhone: string
  visitDate: string
  totalAmount: number
  currency: string
  status: string
  paymentStatus: string
  issuedAt?: string
  createdAt?: string
  items: BookingItem[]
}

interface StatusResponse {
  success: boolean
  txnid: string
  ticketId?: string
  qrImage?: string
  booking: BookingPayload
  payment: {
    status: string
    method: string
    providerPaymentId?: string
    failureReason?: string
  }
}

/** Clear all booking-related sessionStorage so the next booking starts fresh. */
function resetBookingSessionState() {
  sessionStorage.removeItem('bookingFlowState')
  sessionStorage.removeItem('latestTxnId')
  sessionStorage.removeItem('latestBookingId')
  sessionStorage.removeItem('latestVerificationToken')
}

export function BookingConfirmed() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const txnid = searchParams.get('txnid') || ''
  const bookingIdFromQuery = searchParams.get('bookingId') || ''

  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [data, setData] = useState<StatusResponse | null>(null)

  // Clear stale booking state on mount so the next booking flow starts clean.
  useEffect(() => {
    resetBookingSessionState()
  }, [])

  useEffect(() => {
    const fetchStatus = async () => {
      if (!txnid) {
        setErrorMessage('Missing transaction id.')
        setIsLoading(false)
        return
      }

      try {
        const response = await fetch(`${API_BASE_URL}/api/payment/status/${encodeURIComponent(txnid)}`)
        const payload = (await response.json()) as StatusResponse

        if (!response.ok || !payload?.success) {
          throw new Error((payload as { message?: string })?.message || 'Failed to load booking status.')
        }

        setData(payload)
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'Failed to fetch booking status.')
      } finally {
        setIsLoading(false)
      }
    }

    void fetchStatus()
  }, [txnid])

  const handleBookAgain = useCallback(() => {
    resetBookingSessionState()
    navigate('/tickets/zoo')
  }, [navigate])

  const handlePrint = useCallback(() => {
    window.print()
  }, [])

  const handleShare = useCallback(async () => {
    const ticketId = data?.ticketId || bookingIdFromQuery || 'ticket'
    const shareUrl = window.location.href

    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Kurumbapatti Zoo Ticket',
          text: `Here is your zoo ticket entry. Ticket ID: ${ticketId}`,
          url: shareUrl,
        })
      } else {
        await navigator.clipboard.writeText(shareUrl)
        alert('Ticket link copied to clipboard!')
      }
    } catch (err) {
      console.error('Error sharing ticket:', err)
    }
  }, [data?.ticketId, bookingIdFromQuery])

  if (isLoading) {
    return (
      <section className="mx-auto flex max-w-3xl flex-col items-center justify-center px-4 py-20 min-h-[50vh]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-green-200 border-t-green-700 mb-4"></div>
        <p className="text-gray-600 font-medium tracking-widest font-mono">Loading Ticket...</p>
      </section>
    )
  }

  if (errorMessage) {
    return (
      <section className="mx-auto max-w-2xl px-4 py-12">
        <div className="rounded-xl border border-red-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-600 font-bold text-2xl">
            X
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Unable to Load Ticket</h1>
          <p className="mt-3 text-gray-600">{errorMessage}</p>
          <button
            type="button"
            onClick={handleBookAgain}
            className="mt-8 inline-block rounded-lg bg-green-700 px-6 py-3 font-semibold text-white shadow-sm hover:bg-green-800 transition-colors"
          >
            Start New Booking
          </button>
        </div>
      </section>
    )
  }

  const booking = data?.booking
  const ticketCount = (booking?.items || []).reduce((sum, item) => sum + (item.quantity || 0), 0)

  // Use the verified ticket identifier embedded directly in the QR string for validation
  const qrValidationString = data?.ticketId || booking?.bookingId || bookingIdFromQuery || 'ticket'

  return (
    <section className="bg-gray-100 py-8 px-4 min-h-screen flex flex-col items-center print:bg-white print:py-0">
      
      {/* 
        This layout precisely replicates the "success.html" thermal receipt formatting.
        Using inline styles and Tailwind to ensure identical print fidelity. 
      */}
      <article 
        className="bg-white border border-black p-4 inline-block w-[340px] max-w-[calc(100vw-24px)] mx-auto relative page-break-inside-avoid shadow-lg print:shadow-none print:border print:m-0"
        style={{ fontFamily: '"Courier New", Consolas, Monaco, Menlo, monospace', lineHeight: '1.35', color: '#000' }}
        aria-label="Kurumbapatti Zoological Park Ticket"
      >
        <header className="text-center">
          <div className="text-[0.82rem] tracking-widest uppercase">Government of Tamil Nadu</div>
          <div className="font-bold text-[1rem] my-0.5">Kurumbapatti Zoological Park, Salem</div>
          <div className="text-[0.92rem] uppercase tracking-widest m-0">Zoo Ticket</div>
        </header>

        <div className="border-t border-dashed border-black my-2"></div>

        <section className="grid gap-1 text-[0.92rem]" aria-label="Ticket identifiers">
          <div className="flex justify-between">
            <span className="uppercase tracking-wide">Ticket ID</span>
            <span className="font-bold">{qrValidationString}</span>
          </div>
          <div className="flex justify-between">
            <span className="uppercase tracking-wide">Ticket Source</span>
            <span className="font-bold">ONLINE</span>
          </div>
          <div className="flex justify-between">
            <span className="uppercase tracking-wide">Visit Date</span>
            <span className="font-bold">
              {booking?.visitDate 
                ? new Date(booking.visitDate).toLocaleDateString('en-GB').replace(/\//g, '-') 
                : '-'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="uppercase tracking-wide">Booked At</span>
            <span className="font-bold">
              {booking?.issuedAt || booking?.createdAt 
                ? new Date(booking.issuedAt || booking.createdAt || '').toLocaleString('en-GB') 
                : '-'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="uppercase tracking-wide">Ticket Count</span>
            <span className="font-bold">{ticketCount > 0 ? ticketCount : '—'}</span>
          </div>
        </section>

        <div className="border-t border-dashed border-black my-2"></div>

        <section aria-label="Ticket breakdown">
          <table className="w-full border-collapse text-[0.92rem] mt-1.5 font-inherit tabular-nums">
            <thead>
              <tr>
                <th className="py-1 text-left text-[0.82rem] uppercase tracking-wider border-b border-dashed border-black">Category</th>
                <th className="py-1 text-right text-[0.82rem] uppercase tracking-wider border-b border-dashed border-black">Qty</th>
                <th className="py-1 text-right text-[0.82rem] uppercase tracking-wider border-b border-dashed border-black">Price</th>
                <th className="py-1 text-right text-[0.82rem] uppercase tracking-wider border-b border-dashed border-black">Amount</th>
              </tr>
            </thead>
            <tbody>
              {booking?.items && booking.items.length > 0 ? (
                booking.items.map((item, idx) => {
                  const isLast = idx === booking.items.length - 1
                  return (
                    <tr key={item.itemCode}>
                      <td className={`py-1 text-left ${isLast ? 'border-b border-black' : 'border-b border-dashed border-black'}`}>{item.label}</td>
                      <td className={`py-1 text-right ${isLast ? 'border-b border-black' : 'border-b border-dashed border-black'}`}>{item.quantity}</td>
                      <td className={`py-1 text-right ${isLast ? 'border-b border-black' : 'border-b border-dashed border-black'}`}>{item.unitPrice}</td>
                      <td className={`py-1 text-right ${isLast ? 'border-b border-black' : 'border-b border-dashed border-black'}`}>{item.lineTotal.toFixed(0)}</td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={4} className="py-1 text-center border-b border-black">No items</td>
                </tr>
              )}
            </tbody>
          </table>
          
          <div className="flex justify-between font-bold mt-1.5 pt-1.5 text-[0.92rem] border-t-2 border-black">
            <span>Total Amount Paid</span>
            <span>INR {booking?.totalAmount ? booking.totalAmount.toFixed(0) : '—'}</span>
          </div>
        </section>

        <div className="border-t border-dashed border-black my-2"></div>

        <section className="flex flex-col items-center gap-2 mt-3 mb-2" aria-label="QR and entry notes">
          <div className="p-1 border-2 border-transparent" aria-label="Gate Validation QR">
            <QRCodeSVG value={qrValidationString} size={150} level="M" />
          </div>
          
          <div className="w-full border-t border-dotted border-black/40 my-1"></div>
          
          <div className="w-full text-center text-[0.85rem] leading-[1.4] space-y-[2px]">
            <div className="font-bold tracking-wide uppercase">SINGLE ENTRY ONLY</div>
            <div>Entry timings: 09:00 AM – 05:00 PM</div>
            <div>Closed on Tuesdays (Weekly Holiday)</div>
            <div>Keep this ticket until you exit the park</div>
          </div>

          <div className="w-full border-t border-dotted border-black/40 my-1"></div>

          <div className="w-full text-center text-[0.85rem] leading-[1.4] font-bold">
            <div>SCAN QR AT ENTRY GATE</div>
            <div className="text-[0.75rem] uppercase tracking-wider font-normal mt-0.5">Ticket once used is invalid for re-entry</div>
          </div>
        </section>
      </article>

      {/* Action Buttons (Hidden in Print) */}
      <div className="mt-6 flex flex-wrap gap-2 justify-center items-center print-hidden">
        <button
          type="button"
          onClick={handlePrint}
          className="border border-black bg-green-600 hover:bg-green-700 text-white px-4 py-2 font-bold focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2 transition-colors font-mono"
        >
          Download Ticket
        </button>

        <button
          type="button"
          onClick={handleShare}
          className="border border-black bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 font-bold focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2 transition-colors font-mono"
        >
          Share Ticket
        </button>
        
        <button
          type="button"
          onClick={handleBookAgain}
          className="border border-black bg-white hover:bg-gray-100 text-black px-4 py-2 font-bold focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2 transition-colors font-mono"
        >
          Back to Home
        </button>
      </div>

      {/* Global Print Styles to perfectly emulate the 80mm thermal/print width without empty pages */}
      <style>{`
        @page {
          size: auto;
          margin: 0;
        }
        @media print {
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
            height: auto !important;
            overflow: visible !important;
          }
          #root {
            padding: 0 !important;
            margin: 0 !important;
          }
          section.min-h-screen {
            min-height: auto !important;
            background: #fff !important;
            display: block !important;
          }
          .print-hidden {
            display: none !important;
          }
          article.page-break-inside-avoid {
            margin: 0 auto !important;
            padding: 10px !important;
            width: 80mm !important;
            max-width: 80mm !important;
            border: none !important;
            box-shadow: none !important;
            page-break-inside: avoid !important;
            page-break-after: auto !important;
            page-break-before: auto !important;
            display: block !important;
            transform: none !important;
            position: relative !important;
          }
        }
      `}</style>
    </section>
  )
}
