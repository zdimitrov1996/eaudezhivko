"use client";

import { useTranslations } from "next-intl";
import { useActionState, useId, useRef, useState } from "react";
import { saveShowcasePerfume, type ShowcaseFormState } from "@/actions/admin";
import { CONCENTRATIONS } from "@/lib/perfumes";
import type { ShowcasePerfume } from "@/lib/showcase";
import { FormMessage, SubmitButton } from "../auth/FormBits";
import { CloseIcon, PencilIcon, PlusIcon } from "../icons";
import { submitKeepingValues } from "../submit-keeping-values";

/** "Add a perfume" button, or a pencil when given a perfume to edit; both open the same form. */
export function ShowcaseDialog({ perfume, disabled = false }: { perfume?: ShowcasePerfume; disabled?: boolean }) {
  const t = useTranslations("Admin");
  const tp = useTranslations("AddPerfume");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  // Remounting the form on close drops unsaved edits and old errors
  const [formKey, setFormKey] = useState(0);
  const title = perfume ? t("showcaseEditTitle") : t("showcaseAddTitle");

  return (
    <>
      {perfume ? (
        <button
          type="button"
          onClick={() => dialogRef.current?.showModal()}
          aria-label={t("showcaseEdit", { name: `${perfume.brand} ${perfume.name}` })}
          title={t("showcaseEditTitle")}
          className="btn btn-ghost btn-sm !px-2"
        >
          <PencilIcon className="h-4 w-4" />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => dialogRef.current?.showModal()}
          disabled={disabled}
          className="btn btn-primary btn-sm"
        >
          <PlusIcon width="16" height="16" />
          {t("showcaseAddTitle")}
        </button>
      )}

      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        onClose={() => setFormKey((key) => key + 1)}
        className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-3xl border border-ink-600 bg-ink-850 p-0 text-smoke-100 shadow-2xl shadow-black/40"
      >
        <div className="flex items-center justify-between border-b border-ink-700 px-6 py-4">
          <h2 id={titleId} className="font-serif text-2xl font-semibold">
            {title}
          </h2>
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            aria-label={tp("close")}
            className="btn btn-ghost btn-sm !px-2.5"
          >
            <CloseIcon />
          </button>
        </div>
        <ShowcaseForm key={formKey} perfume={perfume} onDone={() => dialogRef.current?.close()} />
      </dialog>
    </>
  );
}

function ShowcaseForm({ perfume, onDone }: { perfume?: ShowcasePerfume; onDone: () => void }) {
  const t = useTranslations("Admin");
  const tp = useTranslations("AddPerfume");
  const tc = useTranslations("Concentration");
  const id = useId();
  const [state, action, pending] = useActionState<ShowcaseFormState, FormData>(async (prev, formData) => {
    const result = await saveShowcasePerfume(prev, formData);
    if (result?.ok) onDone();
    return result;
  }, undefined);

  return (
    <form onSubmit={submitKeepingValues(action)} className="flex flex-col gap-4 px-6 py-5">
      {perfume && <input type="hidden" name="id" value={perfume.id} />}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={`${id}-brand`} className="field-label">
            {tp("brand")}
          </label>
          <input id={`${id}-brand`} name="brand" required maxLength={100} defaultValue={perfume?.brand} className="field" />
        </div>
        <div>
          <label htmlFor={`${id}-name`} className="field-label">
            {tp("name")}
          </label>
          <input id={`${id}-name`} name="name" required maxLength={150} defaultValue={perfume?.name} className="field" />
        </div>
      </div>

      <div>
        <label htmlFor={`${id}-concentration`} className="field-label">
          {tp("concentration")}
        </label>
        <select
          id={`${id}-concentration`}
          name="concentration"
          defaultValue={perfume?.concentration ?? ""}
          className="field"
        >
          <option value="">{tp("concentrationAny")}</option>
          {CONCENTRATIONS.map((code) => (
            <option key={code} value={code}>
              {tc(code)}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor={`${id}-parfumo`} className="field-label">
          {tp("parfumoUrl")}
        </label>
        <input
          id={`${id}-parfumo`}
          name="parfumoUrl"
          type="url"
          inputMode="url"
          required
          defaultValue={perfume?.parfumoUrl}
          placeholder="https://www.parfumo.com/Perfumes/…"
          className="field"
        />
        <p className="mt-1.5 text-xs text-smoke-500">{t("showcaseLinkHint")}</p>
      </div>

      <FormMessage error={state && !state.ok ? state.error : undefined} />

      <div className="flex justify-end gap-2">
        <button type="button" onClick={onDone} className="btn btn-ghost">
          {tp("cancel")}
        </button>
        <SubmitButton pending={pending} className="btn btn-primary">
          {pending ? t("showcaseSaving") : t("showcaseSave")}
        </SubmitButton>
      </div>
    </form>
  );
}
