"use client";

import { useTranslations } from "next-intl";
import { useActionState, useId } from "react";
import { completeFeedback, type FeedbackDoneState } from "@/actions/admin";
import { FormMessage, SubmitButton } from "../auth/FormBits";
import { Modal } from "../Modal";
import { submitKeepingValues } from "../submit-keeping-values";

/** "Mark as done": asks what was done, which a signed-in author then gets as a notification. */
export function FeedbackDoneDialog({ id, excerpt, notifies }: { id: number; excerpt: string; notifies: boolean }) {
  const t = useTranslations("Admin");

  return (
    <Modal
      title={t("feedbackDoneTitle")}
      subtitle={excerpt}
      closeLabel={t("feedbackDoneCancel")}
      trigger={(open) => (
        <button type="button" onClick={open} className="btn btn-primary btn-sm">
          {t("markDone")}
        </button>
      )}
    >
      {(close) => <DoneForm id={id} notifies={notifies} onDone={close} />}
    </Modal>
  );
}

function DoneForm({ id, notifies, onDone }: { id: number; notifies: boolean; onDone: () => void }) {
  const t = useTranslations("Admin");
  const fieldId = useId();
  const [state, action, pending] = useActionState<FeedbackDoneState, FormData>(async (prev, formData) => {
    const result = await completeFeedback(prev, formData);
    if (result?.ok) onDone();
    return result;
  }, undefined);

  return (
    <form onSubmit={submitKeepingValues(action)} className="flex flex-col gap-4 px-6 py-5">
      <input type="hidden" name="id" value={id} />
      <div>
        <label htmlFor={fieldId} className="field-label">
          {t("feedbackDoneNote")}
        </label>
        <textarea
          id={fieldId}
          name="note"
          required
          maxLength={1000}
          rows={5}
          placeholder={t("feedbackDonePlaceholder")}
          className="field"
        />
        <p className="mt-2 text-sm text-smoke-500">
          {notifies ? t("feedbackDoneNotifies") : t("feedbackDoneGuest")}
        </p>
      </div>

      <FormMessage error={state && !state.ok ? state.error : undefined} />

      <div className="flex justify-end gap-2">
        <button type="button" onClick={onDone} className="btn btn-ghost">
          {t("feedbackDoneCancel")}
        </button>
        <SubmitButton pending={pending} className="btn btn-primary">
          {pending ? t("feedbackDoneSaving") : t("feedbackDoneSave")}
        </SubmitButton>
      </div>
    </form>
  );
}
