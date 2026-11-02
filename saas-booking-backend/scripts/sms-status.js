// Records the outcome of a business's SMS carrier registration, which is
// done by hand in the Telnyx portal (brand, campaign, number) for now.
//
//   node scripts/sms-status.js <businessId> approved <+1NUMBER> [brandId] [campaignId]
//   node scripts/sms-status.js <businessId> rejected|suspended|pending
//
// "approved" stores the business's own number and maps it back to the
// business, so replies such as STOP reach the right opt-out list. Uses the
// same credentials as the server (.env).

import 'dotenv/config';

const [businessId, status, fromNumber, brandId, campaignId] = process.argv.slice(2);
const STATUSES = ['pending', 'approved', 'rejected', 'suspended'];
if (!businessId || !STATUSES.includes(status) || (status === 'approved' && !/^\+1\d{10}$/.test(fromNumber ?? ''))) {
  console.error('Usage: node scripts/sms-status.js <businessId> approved <+1NUMBER> [brandId] [campaignId]');
  console.error('       node scripts/sms-status.js <businessId> pending|rejected|suspended');
  process.exit(1);
}

const { FieldValue } = await import('firebase-admin/firestore');
const { db } = await import('../config/firebase.js');

const business = await db.doc(`businesses/${businessId}`).get();
if (!business.exists) {
  console.error(`No business ${businessId}`);
  process.exit(1);
}

const batch = db.batch();
batch.set(db.doc(`businesses/${businessId}/messaging/sms`), {
  status,
  ...(status === 'approved' ? {
    fromNumber,
    telnyx: { brandId: brandId ?? null, campaignId: campaignId ?? null },
    approvedAt: FieldValue.serverTimestamp(),
  } : {}),
  updatedAt: FieldValue.serverTimestamp(),
}, { merge: true });
if (status === 'approved') {
  batch.set(db.doc(`smsNumbers/${fromNumber}`), { businessId, at: FieldValue.serverTimestamp() });
}
batch.create(db.collection(`businesses/${businessId}/auditEvents`).doc(), {
  type: `sms.${status}`, actorUid: 'admin-script', at: FieldValue.serverTimestamp(),
});
await batch.commit();
console.log(`SMS for ${businessId}: ${status}${status === 'approved' ? ` (${fromNumber})` : ''}`);
