"use client";

import { useTranslations } from "next-intl";
import { useActionState, useId } from "react";
import { saveShowcasePerfume, type ShowcaseFormState } from "@/actions/admin";
import { CONCENTRATIONS } from "@/lib/perfumes";
import type { ShowcasePerfume } from "@/lib/showcase";
import { FormMessage, SubmitButton } from "../auth/FormBits";
import { PencilIcon, PlusIcon } from "../icons";
import { Modal } from "../Modal";
import { submitKeepingValues } from "../submit-keeping-values";

/** "Add a perfume" button, or a pencil when given a perfume to edit; both open the same form. */
export function ShowcaseDialog({ perfume, disabled = false }: { perfume?: ShowcasePerfume; disabled?: boolean }) {
  const t = useTranslations("Admin");
  const tp = useTranslations("AddPerfume");

  return (
    <Modal
      wide
      title={perfume ? t("showcaseEditTitle") : t("showcaseAddTitle")}
      closeLabel={tp("close")}
      trigger={(open) =>
        perfume ? (
          <button
            type="button"
            onClick={open}
            aria-label={t("showcaseEdit", { name: `${perfume.brand} ${perfume.name}` })}
            title={t("showcaseEditTitle")}
            className="btn btn-ghost btn-sm !px-2"
          >
            <PencilIcon className="h-4 w-4" />
          </button>
        ) : (
          <button type="button" onClick={open} disabled={disabled} className="btn btn-primary btn-sm">
            <PlusIcon width="16" height="16" />
            {t("showcaseAddTitle")}
          </button>
        )
      }
    >
      {(close) => <ShowcaseForm perfume={perfume} onDone={close} />}
    </Modal>
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
