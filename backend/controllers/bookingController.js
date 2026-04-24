import { createBooking, getTicketSummary, getTicketForDisplay } from '../services/bookingService.js'
import { asyncHandler } from '../utils/errors.js'

export const postBooking = asyncHandler(async (req, res) => {
  try {
    const { ticket, totalAmount, visitDateIso, qrImage, pricedItems, verificationToken } = await createBooking(req.body)

    const responseObject = {
      success: true,
      ticketId: ticket.ticketId,
      qrToken: ticket.qrToken,
      verificationToken,
      visitDate: visitDateIso,
      totalAmount,
      // Additional fields retained for consumers, but response shape matches requirements
      items: pricedItems,
      paymentMode: ticket.paymentMode,
      qrImage,
    }

    console.info('[booking] booking_created', { ticketId: ticket.ticketId, totalAmount })
    return res.status(200).json(responseObject)
  } catch (error) {
    console.warn('[booking] booking_failed', { reason: error?.message })
    throw error
  }
})

export const getBooking = asyncHandler(async (req, res) => {
  const ticket = await getTicketForDisplay(req.params.id, {
    verificationToken: req.query.token,
    accessContext: {
      ip: req.ip,
      userAgent: req.get('user-agent'),
    },
  })

  // Return the sanitized payload produced by the service. Service includes additional debug logs.
  res.json(ticket)
})
