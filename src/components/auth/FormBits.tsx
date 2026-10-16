"use client";

import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";

export function SubmitButton({
  children,
  pending: pendingProp,
  className = "btn btn-primary w-full",
}: {
  children: ReactNode;
  /** Pass when the form submits via onSubmit, where useFormStatus can't see it */
  pending?: boolean;
  className?: string;
}) {
  const status = useFormStatus();
  const pending = pendingProp ?? status.pending;
  return (
    <button type="submit" disabled={pending} aria-disabled={pending} className={className}>
      {children}
    </button>
  );
}

/** Renders an Errors.* or Auth.* message from a server action result. */
export function FormMessage({ error, message }: { error?: string; message?: string }) {
  const te = useTranslations("Errors");
  const ta = useTranslations("Auth");

  if (error) {
    return (
      <p role="alert" className="rounded-xl border border-ember-400/30 bg-ember-900/60 px-4 py-3 text-sm text-ember-400">
        {te(error)}
      </p>
    );
  }
  if (message) {
    return (
      <p role="status" className="rounded-xl border border-moss-800 bg-moss-900/50 px-4 py-3 text-sm text-moss-200">
        {ta(message)}
      </p>
    );
  }
  return null;
}

export function Divider({ label }: { label: string }) {
  return (
    <div className="my-6 flex items-center gap-3 text-xs tracking-[0.14em] text-smoke-500 uppercase">
      <span className="h-px flex-1 bg-ink-600" />
      {label}
      <span className="h-px flex-1 bg-ink-600" />
    </div>
  );
}
