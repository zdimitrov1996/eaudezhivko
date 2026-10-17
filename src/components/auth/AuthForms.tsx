"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import {
  requestPasswordReset,
  signIn,
  signUp,
  updatePassword,
  type AuthState,
} from "@/actions/auth";
import { Link } from "@/i18n/navigation";
import { submitKeepingValues } from "../submit-keeping-values";
import { FormMessage, SubmitButton } from "./FormBits";

function EmailField() {
  const t = useTranslations("Auth");
  return (
    <div>
      <label htmlFor="email" className="field-label">
        {t("email")}
      </label>
      <input
        id="email"
        name="email"
        type="email"
        autoComplete="email"
        required
        className="field"
      />
    </div>
  );
}

function PasswordField({
  label,
  autoComplete,
}: {
  label: string;
  autoComplete: "current-password" | "new-password";
}) {
  return (
    <div>
      <label htmlFor="password" className="field-label">
        {label}
      </label>
      <input
        id="password"
        name="password"
        type="password"
        autoComplete={autoComplete}
        minLength={autoComplete === "new-password" ? 8 : undefined}
        required
        className="field"
      />
    </div>
  );
}

export function SignInForm({ next, initialError }: { next?: string; initialError?: string }) {
  const t = useTranslations("Auth");
  const [state, action, pending] = useActionState<AuthState, FormData>(signIn, undefined);
  const error = state?.error ?? (state ? undefined : initialError);

  return (
    <form onSubmit={submitKeepingValues(action)} className="flex flex-col gap-4">
      {next && <input type="hidden" name="next" value={next} />}
      <EmailField />
      <PasswordField label={t("password")} autoComplete="current-password" />
      <div className="-mt-1 text-right text-sm">
        <Link href="/forgot-password" className="text-smoke-400 underline-offset-4 hover:text-moss-300 hover:underline">
          {t("forgotLink")}
        </Link>
      </div>
      <FormMessage error={error} />
      <SubmitButton pending={pending}>{t("submitSignIn")}</SubmitButton>
    </form>
  );
}

export function SignUpForm() {
  const t = useTranslations("Auth");
  const [state, action, pending] = useActionState<AuthState, FormData>(signUp, undefined);

  if (state?.message) return <FormMessage message={state.message} />;

  return (
    <form onSubmit={submitKeepingValues(action)} className="flex flex-col gap-4">
      <EmailField />
      <PasswordField label={t("password")} autoComplete="new-password" />
      <FormMessage error={state?.error} />
      <SubmitButton pending={pending}>{t("submitSignUp")}</SubmitButton>
      <p className="text-xs leading-relaxed text-smoke-500">
        {t.rich("terms", {
          terms: (chunks) => (
            <Link href="/terms" target="_blank" className="underline underline-offset-2 hover:text-moss-300">
              {chunks}
            </Link>
          ),
          privacy: (chunks) => (
            <Link href="/privacy" target="_blank" className="underline underline-offset-2 hover:text-moss-300">
              {chunks}
            </Link>
          ),
        })}
      </p>
    </form>
  );
}

export function ForgotPasswordForm() {
  const t = useTranslations("Auth");
  const [state, action, pending] = useActionState<AuthState, FormData>(requestPasswordReset, undefined);

  if (state?.message) return <FormMessage message={state.message} />;

  return (
    <form onSubmit={submitKeepingValues(action)} className="flex flex-col gap-4">
      <EmailField />
      <FormMessage error={state?.error} />
      <SubmitButton pending={pending}>{t("submitForgot")}</SubmitButton>
    </form>
  );
}

export function ResetPasswordForm() {
  const t = useTranslations("Auth");
  const tNav = useTranslations("Nav");
  const [state, action, pending] = useActionState<AuthState, FormData>(updatePassword, undefined);

  if (state?.message) {
    return (
      <div className="flex flex-col gap-4">
        <FormMessage message={state.message} />
        <Link href="/collection" className="btn btn-primary w-full">
          {tNav("collection")}
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submitKeepingValues(action)} className="flex flex-col gap-4">
      <PasswordField label={t("newPassword")} autoComplete="new-password" />
      <FormMessage error={state?.error} />
      <SubmitButton pending={pending}>{t("submitReset")}</SubmitButton>
    </form>
  );
}
