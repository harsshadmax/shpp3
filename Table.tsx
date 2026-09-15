import { HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from "react";

export function Table({ className = "", ...props }: HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="overflow-x-auto">
      <table className={`w-full border-collapse text-[13px] ${className}`} {...props} />
    </div>
  );
}

export function THead({ className = "", ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={`bg-[var(--surface-sunken)] ${className}`} {...props} />;
}

export function Th({
  className = "",
  numeric = false,
  ...props
}: ThHTMLAttributes<HTMLTableCellElement> & { numeric?: boolean }) {
  return (
    <th
      className={`h-10 px-4 text-[11px] font-semibold tracking-[0.06em] uppercase text-[var(--ink-muted)] border-b border-[var(--border-strong)] ${
        numeric ? "text-right" : "text-left"
      } ${className}`}
      {...props}
    />
  );
}

export function Td({
  className = "",
  numeric = false,
  ...props
}: TdHTMLAttributes<HTMLTableCellElement> & { numeric?: boolean }) {
  return (
    <td
      className={`h-10 px-4 border-b border-[var(--border)] ${
        numeric ? "text-right font-mono-id" : "text-left"
      } ${className}`}
      {...props}
    />
  );
}

export function Tr({
  className = "",
  ...props
}: HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={`hover:bg-[var(--surface-sunken)] ${className}`} {...props} />;
}
