'use strict';

class HttpError extends Error {
  constructor(statusCode, message, { code = null, details = null } = {}) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

const BadRequest = (message, details) => new HttpError(400, message || 'Bad Request', { code: 'bad_request', details });
const Unauthorized = (message = 'Unauthorized', details) => new HttpError(401, message, { code: 'unauthorized', details });
const Forbidden = (message = 'Forbidden', details) => new HttpError(403, message, { code: 'forbidden', details });
const NotFound = (message = 'Not Found', details) => new HttpError(404, message, { code: 'not_found', details });
const Unprocessable = (message = 'Unprocessable Entity', details) => new HttpError(422, message, { code: 'unprocessable', details });
const Conflict = (message = 'Conflict', details) => new HttpError(409, message, { code: 'conflict', details });
const Internal = (message = 'Internal server error', details) => new HttpError(500, message, { code: 'internal_error', details });

module.exports = {
  HttpError,
  BadRequest,
  Unauthorized,
  Forbidden,
  NotFound,
  Unprocessable,
  Conflict,
  Internal,
};
