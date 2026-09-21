import { NextRequest, NextResponse } from "next/server";
import { getActiveLinesOfBusiness, appendApplicationRow } from "@/lib/google/sheets";
import {
  createApplicantFolder,
  deleteFolderRecursive,
  uploadFileToFolder,
} from "@/lib/google/drive";
import {
  MAX_VOICE_NOTE_SIZE_BYTES,
  sanitizeForFilename,
  validateResumeFile,
  validateTextFields,
  validateVoiceNoteFile,
} from "@/lib/validation";
import { isDuplicateSubmission, isRateLimited } from "@/lib/security/rateLimit";
import { generateSubmissionId } from "@/utils/submissionId";
import type { ApplicationFieldErrors, SubmitApplicationResponse } from "@/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const GENERIC_ERROR_MESSAGE =
  "Something went wrong while submitting your application. Please try again.";

function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

function fail(
  message: string,
  status: number,
  fieldErrors?: ApplicationFieldErrors
): NextResponse<SubmitApplicationResponse> {
  return NextResponse.json({ success: false, message, fieldErrors }, { status });
}

function getStringField(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<SubmitApplicationResponse>> {
  const ip = getClientIp(request);

  if (isRateLimited(ip)) {
    return fail("Too many submissions. Please wait a moment and try again.", 429);
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return fail(GENERIC_ERROR_MESSAGE, 400);
  }

  // Honeypot: real users never fill this hidden field. Bots that do are
  // silently told the submission "succeeded" so they don't retry/adapt.
  const honeypot = getStringField(formData, "website").trim();
  if (honeypot.length > 0) {
    return NextResponse.json({ success: true, submissionId: generateSubmissionId() });
  }

  const idempotencyKey = getStringField(formData, "idempotencyKey").trim();
  if (idempotencyKey && isDuplicateSubmission(idempotencyKey)) {
    return fail("This application is already being submitted.", 409);
  }

  const name = getStringField(formData, "name");
  const phone = getStringField(formData, "phone");
  const email = getStringField(formData, "email");
  const referredBy = getStringField(formData, "referredBy");
  const cityAndDepartment = getStringField(formData, "cityAndDepartment");
  // The client joins its multi-select into a single ", "-separated string
  // before sending it; split it back out only for validation, and keep the
  // original joined string as-is for the Sheets row.
  const lineOfBusiness = getStringField(formData, "lineOfBusiness");
  const lineOfBusinessSelections = lineOfBusiness
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
  const voiceNoteDurationRaw = getStringField(formData, "voiceNoteDurationSeconds");
  const voiceNoteDuration = Number(voiceNoteDurationRaw);

  const resumeEntry = formData.get("resume");
  const voiceNoteEntry = formData.get("voiceNote");

  let activeLinesOfBusiness: string[];
  try {
    activeLinesOfBusiness = await getActiveLinesOfBusiness();
  } catch (error) {
    console.error("[POST /api/applications] failed to load LOB config", error);
    return fail(GENERIC_ERROR_MESSAGE, 502);
  }

  const fieldErrors = validateTextFields(
    {
      name,
      phone,
      email,
      referredBy,
      cityAndDepartment,
      lineOfBusiness: lineOfBusinessSelections,
    },
    activeLinesOfBusiness
  );

  const resumeFile = resumeEntry instanceof File ? resumeEntry : null;
  const resumeError = validateResumeFile({
    name: resumeFile?.name ?? "",
    size: resumeFile?.size ?? 0,
    type: resumeFile?.type ?? "",
  });
  if (resumeError) fieldErrors.resume = resumeError;

  const voiceNoteFile = voiceNoteEntry instanceof File ? voiceNoteEntry : null;
  const voiceNoteError = validateVoiceNoteFile({
    size: voiceNoteFile?.size ?? 0,
    durationSeconds: Number.isFinite(voiceNoteDuration) ? voiceNoteDuration : undefined,
  });
  if (voiceNoteError) fieldErrors.voiceNote = voiceNoteError;

  if (Object.keys(fieldErrors).length > 0) {
    return fail("Please fix the highlighted fields and try again.", 400, fieldErrors);
  }

  // Narrowed by validation above, but TypeScript can't see that.
  if (!resumeFile || !voiceNoteFile) {
    return fail(GENERIC_ERROR_MESSAGE, 400);
  }

  if (voiceNoteFile.size > MAX_VOICE_NOTE_SIZE_BYTES || resumeFile.size > 10 * 1024 * 1024) {
    return fail(GENERIC_ERROR_MESSAGE, 400);
  }

  const submissionId = generateSubmissionId();
  const timestamp = new Date().toISOString();
  const sanitizedName = sanitizeForFilename(name) || "Applicant";
  const folderName = `${submissionId}_${sanitizedName}`;

  let folderId: string | null = null;

  try {
    folderId = await createApplicantFolder(folderName);

    const voiceNoteExt = (() => {
      const type = voiceNoteFile.type || "";
      if (type.includes("mp4")) return ".mp4";
      if (type.includes("ogg")) return ".ogg";
      if (type.includes("wav")) return ".wav";
      return ".webm";
    })();
    const voiceNoteFileName = `${folderName}_Voice_Note${voiceNoteExt}`;
    const resumeExt = resumeFile.name.slice(resumeFile.name.lastIndexOf("."));
    const resumeFileName = `${folderName}_Resume${resumeExt}`;

    const voiceNoteBuffer = Buffer.from(await voiceNoteFile.arrayBuffer());
    const resumeBuffer = Buffer.from(await resumeFile.arrayBuffer());

    const [voiceNoteUpload, resumeUpload] = await Promise.all([
      uploadFileToFolder(
        folderId,
        voiceNoteFileName,
        voiceNoteFile.type || "audio/webm",
        voiceNoteBuffer
      ),
      uploadFileToFolder(
        folderId,
        resumeFileName,
        resumeFile.type || "application/octet-stream",
        resumeBuffer
      ),
    ]);

    await appendApplicationRow({
      submissionId,
      timestamp,
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim(),
      referredBy: referredBy.trim(),
      voiceNoteFileName,
      voiceNoteFileId: voiceNoteUpload.fileId,
      voiceNoteUrl: voiceNoteUpload.webViewLink,
      resumeFileName,
      resumeFileId: resumeUpload.fileId,
      resumeUrl: resumeUpload.webViewLink,
      cityAndDepartment: cityAndDepartment.trim(),
      lineOfBusiness: lineOfBusiness.trim(),
      status: "SUCCESS",
    });

    return NextResponse.json({ success: true, submissionId });
  } catch (error) {
    console.error(
      `[POST /api/applications] submission ${submissionId} failed`,
      error
    );

    if (folderId) {
      try {
        await deleteFolderRecursive(folderId);
      } catch (cleanupError) {
        console.error(
          `[POST /api/applications] cleanup failed for submission ${submissionId}, recording as FAILED`,
          cleanupError
        );
        try {
          await appendApplicationRow({
            submissionId,
            timestamp,
            name: name.trim(),
            phone: phone.trim(),
            email: email.trim(),
            referredBy: referredBy.trim(),
            voiceNoteFileName: "",
            voiceNoteFileId: "",
            voiceNoteUrl: "",
            resumeFileName: "",
            resumeFileId: "",
            resumeUrl: "",
            cityAndDepartment: cityAndDepartment.trim(),
            lineOfBusiness: lineOfBusiness.trim(),
            status: "FAILED",
          });
        } catch (loggingError) {
          console.error(
            `[POST /api/applications] failed to record FAILED status for submission ${submissionId}`,
            loggingError
          );
        }
      }
    }

    return fail(GENERIC_ERROR_MESSAGE, 502);
  }
}
