import { InputHTMLAttributes, LabelHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

export function Label({ className = "", ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={`block text-[12px] font-medium text-[var(--ink-muted)] mb-1.5 ${className}`}
      {...props}
    />
  );
}

const controlClasses =
  "h-[34px] w-full rounded-[6px] border border-[var(--border-strong)] bg-white px-3 text-[13px] text-[var(--ink)] outline-none focus-visible:border-[var(--accent)] disabled:bg-[var(--surface-sunken)] disabled:text-[var(--ink-faint)]";

export function Input({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${controlClasses} ${className}`} {...props} />;
}

export function Select({ className = "", ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={`${controlClasses} ${className}`} {...props} />;
}

export function Textarea({ className = "", ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={`min-h-[72px] w-full rounded-[6px] border border-[var(--border-strong)] bg-white px-3 py-2 text-[13px] text-[var(--ink)] outline-none focus-visible:border-[var(--accent)] ${className}`}
      {...props}
    />
  );
}

export function FieldError({ children }: { children?: string }) {
  if (!children) return null;
  return <p className="mt-1 text-[12px] text-[var(--breach)]">{children}</p>;
}

export function FormField({
  label,
  htmlFor,
  error,
  children,
  hint,
}: {
  label: string;
  htmlFor?: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint && !error && <p className="mt-1 text-[12px] text-[var(--ink-faint)]">{hint}</p>}
      <FieldError>{error}</FieldError>
    </div>
  );
}
