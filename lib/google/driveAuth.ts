import { google } from "googleapis";

// Google Drive uploads are authenticated as a real personal Google account
// via OAuth2 (refresh-token grant), not the Sheets service account: service
// accounts have no storage quota on a personal (non-Workspace) account and
// Shared Drives aren't available there either, so file uploads would fail
// with "Service Accounts do not have storage quota." Delegating to a real
// account's own quota avoids that entirely.
let cachedClient: InstanceType<typeof google.auth.OAuth2> | null = null;

export function getDriveAuth() {
  if (cachedClient) return cachedClient;

  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_OAUTH_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      "Missing Google OAuth configuration for Drive. Check GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, GOOGLE_OAUTH_REFRESH_TOKEN."
    );
  }

  const client = new google.auth.OAuth2(clientId, clientSecret);
  client.setCredentials({ refresh_token: refreshToken });

  cachedClient = client;
  return client;
}
