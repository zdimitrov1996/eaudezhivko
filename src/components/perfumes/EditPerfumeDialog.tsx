"use client";

import { useFormatter, useTranslations } from "next-intl";
import { useActionState, useId, useRef, useState } from "react";
import { updatePerfumeDetails, type AddPerfumeState } from "@/actions/perfumes";
import type { Perfume } from "@/lib/perfumes";
import { FormMessage, SubmitButton } from "../auth/FormBits";
import { CloseIcon, PencilIcon, PlusIcon } from "../icons";
import { submitKeepingValues } from "../submit-keeping-values";
import { RatingFields } from "./RatingFields";

/** Small dialog on a perfume card for the site ratings and any missing links. */
export function EditPerfumeDialog({
  perfume,
  label,
  variant = "icon",
}: {
  perfume: Perfume;
  label: string;
  /** "icon": pencil button in the card footer; "button": labelled button in the rating row */
  variant?: "icon" | "button";
}) {
  const t = useTranslations("EditPerfume");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  // Remounting the form on close drops unsaved edits and old errors
  const [formKey, setFormKey] = useState(0);

  return (
    <>
      {variant === "icon" ? (
        <button
          type="button"
          onClick={() => dialogRef.current?.showModal()}
          className="btn btn-ghost btn-sm !px-2.5"
          aria-label={label}
          title={label}
        >
          <PencilIcon className="h-4 w-4" />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => dialogRef.current?.showModal()}
          className="btn btn-secondary btn-sm"
        >
          <PlusIcon className="h-4 w-4" />
          {label}
        </button>
      )}

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
        <EditForm key={formKey} perfume={perfume} onDone={() => dialogRef.current?.close()} />
      </dialog>
    </>
  );
}

function EditForm({ perfume, onDone }: { perfume: Perfume; onDone: () => void }) {
  const t = useTranslations("EditPerfume");
  const ta = useTranslations("AddPerfume");
  const format = useFormatter();
  const [state, action, pending] = useActionState<AddPerfumeState, FormData>(
    async (prev, formData) => {
      const result = await updatePerfumeDetails(prev, formData);
      if (result?.ok) onDone();
      return result;
    },
    undefined,
  );

  return (
    <form onSubmit={submitKeepingValues(action)} className="flex flex-col gap-5 px-6 py-5">
      <input type="hidden" name="perfumeId" value={perfume.id} />
      <p className="text-sm text-smoke-400">{t("intro")}</p>

      <RatingFields
        fragrantica={perfume.fragranticaRating}
        parfumo={perfume.parfumoRating}
      />
      {perfume.ratingsUpdatedAt && (
        <p className="-mt-3 text-xs text-smoke-500">
          {t("lastUpdated", {
            date: format.dateTime(new Date(perfume.ratingsUpdatedAt), { dateStyle: "medium" }),
          })}
        </p>
      )}

      {(["fragrantica", "parfumo"] as const).map((site) => {
        const saved = site === "fragrantica" ? perfume.fragranticaUrl : perfume.parfumoUrl;
        const id = `edit-${site}-url-${perfume.id}`;
        return (
          <div key={site}>
            <label htmlFor={id} className="field-label">
              {site === "fragrantica" ? ta("fragranticaUrl") : ta("parfumoUrl")}
            </label>
            {saved ? (
              <p className="truncate text-sm text-moss-300" title={saved}>
                ✓ {t("linkSaved")}
              </p>
            ) : (
              <input
                id={id}
                name={site === "fragrantica" ? "fragranticaUrl" : "parfumoUrl"}
                type="url"
                inputMode="url"
                placeholder={
                  site === "fragrantica"
                    ? "https://www.fragrantica.com/perfume/…"
                    : "https://www.parfumo.com/Perfumes/…"
                }
                className="field"
              />
            )}
          </div>
        );
      })}

      {state && !state.ok && <ErrorText error={state.error} site={state.site} />}

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

function ErrorText({ error, site }: { error: string; site?: string }) {
  const te = useTranslations("Errors");
  return error === "invalidRating" || error === "invalidUrl" ? (
    <p role="alert" className="rounded-xl border border-ember-400/30 bg-ember-900/60 px-4 py-3 text-sm text-ember-400">
      {te(error, { site: site ?? "" })}
    </p>
  ) : (
    <FormMessage error={error} />
  );
}
