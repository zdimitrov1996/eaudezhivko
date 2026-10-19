"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { ShowcasePerfume } from "@/lib/showcase";
import { ChevronLeftIcon, ChevronRightIcon, ExternalIcon, PauseIcon, PlayIcon } from "../icons";

const INTERVAL_MS = 5000;
const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

function subscribeReducedMotion(onChange: () => void) {
  const query = window.matchMedia(REDUCED_MOTION);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

const overlayButton =
  "pointer-events-auto grid h-9 w-9 place-items-center rounded-full border border-ink-600 bg-ink-850/85 text-smoke-200 backdrop-blur transition-colors hover:text-smoke-100";

/** Landing page carousel of bottles the admins chose; swipe, arrows or thumbnails, and it plays on its own. */
export function PerfumeShowcase({ perfumes }: { perfumes: ShowcasePerfume[] }) {
  const t = useTranslations("Home.showcase");
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  // null until the visitor presses pause/play; then their choice wins over reduced motion
  const [userPlaying, setUserPlaying] = useState<boolean | null>(null);
  const [held, setHeld] = useState(false);
  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia(REDUCED_MOTION).matches,
    () => false,
  );
  const playing = userPlaying ?? !reducedMotion;
  const count = perfumes.length;

  const goTo = useCallback(
    (index: number) => {
      const track = trackRef.current;
      if (!track) return;
      const next = (index + count) % count;
      track.scrollTo({ left: next * track.clientWidth, behavior: reducedMotion ? "auto" : "smooth" });
    },
    [count, reducedMotion],
  );

  // Restarts after every slide change, so a manual step also resets the timer
  useEffect(() => {
    if (!playing || held || count < 2) return;
    const id = window.setTimeout(() => goTo(active + 1), INTERVAL_MS);
    return () => window.clearTimeout(id);
  }, [active, playing, held, count, goTo]);

  function onScroll() {
    const track = trackRef.current;
    if (!track || track.clientWidth === 0) return;
    setActive(Math.min(count - 1, Math.max(0, Math.round(track.scrollLeft / track.clientWidth))));
  }

  return (
    <section
      aria-roledescription="carousel"
      aria-label={t("label")}
      onMouseEnter={() => setHeld(true)}
      onMouseLeave={() => setHeld(false)}
      onFocus={() => setHeld(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setHeld(false);
      }}
    >
      <div className="card relative overflow-hidden">
        <div
          ref={trackRef}
          onScroll={onScroll}
          aria-live={playing ? "off" : "polite"}
          className="flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {perfumes.map((perfume, index) => (
            <Slide key={perfume.id} perfume={perfume} index={index} count={count} />
          ))}
        </div>

        {count > 1 && (
          <>
            {/* Same box as a slide's stage, so the buttons sit on the photo */}
            <div className="pointer-events-none absolute inset-x-0 top-0 aspect-[4/3]">
              <button
                type="button"
                onClick={() => setUserPlaying(!playing)}
                aria-label={playing ? t("pause") : t("play")}
                className={`${overlayButton} absolute top-3 right-3 h-8 w-8`}
              >
                {playing ? <PauseIcon width="14" height="14" /> : <PlayIcon width="14" height="14" />}
              </button>
              <button
                type="button"
                onClick={() => goTo(active - 1)}
                aria-label={t("previous")}
                className={`${overlayButton} absolute top-1/2 left-3 -translate-y-1/2`}
              >
                <ChevronLeftIcon />
              </button>
              <button
                type="button"
                onClick={() => goTo(active + 1)}
                aria-label={t("next")}
                className={`${overlayButton} absolute top-1/2 right-3 -translate-y-1/2`}
              >
                <ChevronRightIcon />
              </button>
            </div>

            {/* Up to eight thumbnails a row; more wrap onto a second row */}
            <div
              className="grid gap-1.5 border-t border-ink-600/70 px-5 py-4"
              style={{ gridTemplateColumns: `repeat(${Math.max(Math.min(count, 8), 6)}, minmax(0, 1fr))` }}
            >
              {perfumes.map((perfume, index) => (
                <button
                  key={perfume.id}
                  type="button"
                  onClick={() => goTo(index)}
                  aria-label={t("show", { name: `${perfume.brand} ${perfume.name}` })}
                  aria-current={index === active ? "true" : undefined}
                  className={`stage isolate aspect-square overflow-hidden rounded-lg border p-0.5 transition ${
                    index === active
                      ? "border-moss-400 ring-1 ring-moss-400"
                      : "border-ink-600 opacity-60 hover:opacity-100"
                  }`}
                >
                  <BottleImage perfume={perfume} />
                </button>
              ))}
            </div>
          </>
        )}
      </div>
      <p className="mt-3 text-xs text-smoke-500 sm:text-right">{t("credit")}</p>
    </section>
  );
}

function Slide({ perfume, index, count }: { perfume: ShowcasePerfume; index: number; count: number }) {
  const t = useTranslations("Home.showcase");
  const tc = useTranslations("Concentration");
  const tp = useTranslations("Perfume");
  const name = `${perfume.brand} ${perfume.name}`;

  return (
    <div
      role="group"
      aria-roledescription="slide"
      aria-label={t("slide", { index: index + 1, count })}
      className="w-full shrink-0 snap-start"
    >
      <a
        href={perfume.parfumoUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={t("open", { name })}
        className="group block"
      >
        <div className="stage isolate grid aspect-[4/3] place-items-center overflow-hidden px-14 py-8">
          <BottleImage
            perfume={perfume}
            eager={index === 0}
            className="transition-transform duration-500 group-hover:scale-[1.03]"
          />
        </div>
        <div className="flex items-end justify-between gap-4 px-5 pt-4 pb-3">
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold tracking-[0.14em] text-smoke-400 uppercase">
              {perfume.brand}
            </p>
            <p className="mt-0.5 truncate font-serif text-2xl leading-tight font-semibold text-smoke-100">
              {perfume.name}
            </p>
            {perfume.concentration && (
              <p className="mt-1 text-sm text-smoke-400">{tc(perfume.concentration)}</p>
            )}
          </div>
          <span className="flex shrink-0 items-center gap-1.5 pb-0.5 text-sm text-smoke-300 transition-colors group-hover:text-smoke-100">
            Parfumo
            {perfume.parfumoRating !== null && (
              <span className="font-semibold text-smoke-100">
                {perfume.parfumoRating.toFixed(1)}
                <span className="font-normal text-smoke-500">{tp("outOfTen")}</span>
              </span>
            )}
            <ExternalIcon className="text-smoke-400" />
          </span>
        </div>
      </a>
    </div>
  );
}

function BottleImage({
  perfume,
  eager = false,
  className = "",
}: {
  perfume: ShowcasePerfume;
  eager?: boolean;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <span aria-hidden="true" className="font-serif text-3xl font-semibold text-moss-600">
        {perfume.brand.charAt(0)}
      </span>
    );
  }
  return (
    // Parfumo's photos sit on white; multiply lets the stage colour show through instead
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={perfume.imageUrl}
      alt=""
      referrerPolicy="no-referrer"
      loading={eager ? "eager" : "lazy"}
      onError={() => setFailed(true)}
      className={`h-full w-full object-contain mix-blend-multiply ${className}`}
    />
  );
}
