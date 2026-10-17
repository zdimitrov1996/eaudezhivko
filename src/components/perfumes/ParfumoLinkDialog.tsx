"use client";

import { useTranslations } from "next-intl";
import { useActionState, useId, useRef, useState } from "react";
import { addParfumoLink, type AddPerfumeState } from "@/actions/perfumes";
import type { Perfume } from "@/lib/perfumes";
import { FormMessage, SubmitButton } from "../auth/FormBits";
import { CloseIcon, PlusIcon } from "../icons";
import { submitKeepingValues } from "../submit-keeping-values";

/** For a perfume without a Parfumo link: add one, and the rating and notes follow. */
export function ParfumoLinkDialog({ perfume, label }: { perfume: Perfume; label: string }) {
  const t = useTranslations("ParfumoLink");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  // Remounting the form on close drops unsaved input and old errors
  const [formKey, setFormKey] = useState(0);

  return (
    <>
      <button type="button" onClick={() => dialogRef.current?.showModal()} className="btn btn-secondary btn-sm">
        <PlusIcon className="h-4 w-4" />
        {label}
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        onClose={() => setFormKey((key) => key + 1)}
        className="m-auto w-[calc(100%-2rem)] max-w-md rounded-3xl border border-ink-600 bg-ink-850 p-0 text-smoke-100 shadow-2xl shadow-black/40"
      >
        <div className="flex items-center justify-between border-b border-ink-700 px-6 py-4">
          <div className="min-w-0">
            <h2 id={titleId} className="font-serif text-2xl font-semibold">
              {t("title")}
            </h2>
            <p className="truncate text-sm text-smoke-400">
              {perfume.brand} {perfume.name}
            </p>
          </div>
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            aria-label={t("close")}
            className="btn btn-ghost btn-sm !px-2.5"
          >
            <CloseIcon />
          </button>
        </div>
        <LinkForm key={formKey} perfume={perfume} onDone={() => dialogRef.current?.close()} />
      </dialog>
    </>
  );
}

function LinkForm({ perfume, onDone }: { perfume: Perfume; onDone: () => void }) {
  const t = useTranslations("ParfumoLink");
  const id = useId();
  const [state, action, pending] = useActionState<AddPerfumeState, FormData>(
    async (prev, formData) => {
      const result = await addParfumoLink(prev, formData);
      if (result?.ok) onDone();
      return result;
    },
    undefined,
  );

  return (
    <form onSubmit={submitKeepingValues(action)} className="flex flex-col gap-5 px-6 py-5">
      <input type="hidden" name="perfumeId" value={perfume.id} />
      <p className="text-sm text-smoke-400">{t("intro")}</p>
      <div>
        <label htmlFor={id} className="field-label">
          {t("label")}
        </label>
        <input
          id={id}
          name="parfumoUrl"
          type="url"
          inputMode="url"
          required
          placeholder="https://www.parfumo.com/Perfumes/…"
          className="field"
        />
      </div>

      <FormMessage error={state && !state.ok ? state.error : undefined} />

      <div className="flex justify-end gap-2">
        <button type="button" onClick={onDone} className="btn btn-ghost">
          {t("cancel")}
        </button>
        <SubmitButton pending={pending} className="btn btn-primary">
          {pending ? t("saving") : t("save")}
        </SubmitButton>
      </div>
    </form>
  );
}
