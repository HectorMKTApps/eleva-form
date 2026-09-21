import { google } from "googleapis";
import { getGoogleAuth } from "./auth";

const APPLICATIONS_TAB = "Applications";
const CONFIG_TAB = "Config";
const POSITIONS_TAB = "Positions";

function getSpreadsheetId(): string {
  const id = process.env.GOOGLE_SPREADSHEET_ID;
  if (!id) {
    throw new Error("Missing GOOGLE_SPREADSHEET_ID configuration.");
  }
  return id;
}

function getSheetsClient() {
  return google.sheets({ version: "v4", auth: getGoogleAuth() });
}

/**
 * Config tab: Type | Value | Active | Sort Order.
 * Returns active LOB values sorted by Sort Order, so admins can reorder
 * or add/remove/deactivate entries from Sheets without a redeploy.
 */
export async function getActiveLinesOfBusiness(): Promise<string[]> {
  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: getSpreadsheetId(),
    range: `${CONFIG_TAB}!A:D`,
  });

  const rows = res.data.values ?? [];
  if (rows.length === 0) return [];

  const headers = rows[0].map((h) => String(h ?? "").trim().toLowerCase());
  const typeIdx = headers.findIndex((h) => h === "type" || h === "category");
  const valueIdx = headers.findIndex((h) => h === "value");
  const activeIdx = headers.findIndex((h) => h === "active");
  const sortIdx = headers.findIndex((h) => h === "sort order" || h === "sortorder");

  if (typeIdx === -1 || valueIdx === -1 || activeIdx === -1) {
    throw new Error("Config sheet is missing required columns (Type, Value, Active).");
  }

  const entries = rows
    .slice(1)
    .filter((row) => String(row[typeIdx] ?? "").trim().toUpperCase() === "LOB")
    .filter((row) => String(row[activeIdx] ?? "").trim().toUpperCase() === "TRUE")
    .map((row) => ({
      value: String(row[valueIdx] ?? "").trim(),
      sortOrder: sortIdx === -1 ? 0 : Number(row[sortIdx] ?? 0) || 0,
    }))
    .filter((entry) => entry.value.length > 0)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  return entries.map((entry) => entry.value);
}

export interface OpenPositionRow {
  title: string;
  salary: string;
  jobDescription: string;
}

/**
 * Positions tab: Position Title | Salary | Job Description | Active.
 * Returns only rows where Active is exactly "Y" (case-sensitive; anything
 * else — blank, "N", "n", "y", etc. — is treated as inactive), in the same
 * order they appear in the sheet (no sorting), so admins control both
 * visibility and display order just by editing/reordering rows.
 */
export async function getOpenPositions(): Promise<OpenPositionRow[]> {
  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: getSpreadsheetId(),
    range: `${POSITIONS_TAB}!A:D`,
  });

  const rows = res.data.values ?? [];
  if (rows.length === 0) return [];

  const headers = rows[0].map((h) => String(h ?? "").trim().toLowerCase());
  const titleIdx = headers.findIndex((h) => h === "position title" || h === "title");
  const salaryIdx = headers.findIndex((h) => h === "salary");
  const descriptionIdx = headers.findIndex(
    (h) => h === "job description" || h === "description"
  );
  const activeIdx = headers.findIndex((h) => h === "active");

  if (titleIdx === -1 || salaryIdx === -1 || descriptionIdx === -1 || activeIdx === -1) {
    throw new Error(
      "Positions sheet is missing required columns (Position Title, Salary, Job Description, Active)."
    );
  }

  return rows
    .slice(1)
    .filter((row) => String(row[activeIdx] ?? "").trim() === "Y")
    .map((row) => ({
      title: String(row[titleIdx] ?? "").trim(),
      salary: String(row[salaryIdx] ?? "").trim(),
      jobDescription: String(row[descriptionIdx] ?? "").trim(),
    }))
    .filter((entry) => entry.title.length > 0);
}

export interface ApplicationRowData {
  submissionId: string;
  timestamp: string;
  name: string;
  phone: string;
  email: string;
  referredBy: string;
  voiceNoteFileName: string;
  voiceNoteFileId: string;
  voiceNoteUrl: string;
  resumeFileName: string;
  resumeFileId: string;
  resumeUrl: string;
  cityAndDepartment: string;
  lineOfBusiness: string;
  status: "SUCCESS" | "FAILED";
}

const HEADER_TO_FIELD: Record<string, keyof ApplicationRowData> = {
  "submission id": "submissionId",
  timestamp: "timestamp",
  "your name": "name",
  "phone number": "phone",
  email: "email",
  "referred by": "referredBy",
  "voice note file name": "voiceNoteFileName",
  "voice note file id": "voiceNoteFileId",
  "voice note url": "voiceNoteUrl",
  "resume file name": "resumeFileName",
  "resume file id": "resumeFileId",
  "resume url": "resumeUrl",
  "city and department": "cityAndDepartment",
  "line of business": "lineOfBusiness",
  "submission status": "status",
};

/**
 * Appends a row matched to the Applications tab's actual header order (by
 * name, not fixed index), so header reordering in Sheets doesn't break writes.
 */
export async function appendApplicationRow(data: ApplicationRowData): Promise<void> {
  const sheets = getSheetsClient();
  const spreadsheetId = getSpreadsheetId();

  const headerRes = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${APPLICATIONS_TAB}!1:1`,
  });

  const headers = (headerRes.data.values?.[0] ?? []).map((h) =>
    String(h ?? "").trim().toLowerCase()
  );

  if (headers.length === 0) {
    throw new Error("Applications sheet is missing a header row.");
  }

  const row = headers.map((header) => {
    const field = HEADER_TO_FIELD[header];
    return field ? data[field] ?? "" : "";
  });

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${APPLICATIONS_TAB}!A:A`,
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: {
      values: [row],
    },
  });
}
