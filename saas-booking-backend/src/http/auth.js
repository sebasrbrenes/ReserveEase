// Authentication and business membership for private /api/v1 routes
// (master document, section 14). The business comes from the route and is
// checked against membership; a businessId in a body is never trusted.

import { getAuth } from 'firebase-admin/auth';
import app, { db } from '../../config/firebase.js';
import { ApiError } from './errors.js';

export const requireAuth = async (req, res, next) => {
  const match = /^Bearer (.+)$/.exec(req.get('authorization') || '');
  if (!match) return next(new ApiError(401, 'UNAUTHENTICATED', 'Sign in required'));
  try {
    const token = await getAuth(app).verifyIdToken(match[1]);
    if (!token.email_verified) {
      return next(new ApiError(403, 'EMAIL_NOT_VERIFIED', 'Verify your email to continue'));
    }
    req.user = { uid: token.uid, email: token.email };
    return next();
  } catch {
    return next(new ApiError(401, 'UNAUTHENTICATED', 'Session expired or invalid'));
  }
};

// Requires the signed-in user to be a member of :businessId.
export const requireMember = async (req, res, next) => {
  try {
    const { businessId } = req.params;
    const member = await db.doc(`businesses/${businessId}/members/${req.user.uid}`).get();
    // Same answer whether the business exists or not, so nothing leaks.
    if (!member.exists) return next(new ApiError(403, 'FORBIDDEN', 'You do not have access to this business'));
    req.member = { businessId, role: member.data().role };
    return next();
  } catch (error) {
    return next(error);
  }
};
