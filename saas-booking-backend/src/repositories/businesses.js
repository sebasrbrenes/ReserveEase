import { publicBusinessSchema } from '../domain/schemas.js';

// Returns the published projection for a slug, or null when it does not
// exist or is not published. Unknown fields are stripped by the schema.
export const getPublishedBusinessBySlug = async (db, slug) => {
  const snap = await db.doc(`publicBusinesses/${slug}`).get();
  if (!snap.exists) return null;
  const parsed = publicBusinessSchema.safeParse(snap.data());
  if (!parsed.success) {
    throw new Error(`publicBusinesses/${slug} does not match the public schema`);
  }
  return parsed.data.status === 'published' ? parsed.data : null;
};
