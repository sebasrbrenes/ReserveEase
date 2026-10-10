import crypto from 'crypto';
import { ApiError } from './errors.js';

export const requestId = (req, res, next) => {
  req.requestId = `req_${crypto.randomUUID()}`;
  res.set('X-Request-Id', req.requestId);
  next();
};

// Validates req[source] against a zod schema and replaces it with the parsed value.
export const validate = (schema, source = 'body') => (req, res, next) => {
  const result = schema.safeParse(req[source]);
  if (!result.success) {
    const fields = result.error.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    }));
    return next(new ApiError(400, 'INVALID_INPUT', 'Invalid request', fields));
  }
  req.validated = { ...req.validated, [source]: result.data };
  return next();
};
