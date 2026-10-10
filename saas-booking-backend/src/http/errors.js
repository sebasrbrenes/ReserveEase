// Single error format for /api/v1 (master document, section 13.5):
// { error: { code, message, fields }, requestId }

export class ApiError extends Error {
  constructor(status, code, message, fields = []) {
    super(message);
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

export const notFound = (req, res, next) => {
  next(new ApiError(404, 'NOT_FOUND', 'Route not found'));
};

// Express recognizes error handlers by their 4-argument signature.
export const errorHandler = (err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    err = new ApiError(400, 'INVALID_INPUT', 'Request body is not valid JSON');
  } else if (err.type === 'entity.too.large') {
    err = new ApiError(413, 'PAYLOAD_TOO_LARGE', 'Request body is too large');
  }

  if (!(err instanceof ApiError)) {
    // Never leak stack traces or provider details to the client.
    console.error(`[${req.requestId}]`, err);
    err = new ApiError(500, 'INTERNAL', 'Unexpected error');
  }

  res.status(err.status).json({
    error: { code: err.code, message: err.message, fields: err.fields },
    requestId: req.requestId,
  });
};
