import type { InputHTMLAttributes } from "react";

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  name: string;
  error?: string;
}

export default function TextField({ label, name, error, ...inputProps }: TextFieldProps) {
  const errorId = `${name}-error`;

  return (
    <div>
      <label htmlFor={name} className="mb-1.5 block text-sm font-medium text-elevacx-text">
        {label} <span className="text-elevacx-required">*</span>
      </label>
      <input
        id={name}
        name={name}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        className={`w-full rounded-lg border bg-elevacx-inputBg px-3.5 py-2.5 text-elevacx-text placeholder:text-elevacx-placeholder transition-colors focus:outline-none focus:ring-2 focus:ring-elevacx-inputFocus ${
          error ? "border-elevacx-required" : "border-elevacx-inputBorder"
        }`}
        {...inputProps}
      />
      {error ? (
        <p id={errorId} role="alert" className="mt-1.5 flex items-center gap-1 text-sm text-elevacx-required">
          <span aria-hidden="true">⚠</span> {error}
        </p>
      ) : null}
    </div>
  );
}
