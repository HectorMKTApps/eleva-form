import type { ReactNode } from "react";

interface FormSectionProps {
  title: string;
  description?: string;
  children: ReactNode;
}

export default function FormSection({ title, description, children }: FormSectionProps) {
  return (
    <fieldset className="border-t border-elevacx-panelBorder/30 pt-6 first:border-t-0 first:pt-0">
      <legend className="mb-1 w-full text-sm font-bold uppercase tracking-wide text-elevacx-panelBorder">
        {title}
      </legend>
      {description ? (
        <p className="mb-4 text-sm text-elevacx-placeholder">{description}</p>
      ) : null}
      <div className="space-y-4">{children}</div>
    </fieldset>
  );
}
