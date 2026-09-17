import { google } from "googleapis";

// Sheets only — Drive uploads are authenticated separately via OAuth2 user
// delegation (see ./driveAuth.ts), since a service account on a personal
// (non-Workspace) Google account has no storage quota of its own.
const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];

let cachedAuth: InstanceType<typeof google.auth.JWT> | null = null;

function getPrivateKey(): string {
  const raw = process.env.GOOGLE_PRIVATE_KEY ?? "";
  // Vercel/`.env` store the key with literal `\n` sequences; convert to
  // real newlines, since the PEM parser requires actual line breaks.
  return raw.includes("\\n") ? raw.replace(/\\n/g, "\n") : raw;
}

export function getGoogleAuth() {
  if (cachedAuth) return cachedAuth;

  const projectId = process.env.GOOGLE_PROJECT_ID;
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  const privateKey = getPrivateKey();

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Missing Google service account configuration. Check GOOGLE_PROJECT_ID, GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY."
    );
  }

  cachedAuth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: SCOPES,
  });

  return cachedAuth;
}
