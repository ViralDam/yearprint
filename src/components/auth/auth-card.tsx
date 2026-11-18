import type { ReactNode } from "react";

/** The newsprint card used by sign-in, sign-up and account pages. */
export function AuthCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto mt-[30px] max-w-[460px] px-4">
      <div className="newsprint p-[clamp(22px,5vw,34px)]">
        <h1 className="mb-1 text-center font-display text-[30px] font-black">{title}</h1>
        <p className="mb-5 text-center text-[15px] leading-normal text-ink-soft italic">
          {subtitle}
        </p>
        {children}
      </div>
    </div>
  );
}

export function Field({
  label,
  name,
  type = "text",
  autoComplete,
  placeholder,
  defaultValue,
  hint,
}: {
  label: string;
  name: string;
  type?: string;
  autoComplete?: string;
  placeholder?: string;
  defaultValue?: string;
  hint?: string;
}) {
  return (
    <label className="mb-3.5 block font-sans text-[11px] font-extrabold tracking-[0.14em] text-ink-soft uppercase">
      {label}
      <input
        name={name}
        type={type}
        autoComplete={autoComplete}
        placeholder={placeholder}
        defaultValue={defaultValue}
        required
        className="mt-1.5 block w-full rounded-[3px] border-[1.5px] border-rule/45 bg-[#fffdf4] px-3 py-[11px] font-serif text-base tracking-normal text-ink normal-case dark:bg-paper-2"
      />
      {hint && (
        <span className="mt-1 block font-serif text-[13px] font-normal tracking-normal text-ink-faint normal-case italic">
          {hint}
        </span>
      )}
    </label>
  );
}

export function FormMessage({ error, message }: { error?: string; message?: string }) {
  if (error) {
    return (
      <p role="alert" className="mb-3 font-sans text-[13.5px] font-semibold text-accent">
        {error}
      </p>
    );
  }
  if (message) {
    return (
      <p role="status" className="mb-3 font-sans text-[13.5px] font-semibold text-good">
        {message}
      </p>
    );
  }
  return null;
}
