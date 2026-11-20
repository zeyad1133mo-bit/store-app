/* ==========================================================================
   utils.js — shared helpers for all routes
   --------------------------------------------------------------------------
   1. HttpError: an error that carries an HTTP status code.
   2. asyncHandler: wraps async route handlers so rejected promises
      reach the central error middleware instead of crashing.
   3. Validation helpers so every endpoint checks its input the same way.
   ========================================================================== */

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

/* Forward async errors to Express's error middleware. */
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

/* Throw a 400 if any of the required fields is missing or empty. */
function requireFields(body, fields) {
  const missing = fields.filter((field) => {
    const value = body ? body[field] : undefined;
    return value === undefined || value === null ||
      (typeof value === 'string' && value.trim() === '');
  });

  if (missing.length) {
    throw new HttpError(400, `Missing required field(s): ${missing.join(', ')}`);
  }
}

/* A trimmed string that is never empty and never longer than maxLength. */
function cleanString(value, field, maxLength) {
  const text = String(value).trim();
  if (!text) throw new HttpError(400, `${field} is required`);
  if (maxLength && text.length > maxLength) {
    throw new HttpError(400, `${field} must be ${maxLength} characters or fewer`);
  }
  return text;
}

/* An optional trimmed string that is never longer than maxLength. */
function optionalString(value, field, maxLength) {
  if (value === undefined || value === null || String(value).trim() === '') {
    return null;
  }
  const text = String(value).trim();
  if (maxLength && text.length > maxLength) {
    throw new HttpError(400, `${field} must be ${maxLength} characters or fewer`);
  }
  return text;
}

/* A whole number, e.g. stock quantity or an id. */
function toPositiveInt(value, field, { min = 0 } = {}) {
  const num = Number(value);
  if (!Number.isInteger(num) || num < min) {
    throw new HttpError(400, `${field} must be a whole number${min ? ` of at least ${min}` : ''}`);
  }
  return num;
}

/* A number that may have decimals but can never be negative, e.g. a price. */
function toNonNegativeNumber(value, field) {
  const num = Number(value);
  if (Number.isNaN(num) || num < 0) {
    throw new HttpError(400, `${field} must be a number of 0 or more`);
  }
  return num;
}

/* MySQL error codes raised when a foreign key does not match. */
function isForeignKeyError(error) {
  return error && (
    error.code === 'ER_NO_REFERENCED_ROW_2' ||
    error.code === 'ER_ROW_IS_REFERENCED_2'
  );
}

module.exports = {
  HttpError,
  asyncHandler,
  requireFields,
  cleanString,
  optionalString,
  toPositiveInt,
  toNonNegativeNumber,
  isForeignKeyError
};
