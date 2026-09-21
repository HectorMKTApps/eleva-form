"use client";

import { useEffect, useRef, useState } from "react";
import FormSection from "./FormSection";
import TextField from "./TextField";
import MultiSelectField from "./MultiSelectField";
import VoiceRecorder from "./VoiceRecorder";
import FileUploader from "./FileUploader";
import SuccessScreen from "./SuccessScreen";
import {
  validateResumeFile,
  validateTextFields,
  validateVoiceNoteFile,
} from "@/lib/validation";
import type {
  ApplicationFieldErrors,
  ApplicationFormValues,
  ConfigResponse,
  SubmitApplicationResponse,
} from "@/types";

const INITIAL_VALUES: ApplicationFormValues = {
  name: "",
  phone: "",
  email: "",
  referredBy: "",
  cityAndDepartment: "",
  lineOfBusiness: [],
};

function generateIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export default function ApplicationForm() {
  const [values, setValues] = useState<ApplicationFormValues>(INITIAL_VALUES);
  const [errors, setErrors] = useState<ApplicationFieldErrors>({});
  const [voiceNoteFile, setVoiceNoteFile] = useState<File | null>(null);
  const [voiceNoteDuration, setVoiceNoteDuration] = useState(0);
  const [resumeFile, setResumeFile] = useState<File | null>(null);

  const [linesOfBusiness, setLinesOfBusiness] = useState<string[]>([]);
  const [configLoading, setConfigLoading] = useState(true);
  const [configError, setConfigError] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submissionId, setSubmissionId] = useState<string | null>(null);

  const idempotencyKeyRef = useRef(generateIdempotencyKey());

  useEffect(() => {
    let cancelled = false;

    async function loadConfig() {
      try {
        const res = await fetch("/api/config");
        if (!res.ok) throw new Error("config request failed");
        const data: ConfigResponse = await res.json();
        if (!cancelled) setLinesOfBusiness(data.linesOfBusiness);
      } catch {
        if (!cancelled) {
          setConfigError(
            "Unable to load the application form right now. Please refresh the page."
          );
        }
      } finally {
        if (!cancelled) setConfigLoading(false);
      }
    }

    loadConfig();
    return () => {
      cancelled = true;
    };
  }, []);

  function updateField<K extends keyof ApplicationFormValues>(
    key: K,
    value: ApplicationFormValues[K]
  ) {
    setValues((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function handleVoiceNoteChange(file: File | null, durationSeconds: number) {
    setVoiceNoteFile(file);
    setVoiceNoteDuration(durationSeconds);
    setErrors((prev) => ({ ...prev, voiceNote: undefined }));
  }

  function handleResumeChange(file: File | null, error: string | null) {
    setResumeFile(file);
    setErrors((prev) => ({ ...prev, resume: error ?? undefined }));
  }

  function resetForm() {
    setValues(INITIAL_VALUES);
    setErrors({});
    setVoiceNoteFile(null);
    setVoiceNoteDuration(0);
    setResumeFile(null);
    setSubmitError(null);
    setSubmissionId(null);
    idempotencyKeyRef.current = generateIdempotencyKey();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isSubmitting) return;

    const textErrors = validateTextFields(values, linesOfBusiness);
    const resumeError = resumeFile
      ? validateResumeFile(resumeFile)
      : "Please upload your updated resume.";
    const voiceNoteError = validateVoiceNoteFile({
      size: voiceNoteFile?.size ?? 0,
      durationSeconds: voiceNoteDuration,
    });

    const nextErrors: ApplicationFieldErrors = {
      ...textErrors,
      ...(resumeError ? { resume: resumeError } : {}),
      ...(voiceNoteError ? { voiceNote: voiceNoteError } : {}),
    };

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const formData = new FormData();
      formData.set("name", values.name.trim());
      formData.set("phone", values.phone.trim());
      formData.set("email", values.email.trim());
      formData.set("referredBy", values.referredBy.trim());
      formData.set("cityAndDepartment", values.cityAndDepartment.trim());
      formData.set(
        "lineOfBusiness",
        values.lineOfBusiness.map((value) => value.trim()).join(", ")
      );
      formData.set("voiceNoteDurationSeconds", String(voiceNoteDuration));
      formData.set("idempotencyKey", idempotencyKeyRef.current);
      formData.set("website", ""); // honeypot — must stay empty
      if (voiceNoteFile) formData.set("voiceNote", voiceNoteFile);
      if (resumeFile) formData.set("resume", resumeFile);

      const res = await fetch("/api/applications", {
        method: "POST",
        body: formData,
      });

      const data: SubmitApplicationResponse = await res.json();

      if (data.success) {
        setSubmissionId(data.submissionId);
      } else {
        if (data.fieldErrors) setErrors(data.fieldErrors);
        setSubmitError(data.message);
      }
    } catch {
      setSubmitError("Something went wrong while submitting your application. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (submissionId) {
    return <SuccessScreen submissionId={submissionId} onStartNew={resetForm} />;
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-8">
      {/* Honeypot field: hidden from real users, left empty; bots that fill
          it are silently rejected server-side. */}
      <div className="absolute h-0 w-0 overflow-hidden" aria-hidden="true">
        <label htmlFor="website">Leave this field empty</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <FormSection title="Personal Information">
        <TextField
          label="Your Name"
          name="name"
          type="text"
          placeholder="Enter your full name"
          autoComplete="name"
          value={values.name}
          error={errors.name}
          onChange={(e) => updateField("name", e.target.value)}
        />
        <TextField
          label="Your Phone Number"
          name="phone"
          type="tel"
          placeholder="Enter your phone number"
          autoComplete="tel"
          value={values.phone}
          error={errors.phone}
          onChange={(e) => updateField("phone", e.target.value)}
        />
        <TextField
          label="Email"
          name="email"
          type="email"
          placeholder="Enter your email address"
          autoComplete="email"
          value={values.email}
          error={errors.email}
          onChange={(e) => updateField("email", e.target.value)}
        />
        <TextField
          label="Referred By"
          name="referredBy"
          type="text"
          placeholder="Who referred you?"
          value={values.referredBy}
          error={errors.referredBy}
          onChange={(e) => updateField("referredBy", e.target.value)}
        />
      </FormSection>

      <FormSection
        title="Voice Note"
        description="Record a one-minute voice note about your experience in English."
      >
        <VoiceRecorder error={errors.voiceNote} onChange={handleVoiceNoteChange} />
      </FormSection>

      <FormSection title="Resume" description="Upload your updated resume in English.">
        <FileUploader
          label="Upload Your Updated Resume"
          name="resume"
          file={resumeFile}
          error={errors.resume}
          onChange={handleResumeChange}
        />
      </FormSection>

      <FormSection title="Preferences">
        <TextField
          label="City and Department"
          name="cityAndDepartment"
          type="text"
          placeholder="e.g. Guatemala City, Guatemala"
          maxLength={100}
          value={values.cityAndDepartment}
          error={errors.cityAndDepartment}
          onChange={(e) => updateField("cityAndDepartment", e.target.value)}
        />
        <MultiSelectField
          label="Line of Business of Your Interest"
          name="lineOfBusiness"
          values={values.lineOfBusiness}
          options={linesOfBusiness}
          error={errors.lineOfBusiness ?? configError ?? undefined}
          loading={configLoading}
          onChange={(next) => updateField("lineOfBusiness", next)}
        />
      </FormSection>

      {submitError ? (
        <p role="alert" className="rounded-lg border border-elevacx-required bg-elevacx-inputBg px-4 py-3 text-sm text-elevacx-required">
          {submitError}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting || configLoading}
        className="w-full rounded-lg bg-elevacx-accent-gradient px-6 py-3.5 text-base font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "Submitting your application..." : "Submit Application"}
      </button>
    </form>
  );
}
