interface SelectFieldProps {
  label: string;
  name: string;
  value: string;
  options: string[];
  error?: string;
  disabled?: boolean;
  loading?: boolean;
  placeholder?: string;
  onChange: (value: string) => void;
}

export default function SelectField({
  label,
  name,
  value,
  options,
  error,
  disabled,
  loading,
  placeholder = "Select an option",
  onChange,
}: SelectFieldProps) {
  const errorId = `${name}-error`;

  return (
    <div>
      <label htmlFor={name} className="mb-1.5 block text-sm font-medium text-elevacx-text">
        {label} <span className="text-elevacx-required">*</span>
      </label>
      <select
        id={name}
        name={name}
        value={value}
        disabled={disabled || loading}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full rounded-lg border bg-elevacx-inputBg px-3.5 py-2.5 text-elevacx-text transition-colors focus:outline-none focus:ring-2 focus:ring-elevacx-inputFocus disabled:opacity-60 ${
          error ? "border-elevacx-required" : "border-elevacx-inputBorder"
        }`}
      >
        <option value="" disabled className="text-elevacx-placeholder">
          {loading ? "Loading options..." : placeholder}
        </option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      {error ? (
        <p id={errorId} role="alert" className="mt-1.5 flex items-center gap-1 text-sm text-elevacx-required">
          <span aria-hidden="true">⚠</span> {error}
        </p>
      ) : null}
    </div>
  );
}
