"use client";

import { useRef } from "react";
import { ACCEPTED_RESUME_EXTENSIONS, validateResumeFile } from "@/lib/validation";

interface FileUploaderProps {
  label: string;
  name: string;
  file: File | null;
  error?: string;
  onChange: (file: File | null, error: string | null) => void;
}

export default function FileUploader({ label, name, file, error, onChange }: FileUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const errorId = `${name}-error`;

  function handleFileSelected(selected: File | null) {
    if (!selected) {
      onChange(null, null);
      return;
    }
    const validationError = validateResumeFile(selected);
    onChange(selected, validationError);
  }

  return (
    <div>
      <label htmlFor={name} className="mb-1.5 block text-sm font-medium text-elevacx-text">
        {label} <span className="text-elevacx-required">*</span>
      </label>

      <input
        ref={inputRef}
        id={name}
        name={name}
        type="file"
        accept={[...ACCEPTED_RESUME_EXTENSIONS, "application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"].join(",")}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        className="sr-only"
        onChange={(e) => handleFileSelected(e.target.files?.[0] ?? null)}
      />

      {file ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-elevacx-inputBorder bg-elevacx-inputBg px-3.5 py-2.5">
          <span className="truncate text-sm text-elevacx-text">📄 {file.name}</span>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="shrink-0 rounded-md border border-elevacx-panelBorder px-3 py-1.5 text-xs font-semibold text-elevacx-panelBorder transition-colors hover:bg-elevacx-panelBorder hover:text-elevacx-panel"
          >
            Change File
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className={`flex w-full items-center justify-center gap-2 rounded-lg border border-dashed bg-elevacx-inputBg px-3.5 py-4 text-sm text-elevacx-placeholder transition-colors hover:border-elevacx-inputFocus hover:text-elevacx-text ${
            error ? "border-elevacx-required" : "border-elevacx-inputBorder"
          }`}
        >
          📎 Choose a file (PDF, DOC, DOCX — max 10MB)
        </button>
      )}

      {error ? (
        <p id={errorId} role="alert" className="mt-1.5 flex items-center gap-1 text-sm text-elevacx-required">
          <span aria-hidden="true">⚠</span> {error}
        </p>
      ) : null}
    </div>
  );
}
