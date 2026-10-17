"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { moveEntry, rateEntry, removeEntry } from "@/actions/perfumes";
import { externalAverage, perfumeLink, type LinkSite, type ShelfEntry } from "@/lib/perfumes";
import { ArrowIcon, ExternalIcon, HeartIcon, StarIcon, TagIcon, TrashIcon } from "../icons";
import { EditPerfumeDialog } from "./EditPerfumeDialog";

const SITES: { site: LinkSite; label: string; scale: string }[] = [
  { site: "fragrantica", label: "Fragrantica", scale: "/5" },
  { site: "parfumo", label: "Parfumo", scale: "/10" },
];

export function PerfumeCard({ entry, readOnly = false }: { entry: ShelfEntry; readOnly?: boolean }) {
  const t = useTranslations("Perfume");
  const tc = useTranslations("Concentration");
  const [rating, setRating] = useState(entry.rating);
  const [isPending, startTransition] = useTransition();

  const { perfume } = entry;
  const sitesAverage = externalAverage(perfume);
  const fullName = `${perfume.brand} ${perfume.name}`;
  const details = [
    perfume.concentration ? tc(perfume.concentration) : null,
    perfume.releaseYear,
  ].filter(Boolean);

  function onRate(value: string) {
    const next = value ? Number(value) : null;
    setRating(next);
    startTransition(() => rateEntry(entry.id, next));
  }

  function onMove() {
    const target = entry.shelf === "collection" ? "wishlist" : "collection";
    startTransition(() => moveEntry(entry.id, target));
  }

  function onRemove() {
    if (!window.confirm(t("confirmRemove", { name: fullName }))) return;
    startTransition(() => removeEntry(entry.id));
  }

  return (
    <article
      className={`card flex flex-col overflow-hidden transition-opacity ${isPending ? "opacity-60" : ""}`}
      aria-busy={isPending}
    >
      <div className="flex items-start gap-4 p-5 pb-4">
        <div
          aria-hidden="true"
          className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl border border-moss-800 bg-gradient-to-br from-moss-900 to-ink-850 font-serif text-2xl font-semibold text-moss-300"
        >
          {perfume.brand.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold tracking-[0.14em] text-smoke-400 uppercase">
            {perfume.brand}
          </p>
          <h3 className="mt-0.5 font-serif text-2xl leading-tight font-semibold text-smoke-100">
            {perfume.name}
          </h3>
          {details.length > 0 && (
            <p className="mt-1 text-sm text-smoke-400">{details.join(" · ")}</p>
          )}
        </div>
      </div>

      {/* Community rating = average of the Fragrantica and Parfumo ratings people typed in.
          Example cards without ratings skip the row. */}
      {(sitesAverage !== null || !readOnly) && (
        <div className="mx-5 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-t border-ink-600/70 py-3.5">
          <span className="min-w-0">
            <span className="block text-sm text-smoke-300">{t("community")}</span>
            <span className="block text-xs text-smoke-500">{t("communityHint")}</span>
          </span>
          {sitesAverage !== null ? (
            <span className="flex items-baseline gap-1.5 whitespace-nowrap">
              <StarIcon className="h-4 w-4 self-center fill-moss-400 text-moss-400" />
              <span className="text-xl font-semibold text-smoke-100">{sitesAverage.toFixed(1)}</span>
              <span className="text-sm text-smoke-400">{t("outOfTen")}</span>
            </span>
          ) : (
            <EditPerfumeDialog perfume={perfume} label={t("addRatings")} variant="button" />
          )}
        </div>
      )}

      <div className="mx-5 flex flex-wrap gap-2 pb-4">
        {SITES.map(({ site, label, scale }) => {
          const link = perfumeLink(perfume, site);
          const rating = site === "fragrantica" ? perfume.fragranticaRating : perfume.parfumoRating;
          const shown = rating === null ? null : rating.toFixed(site === "fragrantica" ? 2 : 1);
          return (
            <a
              key={site}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              title={link.isSearch ? t("searchHint", { site: label }) : undefined}
              aria-label={shown ? `${label}, ${t("siteRating", { site: label, value: `${shown}${scale}` })}` : undefined}
              className="btn btn-secondary btn-sm"
            >
              {label}
              {shown && (
                <span className="font-semibold text-smoke-100">
                  {shown}
                  <span className="font-normal text-smoke-500">{scale}</span>
                </span>
              )}
              <ExternalIcon className="text-smoke-400" />
            </a>
          );
        })}
      </div>

      <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-ink-600/70 bg-ink-900/40 px-5 py-3.5">
        {entry.shelf === "collection" ? (
          <label className="flex items-center gap-2 text-sm text-smoke-300">
            {t("yourRating")}
            <select
              value={rating ?? ""}
              onChange={(event) => onRate(event.target.value)}
              disabled={readOnly}
              className="field !min-h-9 !w-auto !py-1.5 !pl-3 text-sm"
            >
              <option value="">{t("notRated")}</option>
              {Array.from({ length: 10 }, (_, i) => 10 - i).map((value) => (
                <option key={value} value={value}>
                  {value}/10
                </option>
              ))}
            </select>
          </label>
        ) : (
          <span className="flex items-center gap-2 text-sm text-smoke-400">
            <TagIcon className="h-4 w-4 text-moss-400" />
            {t("bestPrice")}:
            <span className="rounded-full bg-ink-700 px-2 py-0.5 text-xs whitespace-nowrap text-smoke-300">
              {t("comingSoon")}
            </span>
          </span>
        )}

        {!readOnly && (
          <div className="flex items-center gap-1" role="group" aria-label={t("actions", { name: fullName })}>
            {sitesAverage !== null && <EditPerfumeDialog perfume={perfume} label={t("updateRatings")} />}
            <button type="button" onClick={onMove} disabled={isPending} className="btn btn-ghost btn-sm">
              {entry.shelf === "collection" ? (
                <>
                  <HeartIcon className="h-4 w-4" />
                  {t("moveToWishlist")}
                </>
              ) : (
                <>
                  {t("moveToCollection")}
                  <ArrowIcon className="h-4 w-4" />
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onRemove}
              disabled={isPending}
              aria-label={t("remove")}
              title={t("remove")}
              className="btn btn-ghost btn-sm !px-2.5 hover:!text-ember-400"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </article>
  );
}
