"use client";

import { useTranslations } from "next-intl";
import { useActionState, useId, useRef, useState } from "react";
import { updatePerfume, type AddPerfumeState } from "@/actions/perfumes";
import { CONCENTRATIONS, type Perfume } from "@/lib/perfumes";
import { FormMessage, SubmitButton } from "../auth/FormBits";
import { CloseIcon, PencilIcon } from "../icons";
import { submitKeepingValues } from "../submit-keeping-values";

/** Pencil button on a card: fix the brand, name, concentration, year or Parfumo link. */
export function EditPerfumeDialog({ perfume }: { perfume: Perfume }) {
  const t = useTranslations("EditPerfume");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  // Remounting the form on close drops unsaved edits and old errors
  const [formKey, setFormKey] = useState(0);

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        aria-label={t("open")}
        title={t("open")}
        className="btn btn-ghost btn-sm !px-2.5"
      >
        <PencilIcon className="h-4 w-4" />
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        onClose={() => setFormKey((key) => key + 1)}
        className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-3xl border border-ink-600 bg-ink-850 p-0 text-smoke-100 shadow-2xl shadow-black/40"
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
        <EditForm key={formKey} perfume={perfume} onDone={() => dialogRef.current?.close()} />
      </dialog>
    </>
  );
}

function EditForm({ perfume, onDone }: { perfume: Perfume; onDone: () => void }) {
  const t = useTranslations("EditPerfume");
  const ta = useTranslations("AddPerfume");
  const tc = useTranslations("Concentration");
  const id = useId();
  const [state, action, pending] = useActionState<AddPerfumeState, FormData>(
    async (prev, formData) => {
      const result = await updatePerfume(prev, formData);
      if (result?.ok) onDone();
      return result;
    },
    undefined,
  );

  return (
    <form onSubmit={submitKeepingValues(action)} className="flex flex-col gap-4 px-6 py-5">
      <input type="hidden" name="perfumeId" value={perfume.id} />
      <p className="text-sm text-smoke-400">{t("intro")}</p>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={`${id}-brand`} className="field-label">
            {ta("brand")}
          </label>
          <input id={`${id}-brand`} name="brand" required maxLength={100} defaultValue={perfume.brand} className="field" />
        </div>
        <div>
          <label htmlFor={`${id}-name`} className="field-label">
            {ta("name")}
          </label>
          <input id={`${id}-name`} name="name" required maxLength={150} defaultValue={perfume.name} className="field" />
        </div>
        <div>
          <label htmlFor={`${id}-concentration`} className="field-label">
            {ta("concentration")}
          </label>
          <select
            id={`${id}-concentration`}
            name="concentration"
            defaultValue={perfume.concentration ?? ""}
            className="field"
          >
            <option value="">{ta("concentrationAny")}</option>
            {CONCENTRATIONS.map((code) => (
              <option key={code} value={code}>
                {tc(code)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={`${id}-year`} className="field-label">
            {ta("year")} <span className="font-normal text-smoke-500">({ta("optional")})</span>
          </label>
          <input
            id={`${id}-year`}
            name="releaseYear"
            type="number"
            inputMode="numeric"
            min={1700}
            max={2100}
            defaultValue={perfume.releaseYear ?? ""}
            className="field"
          />
        </div>
      </div>

      <div>
        <label htmlFor={`${id}-parfumo`} className="field-label">
          {ta("parfumoUrl")} <span className="font-normal text-smoke-500">({ta("optional")})</span>
        </label>
        <input
          id={`${id}-parfumo`}
          name="parfumoUrl"
          type="url"
          inputMode="url"
          defaultValue={perfume.parfumoUrl ?? ""}
          placeholder="https://www.parfumo.com/Perfumes/…"
          className="field"
        />
        <p className="mt-1.5 text-xs text-smoke-500">{t("linkHint")}</p>
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
