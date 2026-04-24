// Utility helpers for Easebuzz SHA-512 hash generation and verification.
//
// Easebuzz Hash Sequences (from official docs):
//   Request (Initiate):
//     key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5|udf6|udf7|udf8|udf9|udf10|salt
//
//   Response verification (surl/furl/webhook — REVERSE order):
//     salt|status|udf10|udf9|udf8|udf7|udf6|udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key
//
//   Transaction Retrieve API:
//     key|txnid|amount|email|phone|salt
//
import crypto from 'crypto'

const toValue = (value) => (value === undefined || value === null ? '' : String(value).trim())

// ---------------------------------------------------------------------------
// 1. Hash for Payment Initiation (initiateLink API)
// ---------------------------------------------------------------------------
export const generateHash = (data, salt) => {
  const hashString = [
    toValue(data.key),
    toValue(data.txnid),
    toValue(data.amount),
    toValue(data.productinfo),
    toValue(data.firstname),
    toValue(data.email),
    toValue(data.udf1),
    toValue(data.udf2),
    toValue(data.udf3),
    toValue(data.udf4),
    toValue(data.udf5),
    toValue(data.udf6),
    toValue(data.udf7),
    toValue(data.udf8),
    toValue(data.udf9),
    toValue(data.udf10),
    toValue(salt),
  ].join('|')

  return crypto.createHash('sha512').update(hashString).digest('hex')
}

// ---------------------------------------------------------------------------
// 2. Reverse-hash verification for surl / furl / webhook callbacks
// ---------------------------------------------------------------------------
export const verifyHash = (data, salt) => {
  const reverseHashString = [
    toValue(salt),
    toValue(data.status),
    toValue(data.udf10),
    toValue(data.udf9),
    toValue(data.udf8),
    toValue(data.udf7),
    toValue(data.udf6),
    toValue(data.udf5),
    toValue(data.udf4),
    toValue(data.udf3),
    toValue(data.udf2),
    toValue(data.udf1),
    toValue(data.email),
    toValue(data.firstname),
    toValue(data.productinfo),
    toValue(data.amount),
    toValue(data.txnid),
    toValue(data.key),
  ].join('|')

  const computed = crypto.createHash('sha512').update(reverseHashString).digest('hex')
  const received = toValue(data.hash).toLowerCase()

  if (!received || computed.length !== received.length) {
    return false
  }

  return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(received))
}

// ---------------------------------------------------------------------------
// 3. Hash for Transaction Retrieve API (v1)
//    Sequence: key|txnid|amount|email|phone|salt
// ---------------------------------------------------------------------------
export const generateRetrieveHash = (data, salt) => {
  const hashString = [
    toValue(data.key),
    toValue(data.txnid),
    toValue(data.amount),
    toValue(data.email),
    toValue(data.phone),
    toValue(salt),
  ].join('|')

  return crypto.createHash('sha512').update(hashString).digest('hex')
}
