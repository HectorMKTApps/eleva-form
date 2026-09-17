import type { ApplicationFieldErrors, ApplicationFormValues } from "@/types";

export const MAX_NAME_LENGTH = 150;
export const MAX_REFERRED_BY_LENGTH = 150;
export const MAX_CITY_DEPARTMENT_LENGTH = 100;
export const MAX_RESUME_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
export const MAX_RECORDING_SECONDS = 60;
// Small safety margin over the theoretical minimum size of a 60s recording
// at a low bitrate, to reject obviously-tampered/oversized audio blobs.
export const MAX_VOICE_NOTE_SIZE_BYTES = 15 * 1024 * 1024; // 15MB

export const ACCEPTED_RESUME_EXTENSIONS = [".pdf", ".doc", ".docx"];
export const ACCEPTED_RESUME_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Accepts Guatemala local formats (8 digits, optional dashes/spaces) and
// general international formats with an optional leading +.
const PHONE_REGEX = /^\+?[0-9][0-9\s\-()]{6,19}$/;

export function isNonEmptyTrimmed(value: string, maxLength: number): boolean {
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed.length <= maxLength;
}

export function validateTextFields(
  values: Pick<
    ApplicationFormValues,
    "name" | "phone" | "email" | "referredBy" | "cityAndDepartment" | "lineOfBusiness"
  >,
  activeLinesOfBusiness: string[]
): ApplicationFieldErrors {
  const errors: ApplicationFieldErrors = {};

  if (!isNonEmptyTrimmed(values.name, MAX_NAME_LENGTH)) {
    errors.name = "Please enter your name.";
  }

  if (!values.phone.trim() || !PHONE_REGEX.test(values.phone.trim())) {
    errors.phone = "Please enter your phone number.";
  }

  if (!values.email.trim() || !EMAIL_REGEX.test(values.email.trim())) {
    errors.email = "Please enter a valid email address.";
  }

  if (!isNonEmptyTrimmed(values.referredBy, MAX_REFERRED_BY_LENGTH)) {
    errors.referredBy = "Please tell us who referred you.";
  }

  if (!isNonEmptyTrimmed(values.cityAndDepartment, MAX_CITY_DEPARTMENT_LENGTH)) {
    errors.cityAndDepartment = "Please enter your city and department.";
  }

  if (
    !values.lineOfBusiness.trim() ||
    !activeLinesOfBusiness.includes(values.lineOfBusiness.trim())
  ) {
    errors.lineOfBusiness = "Please select the line of business you're interested in.";
  }

  return errors;
}

export function getFileExtension(filename: string): string {
  const idx = filename.lastIndexOf(".");
  return idx === -1 ? "" : filename.slice(idx).toLowerCase();
}

export function validateResumeFile(file: {
  name: string;
  size: number;
  type: string;
}): string | null {
  if (!file || !file.size) {
    return "Please upload your updated resume.";
  }
  const ext = getFileExtension(file.name);
  const typeOk =
    ACCEPTED_RESUME_MIME_TYPES.includes(file.type) ||
    ACCEPTED_RESUME_EXTENSIONS.includes(ext);
  if (!typeOk) {
    return "Please upload your updated resume.";
  }
  if (file.size > MAX_RESUME_SIZE_BYTES) {
    return "Please upload your updated resume.";
  }
  return null;
}

export function validateVoiceNoteFile(file: {
  size: number;
  durationSeconds?: number;
}): string | null {
  if (!file || !file.size) {
    return "Please record your one-minute voice note.";
  }
  if (file.size > MAX_VOICE_NOTE_SIZE_BYTES) {
    return "Please record your one-minute voice note.";
  }
  if (
    typeof file.durationSeconds === "number" &&
    file.durationSeconds > MAX_RECORDING_SECONDS + 2
  ) {
    return "Please record your one-minute voice note.";
  }
  return null;
}

export function sanitizeForFilename(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9\s_-]/g, "")
    .trim()
    .replace(/\s+/g, "_")
    .slice(0, 80);
}
