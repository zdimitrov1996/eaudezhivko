"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";

/** A submit button that asks for confirmation before the form is sent. */
export function ConfirmSubmit({
  message,
  className,
  disabled = false,
  children,
}: {
  message: string;
  className?: string;
  disabled?: boolean;
  children: ReactNode;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className={className}
      onClick={(event) => {
        if (!window.confirm(message)) event.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
