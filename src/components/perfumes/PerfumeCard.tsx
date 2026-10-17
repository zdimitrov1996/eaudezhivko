"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { moveEntry, rateEntry, removeEntry } from "@/actions/perfumes";
import { hasNotes, NOTE_LAYERS, parfumoLink, pazaruvajSearchUrl, type ShelfEntry } from "@/lib/perfumes";
import { ArrowIcon, ExternalIcon, HeartIcon, StarIcon, TagIcon, TrashIcon } from "../icons";
import { EditPerfumeDialog } from "./EditPerfumeDialog";
import { ParfumoLinkDialog } from "./ParfumoLinkDialog";

export function PerfumeCard({
  entry,
  readOnly = false,
  canEdit = false,
}: {
  entry: ShelfEntry;
  readOnly?: boolean;
  /** The signed-in user added this perfume to the catalogue */
  canEdit?: boolean;
}) {
  const t = useTranslations("Perfume");
  const tc = useTranslations("Concentration");
  const [rating, setRating] = useState(entry.rating);
  const [imageError, setImageError] = useState(false);
  const [isPending, startTransition] = useTransition();

  const { perfume } = entry;
  const communityRating = perfume.parfumoRating;
  const link = parfumoLink(perfume);
  // Parfumo is read in the background until notes (or {}) and a date are stored
  const awaitingParfumo = Boolean(perfume.parfumoUrl) && (perfume.parfumoNotes === null || !perfume.ratingsUpdatedAt);
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
        {perfume.imageUrl && !imageError ? (
          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl border border-moss-800/80 bg-ink-900/60 p-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={perfume.imageUrl}
              alt={fullName}
              referrerPolicy="no-referrer"
              loading="lazy"
              onError={() => setImageError(true)}
              className="h-full w-full object-contain"
            />
          </div>
        ) : (
          <div
            aria-hidden="true"
            className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl border border-moss-800 bg-gradient-to-br from-moss-900 to-ink-850 font-serif text-2xl font-semibold text-moss-300"
          >
            {perfume.brand.charAt(0).toUpperCase()}
          </div>
        )}
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

      {hasNotes(perfume.parfumoNotes) && (
        <div className="mx-5 border-t border-ink-600/70 py-3.5">
          <p className="mb-2 text-sm text-smoke-300">{t("notes")}</p>
          <dl className="flex flex-col gap-2">
            {NOTE_LAYERS.map((layer) => {
              const notes = perfume.parfumoNotes?.[layer] ?? [];
              if (notes.length === 0) return null;
              return (
                <div key={layer} className="flex gap-3">
                  <dt className="w-14 shrink-0 pt-0.5 text-xs text-smoke-500">{t(`noteLayers.${layer}`)}</dt>
                  <dd className="flex min-w-0 flex-wrap gap-1">
                    {notes.map((note) => (
                      <span key={note} className="rounded-full bg-ink-700 px-2 py-0.5 text-xs text-smoke-300">
                        {note}
                      </span>
                    ))}
                  </dd>
                </div>
              );
            })}
          </dl>
        </div>
      )}

      {/* Pinned to the bottom so ratings line up across cards, whatever the notes */}
      <div className="mt-auto">
        <div className="mx-5 flex flex-wrap gap-2 pt-1 pb-4">
          <a
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            title={link.isSearch ? t("searchHint") : undefined}
            className="btn btn-secondary btn-sm"
          >
            Parfumo
            {communityRating !== null && (
              <span className="font-semibold text-smoke-100">
                {communityRating.toFixed(1)}
                <span className="font-normal text-smoke-500">{t("outOfTen")}</span>
              </span>
            )}
            <ExternalIcon className="text-smoke-400" />
          </a>
          <a
            href={pazaruvajSearchUrl(perfume)}
            target="_blank"
            rel="noopener noreferrer"
            title={t("pazaruvajHint")}
            className="btn btn-secondary btn-sm"
          >
            Pazaruvaj
            <ExternalIcon className="text-smoke-400" />
          </a>
        </div>

        {/* Community rating = the rating on the perfume's Parfumo page, read automatically.
            Example cards without a rating skip the row. */}
        {(communityRating !== null || !readOnly) && (
          <div className="mx-5 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-t border-ink-600/70 py-3.5">
            <span className="text-sm text-smoke-300">{t("community")}</span>
            {communityRating !== null ? (
              <span className="flex items-baseline gap-1.5 whitespace-nowrap">
                <StarIcon className="h-4 w-4 self-center fill-moss-400 text-moss-400" />
                <span className="text-xl font-semibold text-smoke-100">{communityRating.toFixed(1)}</span>
                <span className="text-sm text-smoke-400">{t("outOfTen")}</span>
              </span>
            ) : perfume.parfumoUrl ? (
              <span className="text-sm text-smoke-500">
                {awaitingParfumo ? t("readingParfumo") : t("notRatedOnParfumo")}
              </span>
            ) : (
              <ParfumoLinkDialog perfume={perfume} label={t("addParfumoLink")} />
            )}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink-600/70 bg-ink-900/40 px-5 py-3.5">
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
            <a
              href={pazaruvajSearchUrl(perfume)}
              target="_blank"
              rel="noopener noreferrer"
              title={t("pazaruvajHint")}
              className="inline-flex items-center gap-1 rounded-full bg-ink-700 px-2.5 py-0.5 text-xs text-smoke-300 transition-colors hover:bg-ink-600 hover:text-smoke-100"
            >
              <span>{t("checkOnPazaruvaj")}</span>
              <ExternalIcon className="h-3 w-3 text-smoke-400" />
            </a>
          </span>
        )}

        {!readOnly && (
          <div className="flex items-center gap-1" role="group" aria-label={t("actions", { name: fullName })}>
            {canEdit && <EditPerfumeDialog perfume={perfume} />}
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
