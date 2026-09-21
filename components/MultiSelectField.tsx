"use client";

import { useEffect, useId, useRef, useState } from "react";

interface MultiSelectFieldProps {
  label: string;
  name: string;
  values: string[];
  options: string[];
  error?: string;
  loading?: boolean;
  placeholder?: string;
  onChange: (values: string[]) => void;
}

const SUMMARY_INLINE_MAX_LENGTH = 32;

function summarizeSelection(values: string[], placeholder: string): string {
  if (values.length === 0) return placeholder;
  if (values.length === 1) return values[0];
  const joined = values.join(", ");
  return joined.length <= SUMMARY_INLINE_MAX_LENGTH ? joined : `${values.length} selected`;
}

export default function MultiSelectField({
  label,
  name,
  values,
  options,
  error,
  loading,
  placeholder = "Select an option",
  onChange,
}: MultiSelectFieldProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listboxId = useId();
  const labelId = `${name}-label`;
  const errorId = `${name}-error`;

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  function toggleOption(option: string) {
    if (values.includes(option)) {
      onChange(values.filter((value) => value !== option));
    } else {
      onChange([...values, option]);
    }
  }

  function handleContainerKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.stopPropagation();
      setOpen(false);
      triggerRef.current?.focus();
    }
  }

  const summary = loading ? "Loading options..." : summarizeSelection(values, placeholder);

  return (
    <div ref={containerRef} onKeyDown={handleContainerKeyDown} className="relative">
      <label id={labelId} htmlFor={name} className="mb-1.5 block text-sm font-medium text-elevacx-text">
        {label} <span className="text-elevacx-required">*</span>
      </label>

      <button
        ref={triggerRef}
        type="button"
        id={name}
        disabled={loading}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-labelledby={`${labelId} ${name}`}
        aria-describedby={error ? errorId : undefined}
        onClick={() => setOpen((prev) => !prev)}
        className={`flex w-full items-center justify-between gap-2 rounded-lg border bg-elevacx-inputBg px-3.5 py-2.5 text-left text-elevacx-text transition-colors focus:outline-none focus:ring-2 focus:ring-elevacx-inputFocus disabled:cursor-not-allowed disabled:opacity-60 ${
          error ? "border-elevacx-required" : "border-elevacx-inputBorder"
        }`}
      >
        <span className={`truncate ${values.length === 0 ? "text-elevacx-placeholder" : ""}`}>
          {summary}
        </span>
        <span
          aria-hidden="true"
          className={`shrink-0 text-elevacx-placeholder transition-transform ${open ? "rotate-180" : ""}`}
        >
          ▾
        </span>
      </button>

      {open && !loading ? (
        <ul
          id={listboxId}
          role="listbox"
          aria-multiselectable="true"
          aria-labelledby={labelId}
          className="absolute z-10 mt-1.5 max-h-60 w-full overflow-auto rounded-lg border border-elevacx-inputBorder bg-elevacx-inputBg p-1.5 shadow-lg"
        >
          {options.map((option) => {
            const checked = values.includes(option);
            const optionId = `${name}-option-${option}`;
            return (
              <li key={option} role="option" aria-selected={checked}>
                <label
                  htmlFor={optionId}
                  className="flex cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-elevacx-text hover:bg-elevacx-panel"
                >
                  <input
                    id={optionId}
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleOption(option)}
                    onKeyDown={(event) => {
                      // Native checkboxes already toggle on Space; Enter needs
                      // an explicit handler since browsers don't do it by default.
                      if (event.key === "Enter") {
                        event.preventDefault();
                        toggleOption(option);
                      }
                    }}
                    className="h-4 w-4 shrink-0 rounded border-elevacx-inputBorder bg-elevacx-inputBg text-elevacx-accentFrom focus:outline-none focus:ring-2 focus:ring-elevacx-inputFocus"
                  />
                  <span>{option}</span>
                </label>
              </li>
            );
          })}
        </ul>
      ) : null}

      {error ? (
        <p id={errorId} role="alert" className="mt-1.5 flex items-center gap-1 text-sm text-elevacx-required">
          <span aria-hidden="true">⚠</span> {error}
        </p>
      ) : null}
    </div>
  );
}
