"use client";

import { useTranslations } from "next-intl";
import { useActionState, useEffect, useId, useRef, useState, useTransition } from "react";
import { addPerfume, searchPerfumes, type AddPerfumeState } from "@/actions/perfumes";
import { CONCENTRATIONS, type Perfume, type Shelf } from "@/lib/perfumes";
import { CloseIcon, PlusIcon, SearchIcon } from "../icons";
import { submitKeepingValues } from "../submit-keeping-values";
import { RatingFields } from "./RatingFields";

export function AddPerfumeDialog({ shelf }: { shelf: Shelf }) {
  const t = useTranslations("AddPerfume");
  const tShelf = useTranslations("Shelf");
  const tc = useTranslations("Concentration");
  const te = useTranslations("Errors");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const titleId = useId();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Perfume[]>([]);
  const [searched, setSearched] = useState(false);
  const [selected, setSelected] = useState<Perfume | null>(null);
  const [isSearching, startSearch] = useTransition();
  const searchTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const [state, formAction, isSaving] = useActionState<AddPerfumeState, FormData>(
    async (prev, formData) => {
      const result = await addPerfume(prev, formData);
      // Closing fires onClose, which clears the form
      if (result?.ok) dialogRef.current?.close();
      return result;
    },
    undefined,
  );

  useEffect(() => () => clearTimeout(searchTimer.current), []);

  // Debounced catalogue search
  function onQueryChange(value: string) {
    setQuery(value);
    clearTimeout(searchTimer.current);

    const q = value.trim();
    if (q.length < 2) {
      setResults([]);
      setSearched(false);
      return;
    }
    searchTimer.current = setTimeout(() => {
      startSearch(async () => {
        setResults(await searchPerfumes(q));
        setSearched(true);
      });
    }, 250);
  }

  function select(perfume: Perfume | null) {
    clearTimeout(searchTimer.current);
    setSelected(perfume);
    setQuery("");
    setResults([]);
    setSearched(false);
  }

  function reset() {
    formRef.current?.reset();
    select(null);
  }

  const submitLabel = shelf === "collection" ? t("toCollection") : t("toWishlist");

  return (
    <>
      <button type="button" className="btn btn-primary" onClick={() => dialogRef.current?.showModal()}>
        <PlusIcon />
        {tShelf("add")}
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        onClose={reset}
        className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-3xl border border-ink-600 bg-ink-850 p-0 text-smoke-100 shadow-2xl shadow-black/60"
      >
        <form ref={formRef} onSubmit={submitKeepingValues(formAction)} className="flex max-h-[85dvh] flex-col">
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

          <div className="flex flex-col gap-5 overflow-y-auto px-6 py-5">
            <input type="hidden" name="shelf" value={shelf} />
            <input type="hidden" name="perfumeId" value={selected?.id ?? ""} />

            {selected ? (
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-moss-800 bg-moss-900/40 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold tracking-[0.14em] text-moss-300 uppercase">
                    {t("selected")}
                  </p>
                  <p className="truncate font-medium">
                    {selected.brand} {selected.name}
                    {selected.concentration && (
                      <span className="text-smoke-400"> · {tc(selected.concentration)}</span>
                    )}
                  </p>
                </div>
                <button type="button" onClick={() => select(null)} className="btn btn-ghost btn-sm">
                  {t("change")}
                </button>
              </div>
            ) : (
              <div>
                <label htmlFor="perfume-search" className="field-label">
                  {t("searchLabel")}
                </label>
                <div className="relative">
                  <SearchIcon className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-smoke-500" />
                  <input
                    id="perfume-search"
                    type="search"
                    value={query}
                    onChange={(event) => onQueryChange(event.target.value)}
                    placeholder={t("searchPlaceholder")}
                    autoComplete="off"
                    className="field !pl-10"
                  />
                </div>
                <div aria-live="polite" className="mt-2 text-sm">
                  {isSearching && <p className="text-smoke-400">{t("searching")}</p>}
                  {!isSearching && searched && results.length === 0 && (
                    <p className="text-smoke-400">{t("noMatches")}</p>
                  )}
                </div>
                {results.length > 0 && (
                  <ul className="mt-1 divide-y divide-ink-700 overflow-hidden rounded-2xl border border-ink-600">
                    {results.map((perfume) => (
                      <li key={perfume.id}>
                        <button
                          type="button"
                          onClick={() => select(perfume)}
                          className="flex w-full items-baseline justify-between gap-3 px-4 py-3 text-left hover:bg-veil"
                        >
                          <span>
                            <span className="text-smoke-400">{perfume.brand}</span>{" "}
                            <span className="font-medium">{perfume.name}</span>
                          </span>
                          <span className="shrink-0 text-xs text-smoke-500">
                            {[perfume.concentration && tc(perfume.concentration), perfume.releaseYear]
                              .filter(Boolean)
                              .join(" · ")}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {!selected && (
              <fieldset className="flex flex-col gap-4">
                <legend className="mb-3 flex w-full items-center gap-3 text-xs font-semibold tracking-[0.14em] text-smoke-500 uppercase">
                  <span className="h-px flex-1 bg-ink-600" />
                  {t("orNew")}
                  <span className="h-px flex-1 bg-ink-600" />
                </legend>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="brand" className="field-label">
                      {t("brand")}
                    </label>
                    <input id="brand" name="brand" required maxLength={100} className="field" />
                  </div>
                  <div>
                    <label htmlFor="name" className="field-label">
                      {t("name")}
                    </label>
                    <input id="name" name="name" required maxLength={150} className="field" />
                  </div>
                  <div>
                    <label htmlFor="concentration" className="field-label">
                      {t("concentration")}
                    </label>
                    <select id="concentration" name="concentration" defaultValue="" className="field">
                      <option value="">{t("concentrationAny")}</option>
                      {CONCENTRATIONS.map((code) => (
                        <option key={code} value={code}>
                          {tc(code)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="releaseYear" className="field-label">
                      {t("year")} <span className="font-normal text-smoke-500">({t("optional")})</span>
                    </label>
                    <input
                      id="releaseYear"
                      name="releaseYear"
                      type="number"
                      inputMode="numeric"
                      min={1700}
                      max={2100}
                      className="field"
                    />
                  </div>
                </div>
              </fieldset>
            )}

            <div className="flex flex-col gap-4">
              <div>
                <label htmlFor="fragranticaUrl" className="field-label">
                  {t("fragranticaUrl")} <span className="font-normal text-smoke-500">({t("optional")})</span>
                </label>
                <input
                  id="fragranticaUrl"
                  name="fragranticaUrl"
                  type="url"
                  inputMode="url"
                  placeholder="https://www.fragrantica.com/perfume/…"
                  className="field"
                />
              </div>
              <div>
                <label htmlFor="parfumoUrl" className="field-label">
                  {t("parfumoUrl")} <span className="font-normal text-smoke-500">({t("optional")})</span>
                </label>
                <input
                  id="parfumoUrl"
                  name="parfumoUrl"
                  type="url"
                  inputMode="url"
                  placeholder="https://www.parfumo.com/Perfumes/…"
                  className="field"
                />
              </div>
              <p className="text-sm text-smoke-500">{t("linkHint")}</p>
              <RatingFields
                key={selected?.id ?? "new"}
                fragrantica={selected?.fragranticaRating}
                parfumo={selected?.parfumoRating}
              />
            </div>

          </div>

          {state && !state.ok && (
            <p role="alert" className="mx-6 mb-1 rounded-xl border border-ember-400/30 bg-ember-900/60 px-4 py-3 text-sm text-ember-400">
              {te(state.error, { site: state.site ?? "" })}
            </p>
          )}

          <div className="flex justify-end gap-2 border-t border-ink-700 px-6 py-4">
            <button type="button" onClick={() => dialogRef.current?.close()} className="btn btn-ghost">
              {t("cancel")}
            </button>
            <button type="submit" disabled={isSaving} className="btn btn-primary">
              {isSaving ? t("saving") : submitLabel}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
