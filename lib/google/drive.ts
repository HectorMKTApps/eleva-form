import { Readable } from "stream";
import { google } from "googleapis";
import { getDriveAuth } from "./driveAuth";

function getParentFolderId(): string {
  const id = process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID;
  if (!id) {
    throw new Error("Missing GOOGLE_DRIVE_PARENT_FOLDER_ID configuration.");
  }
  return id;
}

function getDriveClient() {
  return google.drive({ version: "v3", auth: getDriveAuth() });
}

export async function createApplicantFolder(folderName: string): Promise<string> {
  const drive = getDriveClient();
  const res = await drive.files.create({
    requestBody: {
      name: folderName,
      mimeType: "application/vnd.google-apps.folder",
      parents: [getParentFolderId()],
    },
    fields: "id",
  });

  const folderId = res.data.id;
  if (!folderId) {
    throw new Error("Google Drive did not return a folder ID.");
  }
  return folderId;
}

export interface UploadedFile {
  fileId: string;
  webViewLink: string;
}

export async function uploadFileToFolder(
  folderId: string,
  fileName: string,
  mimeType: string,
  buffer: Buffer
): Promise<UploadedFile> {
  const drive = getDriveClient();
  const res = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [folderId],
    },
    media: {
      mimeType,
      body: Readable.from(buffer),
    },
    fields: "id, webViewLink",
  });

  const fileId = res.data.id;
  if (!fileId) {
    throw new Error("Google Drive did not return a file ID.");
  }

  return {
    fileId,
    webViewLink: res.data.webViewLink ?? `https://drive.google.com/file/d/${fileId}/view`,
  };
}

/**
 * Best-effort cleanup for partial failures: removes an applicant's folder
 * (and its contents) so nothing orphaned lingers in Drive. Failures here are
 * swallowed by the caller, which falls back to a FAILED Sheets row instead.
 */
export async function deleteFolderRecursive(folderId: string): Promise<void> {
  const drive = getDriveClient();
  await drive.files.delete({ fileId: folderId });
}
