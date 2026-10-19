"use client";

import { useTranslations } from "next-intl";
import { useActionState, useId } from "react";
import { addParfumoLink, type AddPerfumeState } from "@/actions/perfumes";
import type { Perfume } from "@/lib/perfumes";
import { FormMessage, SubmitButton } from "../auth/FormBits";
import { PlusIcon } from "../icons";
import { Modal } from "../Modal";
import { submitKeepingValues } from "../submit-keeping-values";

/** For a perfume without a Parfumo link: add one, and the rating and notes follow. */
export function ParfumoLinkDialog({ perfume, label }: { perfume: Perfume; label: string }) {
  const t = useTranslations("ParfumoLink");

  return (
    <Modal
      title={t("title")}
      subtitle={`${perfume.brand} ${perfume.name}`}
      closeLabel={t("close")}
      trigger={(open) => (
        <button type="button" onClick={open} className="btn btn-secondary btn-sm">
          <PlusIcon className="h-4 w-4" />
          {label}
        </button>
      )}
    >
      {(close) => <LinkForm perfume={perfume} onDone={close} />}
    </Modal>
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
