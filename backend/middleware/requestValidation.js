import { body, param, query, validationResult } from 'express-validator'
import { ApiError } from '../utils/errors.js'

const TICKET_ID_PATTERN = /^KZP-[0-9]{6}-[A-Z0-9]{6}$/

export const validate = (rules) => [
  ...rules,
  (req, _res, next) => {
    const result = validationResult(req)
    if (result.isEmpty()) return next()

    return next(
      ApiError.badRequest('Validation failed.', {
        errors: result.array().map((item) => ({ field: item.path, message: item.msg })),
      }),
    )
  },
]

export const authLoginRules = [
  body('email').optional({ nullable: true }).isString().trim().isLength({ min: 3, max: 320 }),
  body('username').optional({ nullable: true }).isString().trim().isLength({ min: 3, max: 320 }),
  body('password').isString().isLength({ min: 1, max: 128 }),
  body('secretCode').optional({ nullable: true }).isString().trim().isLength({ min: 4, max: 32 }),
]

export const changePasswordRules = [
  body('currentPassword').isString().isLength({ min: 8, max: 128 }),
  body('newPassword').isString().isLength({ min: 8, max: 128 }),
]

export const bookingCreateRules = [
  body('visitDate').optional({ nullable: true }).isISO8601().withMessage('visitDate must be a valid date.'),
  body('paymentMode').optional({ nullable: true }).isString().trim().isLength({ min: 3, max: 16 }),
  body('selectedItems').optional({ nullable: true }).isArray({ min: 1 }),
  body('items').optional({ nullable: true }).isArray({ min: 1 }),
  body('visitorName').isString().trim().isLength({ min: 1, max: 120 }),
  body('visitorMobile').isString().trim().matches(/^\D*\d(?:\D*\d){9}\D*$/),
  body('visitorEmail').optional({ nullable: true }).isEmail().normalizeEmail(),
]

export const bookingIdRules = [
  param('id').isString().trim().matches(TICKET_ID_PATTERN),
  query('token').optional({ nullable: true }).isString().trim().isLength({ min: 8, max: 256 }),
]

export const counterLoginRules = [
  body('email').optional({ nullable: true }).isString().trim().isLength({ min: 3, max: 320 }),
  body('username').optional({ nullable: true }).isString().trim().isLength({ min: 3, max: 320 }),
  body('password').isString().isLength({ min: 1, max: 128 }),
]

export const counterBookingRules = [
  body('visitDate').optional({ nullable: true }).isISO8601(),
  body('paymentMode').isString().trim().isLength({ min: 3, max: 16 }),
  body('items').optional({ nullable: true }).isArray({ min: 1 }),
  body('selectedItems').optional({ nullable: true }).isArray({ min: 1 }),
]

export const counterTicketIdRules = [
  param('id').isString().trim().matches(TICKET_ID_PATTERN),
  query('token').optional({ nullable: true }).isString().trim().isLength({ min: 8, max: 256 }),
]

export const scannerValidateRules = [
  body('token').isString().trim().isLength({ min: 8, max: 512 }),
  body('gateId').optional({ nullable: true }).isString().trim().isLength({ min: 1, max: 64 }),
]

export const scannerValidateTicketIdRules = [
  body('ticketId').isString().trim().matches(TICKET_ID_PATTERN),
  body('gateId').optional({ nullable: true }).isString().trim().isLength({ min: 1, max: 64 }),
  body('reason').optional({ nullable: true }).isString().trim().isLength({ min: 1, max: 240 }),
]

export const freezeControlRules = [
  body('freezeOnlineBooking').isBoolean(),
  body('freezeMessage').optional({ nullable: true }).isString().trim().isLength({ max: 1000 }),
]
