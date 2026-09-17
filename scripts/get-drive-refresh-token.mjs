#!/usr/bin/env node
// One-time local helper: run this yourself (`npm run get-drive-token`) to
// obtain a Google OAuth2 refresh token for your personal Google account.
// The app never runs this itself — it only reads the refresh token you
// paste into .env.local / Vercel env vars afterwards.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { google } from "googleapis";

const REDIRECT_PORT = 53682;
const REDIRECT_URI = `http://localhost:${REDIRECT_PORT}/oauth2callback`;
const SCOPES = ["https://www.googleapis.com/auth/drive"];

function loadEnvLocal() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;

  const contents = fs.readFileSync(envPath, "utf8");
  for (const line of contents.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let value = trimmed.slice(eqIdx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnvLocal();

const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;

if (!clientId || !clientSecret) {
  console.error(
    "Missing GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET.\n" +
      "Add them to .env.local first (see README section on Drive OAuth setup), then run this script again."
  );
  process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, REDIRECT_URI);

const authUrl = oauth2Client.generateAuthUrl({
  access_type: "offline",
  prompt: "consent", // forces Google to issue a refresh_token even on repeat runs
  scope: SCOPES,
});

console.log("\n1. Open this URL in a browser signed into the PERSONAL Google account");
console.log("   that should own the uploaded voice notes and resumes:\n");
console.log(authUrl);
console.log(
  '\n2. Approve access. If you see an "unverified app" warning, that is expected for\n' +
    '   your own unpublished OAuth client — click "Advanced" > "Go to (app name) (unsafe)".\n'
);
console.log(`Waiting for the redirect to ${REDIRECT_URI} ...\n`);

const server = http.createServer(async (req, res) => {
  let url;
  try {
    url = new URL(req.url ?? "/", REDIRECT_URI);
  } catch {
    res.statusCode = 400;
    res.end("Bad request.");
    return;
  }

  if (url.pathname !== "/oauth2callback") {
    res.statusCode = 404;
    res.end("Not found.");
    return;
  }

  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  if (error) {
    res.end("Authorization failed. You can close this tab and check the terminal.");
    console.error(`\nAuthorization was denied or failed: ${error}`);
    server.close();
    process.exit(1);
    return;
  }

  if (!code) {
    res.end("No authorization code received. You can close this tab.");
    return;
  }

  try {
    const { tokens } = await oauth2Client.getToken(code);
    res.end("Success! You can close this tab and return to the terminal.");
    server.close();

    if (!tokens.refresh_token) {
      console.error(
        "\nNo refresh_token was returned — Google only issues one the first time you\n" +
          "grant access to this app. Go to https://myaccount.google.com/permissions,\n" +
          'remove access for this app (search by the OAuth client\'s name), then run\n' +
          "this script again."
      );
      process.exit(1);
    }

    console.log(
      "\nSuccess. Add this to your .env.local (and your Vercel project's environment variables):\n"
    );
    console.log(`GOOGLE_OAUTH_REFRESH_TOKEN=${tokens.refresh_token}`);
    console.log("");
    process.exit(0);
  } catch (err) {
    res.end("Something went wrong exchanging the code. Check the terminal.");
    console.error("\nFailed to exchange authorization code for tokens:", err);
    server.close();
    process.exit(1);
  }
});

server.listen(REDIRECT_PORT);
