/**
 * Grant (or revoke) the { admin: true } custom claim on a Firebase user.
 *
 * The Firestore security rules (../../firestore.rules) restrict reads of every
 * user's data, and the analytics collections, to accounts whose auth token
 * carries { admin: true }. The admin panel must run as such an account.
 *
 * Usage (from the backend/ directory, with FIREBASE_SERVICE_ACCOUNT_JSON set in
 * backend/.env):
 *
 *   node scripts/set-admin-claim.js you@example.com          # grant admin
 *   node scripts/set-admin-claim.js you@example.com --revoke # revoke admin
 *   node scripts/set-admin-claim.js --uid <firebase-uid>     # by uid instead
 *
 * After running, the user must sign out and back in (or refresh their ID token)
 * for the new claim to take effect.
 */
const path = require("path");
const dotenv = require("dotenv");
const admin = require("firebase-admin");

dotenv.config({ path: path.join(__dirname, "..", ".env") });

function parseServiceAccountFromEnv() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) return null;
  const parsed = JSON.parse(raw);
  if (parsed && typeof parsed.private_key === "string") {
    parsed.private_key = parsed.private_key.replace(/\\n/g, "\n");
  }
  return parsed;
}

async function main() {
  const args = process.argv.slice(2);
  const revoke = args.includes("--revoke");
  const uidFlagIndex = args.indexOf("--uid");
  const byUid = uidFlagIndex !== -1 ? args[uidFlagIndex + 1] : null;
  const identifier = byUid || args.find((a) => !a.startsWith("--"));

  if (!identifier) {
    console.error(
      "Usage: node scripts/set-admin-claim.js <email> [--revoke]\n" +
        "       node scripts/set-admin-claim.js --uid <uid> [--revoke]",
    );
    process.exit(1);
  }

  const serviceAccount = parseServiceAccountFromEnv();
  if (!serviceAccount) {
    console.error(
      "FIREBASE_SERVICE_ACCOUNT_JSON is not set in backend/.env. Cannot continue.",
    );
    process.exit(1);
  }

  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

  const user = byUid
    ? await admin.auth().getUser(byUid)
    : await admin.auth().getUserByEmail(identifier);

  const nextClaims = { ...(user.customClaims || {}) };
  if (revoke) {
    delete nextClaims.admin;
  } else {
    nextClaims.admin = true;
  }

  await admin.auth().setCustomUserClaims(user.uid, nextClaims);
  console.log(
    `${revoke ? "Revoked" : "Granted"} admin claim for ${user.email || user.uid} (uid: ${user.uid}).`,
  );
  console.log("The user must sign out and back in for the change to take effect.");
  process.exit(0);
}

main().catch((error) => {
  console.error("Failed to set admin claim:", error.message);
  process.exit(1);
});
