// Shared validation used by the forms (HTML pattern attributes) and mirrored
// server-side in api/quote.js. Keep the two in sync.

// something@something.tld — no spaces, requires a dotted domain.
export const EMAIL_PATTERN = '[^@\\s]+@[^@\\s]+\\.[^@\\s]+'

// Optional phone: +, digits, spaces, dashes, parentheses; 7–20 characters.
export const PHONE_PATTERN = '[+]?[\\d\\s()\\-]{7,20}'
