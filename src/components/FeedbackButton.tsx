"use client";

import { useTranslations } from "next-intl";
import { useActionState, useId, useRef, useState } from "react";
import { submitFeedback, type FeedbackState } from "@/actions/feedback";
import { usePathname } from "@/i18n/navigation";
import { FEEDBACK_CATEGORIES } from "@/lib/feedback";
import { FormMessage, SubmitButton } from "./auth/FormBits";
import { ChatIcon, CloseIcon } from "./icons";
import { submitKeepingValues } from "./submit-keeping-values";

/** Floating "Feedback" button with a short form, on every page except the admin panel. */
export function FeedbackButton({ signedIn }: { signedIn: boolean }) {
  const t = useTranslations("Feedback");
  const pathname = usePathname();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  // Remounting the form on close clears it and its result
  const [formKey, setFormKey] = useState(0);

  if (pathname.startsWith("/admin")) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className="btn btn-sm fixed right-4 bottom-4 z-40 border-ink-500 bg-ink-800 text-smoke-100 shadow-lg shadow-black/40 hover:border-moss-600 hover:text-moss-200"
      >
        <ChatIcon className="h-4 w-4 text-moss-400" />
        {t("button")}
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        onClose={() => setFormKey((key) => key + 1)}
        className="m-auto w-[calc(100%-2rem)] max-w-md rounded-3xl border border-ink-600 bg-ink-850 p-0 text-smoke-100 shadow-2xl shadow-black/60"
      >
        <div className="flex items-center justify-between border-b border-ink-700 px-6 py-4">
          <h2 id={titleId} className="font-serif text-2xl font-semibold">
            {t("title")}
          </h2>
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            aria-label={t("close")}
            className="btn btn-ghost btn-sm !px-2.5"
          >
            <CloseIcon />
          </button>
        </div>
        <FeedbackForm
          key={formKey}
          signedIn={signedIn}
          page={pathname}
          onDone={() => dialogRef.current?.close()}
        />
      </dialog>
    </>
  );
}

function FeedbackForm({
  signedIn,
  page,
  onDone,
}: {
  signedIn: boolean;
  page: string;
  onDone: () => void;
}) {
  const t = useTranslations("Feedback");
  const [state, action, pending] = useActionState<FeedbackState, FormData>(submitFeedback, undefined);

  if (state?.ok) {
    return (
      <div className="px-6 py-8 text-center">
        <p className="font-serif text-2xl font-semibold text-moss-300">{t("thanksTitle")}</p>
        <p className="mt-2 text-sm text-smoke-400">{t("thanksBody")}</p>
        <button type="button" onClick={onDone} className="btn btn-secondary mt-6">
          {t("close")}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submitKeepingValues(action)} className="flex flex-col gap-5 px-6 py-5">
      <p className="text-sm text-smoke-400">{t("intro")}</p>
      <input type="hidden" name="page" value={page} />

      {/* Honeypot: hidden from people, filled by bots */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>
          Website
          <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <fieldset>
        <legend className="field-label">{t("category")}</legend>
        <div className="flex flex-wrap gap-2">
          {FEEDBACK_CATEGORIES.map((category, index) => (
            <label key={category} className="cursor-pointer">
              <input
                type="radio"
                name="category"
                value={category}
                defaultChecked={index === 0}
                className="peer sr-only"
              />
              <span className="inline-flex rounded-full border border-ink-600 px-3.5 py-1.5 text-sm text-smoke-300 transition-colors peer-checked:border-moss-600 peer-checked:bg-moss-900 peer-checked:text-moss-200 peer-focus-visible:outline-2 peer-focus-visible:outline-moss-400 hover:border-ink-500">
                {t(`categories.${category}`)}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <label htmlFor="feedback-message" className="field-label">
          {t("message")}
        </label>
        <textarea
          id="feedback-message"
          name="message"
          required
          minLength={5}
          maxLength={2000}
          rows={5}
          placeholder={t("messagePlaceholder")}
          className="field resize-y"
        />
      </div>

      {!signedIn && (
        <div>
          <label htmlFor="feedback-email" className="field-label">
            {t("email")} <span className="font-normal text-smoke-500">({t("optional")})</span>
          </label>
          <input
            id="feedback-email"
            name="contactEmail"
            type="email"
            autoComplete="email"
            maxLength={254}
            className="field"
          />
          <p className="mt-1.5 text-xs text-smoke-500">{t("emailHint")}</p>
        </div>
      )}

      <FormMessage error={state && !state.ok ? state.error : undefined} />

      <div className="flex justify-end gap-2">
        <button type="button" onClick={onDone} className="btn btn-ghost">
          {t("cancel")}
        </button>
        <SubmitButton pending={pending} className="btn btn-primary">
          {pending ? t("sending") : t("send")}
        </SubmitButton>
      </div>
    </form>
  );
}
