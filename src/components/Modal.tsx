"use client";

import { Fragment, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { CloseIcon } from "./icons";

/**
 * A button that opens a modal dialog with a title and a close button. The body
 * remounts every time the dialog closes, which drops unsaved input and old results.
 */
export function Modal({
  trigger,
  title,
  subtitle,
  closeLabel,
  wide = false,
  children,
}: {
  /** Renders the button that opens the dialog */
  trigger: (open: () => void) => ReactNode;
  title: string;
  subtitle?: string;
  closeLabel: string;
  wide?: boolean;
  /** The dialog body; `close` shuts the dialog */
  children: (close: () => void) => ReactNode;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const [bodyKey, setBodyKey] = useState(0);
  const close = () => setIsOpen(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (isOpen && !dialog?.open) dialog?.showModal();
    if (!isOpen && dialog?.open) dialog.close();
  }, [isOpen]);

  return (
    <>
      {trigger(() => setIsOpen(true))}
      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        // Also fires on Esc
        onClose={() => {
          setIsOpen(false);
          setBodyKey((key) => key + 1);
        }}
        className={`m-auto w-[calc(100%-2rem)] ${wide ? "max-w-lg" : "max-w-md"} rounded-3xl border border-ink-600 bg-ink-850 p-0 text-smoke-100 shadow-2xl shadow-black/50`}
      >
        <div className="flex items-center justify-between gap-3 border-b border-ink-700 px-6 py-4">
          <div className="min-w-0">
            <h2 id={titleId} className="font-serif text-2xl font-semibold">
              {title}
            </h2>
            {subtitle && <p className="truncate text-sm text-smoke-400">{subtitle}</p>}
          </div>
          <button type="button" onClick={close} aria-label={closeLabel} className="btn btn-ghost btn-sm !px-2.5">
            <CloseIcon />
          </button>
        </div>
        <Fragment key={bodyKey}>{children(close)}</Fragment>
      </dialog>
    </>
  );
}
