import { createBooking, getTicketSummary, getTicketForDisplay } from '../services/bookingService.js'
import { asyncHandler } from '../utils/errors.js'

export const postBooking = asyncHandler(async (req, res) => {
  console.log('BOOKING PAYLOAD:', JSON.stringify(req.body, null, 2))

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

    console.log('BOOKING SUCCESS RESPONSE', responseObject)
    return res.status(200).json(responseObject)
  } catch (error) {
    console.error('BOOKING FAILED:', error?.message)
    throw error
  }
})

export const getBooking = asyncHandler(async (req, res) => {
  console.log('Incoming ticketId:', req.params.id)
  const ticket = await getTicketForDisplay(req.params.id, { verificationToken: req.query.token })

  // Return the sanitized payload produced by the service. Service includes additional debug logs.
  res.json(ticket)
})
