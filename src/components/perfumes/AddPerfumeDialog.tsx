"use client";

import { useTranslations } from "next-intl";
import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { addPerfume, searchPerfumes, type AddPerfumeState } from "@/actions/perfumes";
import { CONCENTRATIONS, parfumoLink, type Perfume, type Shelf } from "@/lib/perfumes";
import { FormMessage } from "../auth/FormBits";
import { ExternalIcon, PlusIcon, SearchIcon } from "../icons";
import { Modal } from "../Modal";
import { submitKeepingValues } from "../submit-keeping-values";

export function AddPerfumeDialog({ shelf }: { shelf: Shelf }) {
  const t = useTranslations("AddPerfume");
  const tShelf = useTranslations("Shelf");

  return (
    <Modal
      wide
      title={t("title")}
      closeLabel={t("close")}
      trigger={(open) => (
        <button type="button" className="btn btn-primary" onClick={open}>
          <PlusIcon />
          {tShelf("add")}
        </button>
      )}
    >
      {(close) => <AddPerfumeForm shelf={shelf} onDone={close} />}
    </Modal>
  );
}

/** Pick a catalogue perfume or describe a new one; the Modal remounts it on close, which clears it. */
function AddPerfumeForm({ shelf, onDone }: { shelf: Shelf; onDone: () => void }) {
  const t = useTranslations("AddPerfume");
  const tc = useTranslations("Concentration");

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Perfume[]>([]);
  const [searched, setSearched] = useState(false);
  const [selected, setSelected] = useState<Perfume | null>(null);
  // Brand + name as typed, for the "search Parfumo" link
  const [draft, setDraft] = useState({ brand: "", name: "" });
  const [isSearching, startSearch] = useTransition();
  const searchTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const [state, formAction, isSaving] = useActionState<AddPerfumeState, FormData>(
    async (prev, formData) => {
      const result = await addPerfume(prev, formData);
      if (result?.ok) onDone();
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

  const searchFor = selected ?? draft;
  const searchQuery = `${searchFor.brand} ${searchFor.name}`.trim();

  return (
    <form onSubmit={submitKeepingValues(formAction)} className="flex max-h-[calc(85dvh-4.5rem)] flex-col">
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
                <input
                  id="brand"
                  name="brand"
                  required
                  maxLength={100}
                  onChange={(event) => setDraft((d) => ({ ...d, brand: event.target.value }))}
                  className="field"
                />
              </div>
              <div>
                <label htmlFor="name" className="field-label">
                  {t("name")}
                </label>
                <input
                  id="name"
                  name="name"
                  required
                  maxLength={150}
                  onChange={(event) => setDraft((d) => ({ ...d, name: event.target.value }))}
                  className="field"
                />
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
          <a
            href={
              searchQuery
                ? parfumoLink({ brand: searchFor.brand, name: searchFor.name, parfumoUrl: null }).href
                : "https://www.parfumo.com/"
            }
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-moss-300 underline-offset-4 hover:underline"
          >
            {searchQuery ? t("findThisOnParfumo", { query: searchQuery }) : t("findOnParfumo")}
            <ExternalIcon />
          </a>
        </div>
      </div>

      {state && !state.ok && (
        <div className="mx-6 mb-1">
          <FormMessage error={state.error} />
        </div>
      )}

      <div className="flex justify-end gap-2 border-t border-ink-700 px-6 py-4">
        <button type="button" onClick={onDone} className="btn btn-ghost">
          {t("cancel")}
        </button>
        <button type="submit" disabled={isSaving} className="btn btn-primary">
          {isSaving ? t("saving") : shelf === "collection" ? t("toCollection") : t("toWishlist")}
        </button>
      </div>
    </form>
  );
}
