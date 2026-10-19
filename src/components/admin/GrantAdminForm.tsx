"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { grantAdmin, type GrantAdminState } from "@/actions/admin";
import { submitKeepingValues } from "../submit-keeping-values";

/** Owner only: makes a registered user an admin by their sign-in email. */
export function GrantAdminForm() {
  const t = useTranslations("Admin");
  const [state, action, pending] = useActionState<GrantAdminState, FormData>(grantAdmin, undefined);
  const submit = submitKeepingValues(action);

  return (
    <>
      <form
        onSubmit={(event) => {
          const email = String(new FormData(event.currentTarget).get("email") ?? "").trim();
          if (!window.confirm(t("confirmGrant", { email }))) {
            event.preventDefault();
            return;
          }
          submit(event);
        }}
        className="mt-4 flex max-w-xl flex-col gap-3 sm:flex-row sm:items-end"
      >
        <div className="flex-1">
          <label htmlFor="grant-email" className="field-label">
            {t("grantEmailLabel")}
          </label>
          {/* A new key after success empties the field */}
          <input
            key={state?.ok ? state.at : "email"}
            id="grant-email"
            name="email"
            type="email"
            required
            autoComplete="off"
            placeholder="ime@example.com"
            className="field"
          />
        </div>
        <button type="submit" disabled={pending} className="btn btn-primary">
          {t("grantSubmit")}
        </button>
      </form>
      {state?.ok && (
        <p role="status" className="mt-3 text-sm text-moss-200">
          {t("granted", { email: state.email })}
        </p>
      )}
      {state && !state.ok && (
        <p role="alert" className="mt-3 text-sm text-ember-400">
          {t(`grantErrors.${state.error}`)}
        </p>
      )}
    </>
  );
}
