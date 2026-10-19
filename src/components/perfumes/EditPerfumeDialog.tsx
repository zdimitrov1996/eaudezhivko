"use client";

import { useTranslations } from "next-intl";
import { useActionState, useId } from "react";
import { updatePerfume, type AddPerfumeState } from "@/actions/perfumes";
import { CONCENTRATIONS, type Perfume } from "@/lib/perfumes";
import { FormMessage, SubmitButton } from "../auth/FormBits";
import { PencilIcon } from "../icons";
import { Modal } from "../Modal";
import { submitKeepingValues } from "../submit-keeping-values";

/** Pencil button on a card: fix the brand, name, concentration, year or Parfumo link. */
export function EditPerfumeDialog({ perfume }: { perfume: Perfume }) {
  const t = useTranslations("EditPerfume");

  return (
    <Modal
      wide
      title={t("title")}
      closeLabel={t("close")}
      trigger={(open) => (
        <button type="button" onClick={open} aria-label={t("open")} title={t("open")} className="btn btn-ghost btn-sm !px-2.5">
          <PencilIcon className="h-4 w-4" />
        </button>
      )}
    >
      {(close) => <EditForm perfume={perfume} onDone={close} />}
    </Modal>
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
