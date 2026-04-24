// Booking page for collecting visitor details and initiating Easebuzz payment.
import { useMemo, useState } from 'react'

const API_BASE_URL = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? 'http://localhost:5000'
  : ''

const TICKET_TYPES = [
  { key: 'ADULT', label: 'Adult', unitPrice: 100 },
  { key: 'CHILD', label: 'Child', unitPrice: 50 },
  { key: 'CAMERA', label: 'Camera', unitPrice: 30 },
] as const

type TicketKey = (typeof TICKET_TYPES)[number]['key']
type Quantities = Record<TicketKey, number>

const initialQuantities: Quantities = {
  ADULT: 0,
  CHILD: 0,
  CAMERA: 0,
}

export function BookingPage() {
  const [customerName, setCustomerName] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [visitDate, setVisitDate] = useState('')
  const [selectedTicketType, setSelectedTicketType] = useState<TicketKey>('ADULT')
  const [quantities, setQuantities] = useState<Quantities>(initialQuantities)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const items = useMemo(() => {
    return TICKET_TYPES
      .map((ticket) => {
        const quantity = quantities[ticket.key]
        return {
          itemCode: ticket.key,
          label: ticket.label,
          unitPrice: ticket.unitPrice,
          quantity,
          lineTotal: ticket.unitPrice * quantity,
        }
      })
      .filter((item) => item.quantity > 0)
  }, [quantities])

  const totalAmount = useMemo(() => items.reduce((sum, item) => sum + item.lineTotal, 0), [items])

  const setQuantity = (key: TicketKey, nextValue: number) => {
    setQuantities((previous) => ({
      ...previous,
      [key]: Math.max(0, Number.isFinite(nextValue) ? Math.floor(nextValue) : 0),
    }))
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrorMessage('')

    if (items.length === 0) {
      setErrorMessage('Please add at least one ticket item before proceeding.')
      return
    }

    try {
      setIsSubmitting(true)

      const csrfCookie = document.cookie.split('; ').find(row => row.startsWith('_csrf='))?.split('=')[1] ?? ''
      const requestHeaders: Record<string, string> = { 'Content-Type': 'application/json' }
      if (csrfCookie) requestHeaders['x-csrf-token'] = csrfCookie

      const response = await fetch(`${API_BASE_URL}/api/payment/initiate`, {
        method: 'POST',
        headers: requestHeaders,
        body: JSON.stringify({
          customerName,
          customerEmail,
          customerPhone,
          visitDate,
          items,
          totalAmount,
        }),
      })

      const payload = await response.json().catch(() => ({}))
      if (!response.ok || !payload.payment_url) {
        throw new Error(payload.message || 'Unable to initiate payment.')
      }

      window.location.href = payload.payment_url
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Payment initiation failed.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-3xl font-bold">Zoo Ticket Booking</h1>
      <p className="mt-2 text-sm text-gray-600">Fill your details, choose tickets, and continue to Easebuzz payment.</p>

      <form className="mt-6 space-y-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm" onSubmit={handleSubmit}>
        <div>
          <label className="block text-sm font-medium">Visitor Name</label>
          <input
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
            value={customerName}
            onChange={(event) => setCustomerName(event.target.value)}
            required
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium">Visitor Email</label>
            <input
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
              type="email"
              value={customerEmail}
              onChange={(event) => setCustomerEmail(event.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Visitor Phone</label>
            <input
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
              type="tel"
              value={customerPhone}
              onChange={(event) => setCustomerPhone(event.target.value)}
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium">Visit Date</label>
          <input
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
            type="date"
            value={visitDate}
            onChange={(event) => setVisitDate(event.target.value)}
            required
          />
        </div>

        <div className="rounded-lg border border-gray-200 p-3">
          <label className="block text-sm font-medium">Ticket Type Selector</label>
          <select
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
            value={selectedTicketType}
            onChange={(event) => setSelectedTicketType(event.target.value as TicketKey)}
          >
            {TICKET_TYPES.map((ticket) => (
              <option key={ticket.key} value={ticket.key}>
                {ticket.label}
              </option>
            ))}
          </select>

          <div className="mt-3">
            <label className="block text-sm font-medium">Quantity for {selectedTicketType}</label>
            <input
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
              type="number"
              min={0}
              value={quantities[selectedTicketType]}
              onChange={(event) => setQuantity(selectedTicketType, Number(event.target.value))}
            />
          </div>
        </div>

        <div className="grid gap-3 rounded-lg border border-gray-200 p-3 md:grid-cols-3">
          {TICKET_TYPES.map((ticket) => (
            <div key={ticket.key}>
              <label className="block text-sm font-medium">
                {ticket.label} (INR {ticket.unitPrice})
              </label>
              <input
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
                type="number"
                min={0}
                value={quantities[ticket.key]}
                onChange={(event) => setQuantity(ticket.key, Number(event.target.value))}
              />
            </div>
          ))}
        </div>

        <div className="rounded-lg bg-gray-50 p-3 text-sm">
          <p className="font-medium">Booking Summary</p>
          {items.length === 0 && <p className="mt-1 text-gray-600">No items selected.</p>}
          {items.map((item) => (
            <p key={item.itemCode} className="mt-1">
              {item.label}: {item.quantity} x INR {item.unitPrice} = INR {item.lineTotal}
            </p>
          ))}
          <p className="mt-2 text-base font-semibold">Total: INR {totalAmount}</p>
        </div>

        {errorMessage && <p className="text-sm text-red-600">{errorMessage}</p>}

        <button
          type="submit"
          className="rounded-md bg-green-700 px-4 py-2 font-semibold text-white hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Redirecting to payment...' : 'Proceed to Pay'}
        </button>
      </form>
    </section>
  )
}
