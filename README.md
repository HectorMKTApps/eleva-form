# Elevacx — Application Portal

A production-ready Next.js application for collecting Elevacx job applications: personal
details, an in-browser voice note recording, and a resume upload. Text data is stored in
Google Sheets; files are stored in Google Drive. There is no traditional database.

## Tech stack

- Next.js (App Router) + React + TypeScript + Tailwind CSS
- Next.js server-side route handlers (`/app/api/*`)
- Google Sheets (records), accessed server-side via a service account
- Google Drive (files), accessed server-side via OAuth2 delegation to a real personal Google
  account (see note below on why)
- Browser `MediaRecorder` API for in-browser voice recording
- Hosting: Vercel

### Why two different auth methods for Sheets vs. Drive

A Google service account has no storage quota of its own outside a Google Workspace
organization. On a personal (non-Workspace) Gmail account there's no access to Shared
Drives either, so a service account trying to upload a file gets:

```
Service Accounts do not have storage quota. Leverage shared drives, or use OAuth delegation instead.
```

Sheets writes don't create storage-consuming objects the same way, so the service account
still works fine for Sheets. For Drive uploads, this app authenticates as your own personal
Google account via OAuth2 (a one-time consent flow that yields a long-lived refresh token),
so uploaded files count against your personal account's own quota instead.

## 1. Google Cloud setup

1. Create (or select) a Google Cloud project.
2. Enable the **Google Sheets API** and **Google Drive API** for that project (APIs & Services
   → Library).
3. Create a **service account** (APIs & Services → Credentials → Create Credentials → Service
   account). This is used only for Sheets.
4. Open the service account, go to the **Keys** tab, and create a new JSON key. Download it —
   you'll need the `client_email` and `private_key` values from it.
5. Note the service account's email address (looks like
   `something@your-project.iam.gserviceaccount.com`).

### 1a. OAuth2 client for Drive (personal account delegation)

This is separate from the service account above, and is what lets Drive uploads use your own
account's storage quota.

1. In the same Google Cloud project, go to **APIs & Services → OAuth consent screen**.
   - User type: **External**.
   - Fill in the required app name/support email fields.
   - Under **Scopes**, add `https://www.googleapis.com/auth/drive` (search for "Drive API" and
     pick the full `.../auth/drive` scope, not `drive.file` or `drive.readonly`).
   - Under **Test users**, add your own personal Gmail address.
   - Leave **Publishing status** as **Testing** for now — see the note in step 3 of the
     refresh-token section below about what that means long-term.
2. Go to **APIs & Services → Credentials → Create Credentials → OAuth client ID**.
   - Application type: **Web application** (this lets us register the exact loopback redirect
     URI the local script below uses; "Desktop app" clients don't let you set one).
   - Name it anything, e.g. "Elevacx Drive uploader".
   - Under **Authorized redirect URIs**, add exactly:
     ```
     http://localhost:53682/oauth2callback
     ```
3. Save, then copy the **Client ID** and **Client Secret** shown — you'll need both next.

## 2. Google Sheets setup

1. Create a new Google Sheet. Copy its Spreadsheet ID from the URL
   (`https://docs.google.com/spreadsheets/d/<SPREADSHEET_ID>/edit`).
2. Create a tab named exactly **`Applications`** with this header row (any column order is
   fine — columns are matched by header name):

   | Submission ID | Timestamp | Your Name | Phone Number | Email | Referred By | Voice Note File Name | Voice Note File ID | Voice Note URL | Resume File Name | Resume File ID | Resume URL | City and Department | Line of Business | Submission Status |
   |---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|

3. Create a second tab named exactly **`Config`** with this header row:

   | Type | Value | Active | Sort Order |
   |------|-------|--------|------------|

   Add one row per Line of Business option, e.g.:

   | Type | Value | Active | Sort Order |
   |------|-------|--------|------------|
   | LOB  | Sales | TRUE   | 1          |
   | LOB  | Customer Service | TRUE | 2   |
   | LOB  | Retention | TRUE | 3          |

   Administrators can add, remove, rename, reorder, or deactivate (`Active = FALSE`) options
   here at any time — the app reads this on every form load, no redeploy needed.

4. Create a third tab named exactly **`Positions`** with this header row:

   | Position Title | Salary | Job Description | Active |
   |-----------------|--------|------------------|--------|

   Add one row per open role, with `Active` set to exactly **`Y`** (uppercase) to show it —
   anything else (blank, `N`, `n`, `y` lowercase, etc.) hides that row, treated as inactive by
   default. Only active rows appear, in the same order they appear in the sheet — reorder rows
   to reorder the tabs. If no rows are active (or the tab is empty/missing), the panel just
   doesn't render and the application form takes its place; no redeploy is needed to add, edit,
   activate/deactivate, or remove positions.

5. Click **Share** on the spreadsheet and share it with the service account's email address
   (from step 1.5) with **Editor** access.

## 3. Google Drive setup

1. In **your own personal Google Drive** (the account you'll authorize in step 4 below),
   create a folder where applicant subfolders will be created (e.g. `Elevacx Applications`).
2. Copy its folder ID from the URL (`https://drive.google.com/drive/folders/<FOLDER_ID>`).

There's no sharing step here — since uploads authenticate as this same personal account, it
already owns (or can be given direct access to) the folder.

## 4. Get a Drive OAuth refresh token (one-time, run locally)

1. Add the OAuth client credentials from step 1a to `.env.local` (create the file from
   `.env.example` if you haven't yet):

   ```
   GOOGLE_OAUTH_CLIENT_ID=your-client-id.apps.googleusercontent.com
   GOOGLE_OAUTH_CLIENT_SECRET=your-client-secret
   ```

2. Run:

   ```bash
   npm install
   npm run get-drive-token
   ```

3. The script prints a Google sign-in URL. Open it in a browser **signed into the personal
   Google account that should own the uploaded files** (not the service account — personal
   accounts don't have one). Approve access.

   Because the OAuth consent screen is still in **Testing** mode, you'll see an "unverified
   app" warning — that's expected for your own app with only yourself as a test user; click
   **Advanced → Go to (app name) (unsafe)** to continue.

   > **Testing-mode caveat:** refresh tokens issued while the consent screen is in Testing
   > mode expire after **7 days**, which would silently break Drive uploads in production
   > every week. Since this app is only ever used by you as a single account, the simplest
   > fix is to flip **Publishing status** to **In production** on the OAuth consent screen
   > page (no verification review is required unless you request sensitive-scope access for
   > many users) — this removes the 7-day expiry. You'll still see the "unverified app"
   > warning on future re-auths, which is fine to click through as the app's own owner.

4. After you approve access, the script exchanges the code for tokens and prints:

   ```
   GOOGLE_OAUTH_REFRESH_TOKEN=1//09....
   ```

   Copy that line into `.env.local`.

If you ever need a new refresh token (e.g. you revoked access, or rotated the OAuth client
secret), just run `npm run get-drive-token` again.

## 5. Environment variables

`.env.local` should now have all of:

```
GOOGLE_PROJECT_ID=your-project-id
GOOGLE_CLIENT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQ...\n-----END PRIVATE KEY-----\n"
GOOGLE_SPREADSHEET_ID=the-spreadsheet-id-from-step-2
GOOGLE_DRIVE_PARENT_FOLDER_ID=the-folder-id-from-step-3
GOOGLE_OAUTH_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_OAUTH_CLIENT_SECRET=your-client-secret
GOOGLE_OAUTH_REFRESH_TOKEN=the-token-from-step-4
```

`GOOGLE_PRIVATE_KEY` should be the full PEM key from the downloaded JSON key file, on one
line, with `\n` in place of real newlines (this is how the JSON key file already stores it).
The app converts `\n` back to real newlines at runtime, so this works both locally and on
Vercel.

**Never commit `.env.local` or any file containing real credentials.**

## 6. Local development

```bash
npm install
npm run dev
```

Open http://localhost:3000, fill out the form (including a short mic test recording and a
resume file), and submit.

To verify the integration worked:

1. Check the `Applications` tab of your Google Sheet — a new row should appear with
   `Submission Status = SUCCESS`.
2. Check the Drive parent folder — a new subfolder named `<Submission ID>_<Name>` should
   contain the voice note and resume files.

## 7. Deploying to Vercel

1. Push this project to a Git repository and import it into Vercel.
2. In the Vercel project's **Settings → Environment Variables**, add all eight variables
   from `.env.local`. For `GOOGLE_PRIVATE_KEY`, paste it with literal `\n` sequences exactly
   as in the JSON key file — do not try to paste real newlines into the Vercel UI field.
3. If you flip the OAuth consent screen's publishing status to **In production** as
   recommended in step 4, the refresh token in `GOOGLE_OAUTH_REFRESH_TOKEN` won't expire on
   its own and Vercel needs no special handling for it — it's just an opaque string, unlike
   the private key.
4. Deploy. Vercel's default serverless function body-size limit (4.5MB on the Hobby plan,
   configurable higher on Pro) comfortably covers a ~60-second voice note plus a resume under
   10MB in normal use; if you routinely see larger payloads, check your current plan's limit
   in the Vercel dashboard.

### Custom domain

To serve this at a subdomain like `apply.elevacx.com` or `careers.elevacx.com`:

1. In the Vercel project, go to **Settings → Domains** and add the subdomain.
2. Vercel will show a DNS record to add (typically a `CNAME` pointing the subdomain to
   `cname.vercel-dns.com`).
3. Add that record in your DNS provider for the `elevacx.com` zone.
4. Wait for DNS propagation and certificate issuance (usually a few minutes).

## Project structure

```
/app
  /api/applications/route.ts   POST — validates, uploads to Drive, writes to Sheets
  /api/config/route.ts         GET  — active Line of Business options from Sheets
  /api/positions/route.ts      GET  — Open Positions (title/salary/description) from Sheets
  layout.tsx, page.tsx, globals.css
/components
  ApplicationForm, VoiceRecorder, FileUploader, TextField, SelectField,
  FormSection, SuccessScreen, OpenPositions
/lib
  google/       auth.ts (Sheets service account), driveAuth.ts (Drive OAuth2),
                sheets.ts, drive.ts
  validation/   shared client + server validation rules
  security/     basic in-memory rate limiting + idempotency guard
  cache/        short in-memory TTL cache for /api/config and /api/positions
/types
/utils
/scripts
  get-drive-refresh-token.mjs   one-time local script — see setup step 4
```

## Notes on data consistency

- The Submission ID is generated before any Drive/Sheets writes, and Drive uploads happen
  before the Sheets row is written.
- If the Sheets write fails after files were already uploaded to Drive, the app attempts to
  delete the orphaned Drive folder; if that cleanup itself fails, it writes a
  `Submission Status = FAILED` row instead, so nothing is silently lost or falsely reported
  as successful.
- The client never sees a "success" response unless every step actually completed.

## Security

- Google credentials — both the Sheets service account key and the Drive OAuth client
  secret/refresh token — are used only in server-side route handlers and are never sent to
  the browser.
- The Drive OAuth refresh token grants the app account-level Drive access (create/read/delete
  files) for as long as it's valid. Treat it like any other credential: never commit it, and
  revoke it at https://myaccount.google.com/permissions if it's ever exposed.
- All fields, the resume file (type/extension/size), and the voice note (size/duration) are
  re-validated on the server regardless of client-side checks.
- A hidden honeypot field, a per-IP rate limit, and a per-submission idempotency key provide
  basic anti-spam / duplicate-submission protection. There's room to add CAPTCHA later if
  spam becomes an issue.
- Error responses never include stack traces, internal file/folder IDs, or credentials.
