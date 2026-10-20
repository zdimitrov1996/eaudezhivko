import { getTranslations } from "next-intl/server";
import { refreshParfumoData } from "@/actions/perfumes";
import { needsParfumoRefresh } from "@/lib/parfumo.server";
import type { Shelf, ShelfEntry } from "@/lib/perfumes";
import { DropIcon, HeartIcon, ShelfIcon } from "../icons";
import { AddPerfumeDialog } from "./AddPerfumeDialog";
import { PerfumeCard } from "./PerfumeCard";
import { RatingsRefresher } from "./RatingsRefresher";

export async function ShelfView({
  shelf,
  entries,
  demo = false,
  currentUserId = null,
}: {
  shelf: Shelf;
  entries: ShelfEntry[];
  demo?: boolean;
  /** Cards for perfumes this user added get an edit button */
  currentUserId?: string | null;
}) {
  const t = await getTranslations("Shelf");
  const EmptyIcon = { collection: ShelfIcon, wishlist: HeartIcon, finished: DropIcon }[shelf];

  return (
    <section className="mx-auto max-w-6xl px-4 pt-10 sm:px-6 sm:pt-14">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-4xl font-semibold sm:text-5xl">{t(`${shelf}Title`)}</h1>
          <p className="mt-2 text-smoke-400">{t(`${shelf}Subtitle`, { count: entries.length })}</p>
        </div>
        {/* Bottles get to "finished" from the collection, by marking them 0% */}
        {shelf !== "finished" && <AddPerfumeDialog shelf={shelf} />}
      </div>

      {!demo && (
        <RatingsRefresher
          ids={entries.filter((entry) => needsParfumoRefresh(entry.perfume)).map((entry) => entry.perfume.id)}
          refresh={refreshParfumoData}
        />
      )}

      {demo && (
        <p className="mt-6 rounded-2xl border border-moss-800 bg-moss-900/40 px-4 py-3 text-sm text-moss-200">
          {t("demoBanner")}
        </p>
      )}

      {entries.length > 0 ? (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {entries.map((entry) => (
            <PerfumeCard
              key={entry.id}
              entry={entry}
              readOnly={demo}
              canEdit={Boolean(currentUserId) && entry.perfume.createdBy === currentUserId}
            />
          ))}
        </div>
      ) : (
        <div className="card mt-8 flex flex-col items-center px-6 py-16 text-center">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-moss-900 text-moss-300">
            <EmptyIcon width="26" height="26" />
          </div>
          <h2 className="mt-5 font-serif text-3xl font-semibold">{t(`empty.${shelf}.title`)}</h2>
          <p className="mt-2 max-w-md text-smoke-400">{t(`empty.${shelf}.body`)}</p>
        </div>
      )}
    </section>
  );
}
