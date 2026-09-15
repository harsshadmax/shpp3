import { ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "secondary" | "destructive";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-[var(--primary)] text-white border border-[var(--primary)] hover:bg-[var(--primary-hover)] hover:border-[var(--primary-hover)]",
  secondary:
    "bg-white text-[var(--ink)] border border-[var(--border-strong)] hover:bg-[var(--surface-sunken)]",
  destructive:
    "bg-white text-[var(--breach)] border border-[var(--breach)] hover:bg-[var(--breach-bg)]",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", className = "", disabled, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      disabled={disabled}
      className={`h-[34px] px-4 rounded-[6px] text-[13px] font-medium inline-flex items-center justify-center gap-2 disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer ${variantClasses[variant]} ${className}`}
      {...props}
    />
  );
});
