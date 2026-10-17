"use client";

import { useTranslations } from "next-intl";
import { useId } from "react";

/** Two inputs for the ratings people see on Fragrantica (0–5) and Parfumo (0–10). */
export function RatingFields({
  fragrantica = null,
  parfumo = null,
}: {
  fragrantica?: number | null;
  parfumo?: number | null;
}) {
  const t = useTranslations("AddPerfume");
  const id = useId();

  return (
    <div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor={`${id}-fragrantica`} className="field-label">
            {t("fragranticaRating")} <span className="font-normal text-smoke-500">({t("outOf5")})</span>
          </label>
          <input
            id={`${id}-fragrantica`}
            name="fragranticaRating"
            // Text, not number: some Bulgarian-locale browsers drop "4.25" from
            // number inputs. The server accepts both "4.25" and "4,25".
            type="text"
            inputMode="decimal"
            pattern="[0-9]+([.,][0-9]{1,2})?"
            autoComplete="off"
            defaultValue={fragrantica === null ? "" : String(fragrantica)}
            placeholder="4.25"
            className="field"
          />
        </div>
        <div>
          <label htmlFor={`${id}-parfumo`} className="field-label">
            {t("parfumoRating")} <span className="font-normal text-smoke-500">({t("outOf10")})</span>
          </label>
          <input
            id={`${id}-parfumo`}
            name="parfumoRating"
            // Text, not number: some Bulgarian-locale browsers drop "4.25" from
            // number inputs. The server accepts both "4.25" and "4,25".
            type="text"
            inputMode="decimal"
            pattern="[0-9]+([.,][0-9]{1,2})?"
            autoComplete="off"
            defaultValue={parfumo === null ? "" : String(parfumo)}
            placeholder="8.1"
            className="field"
          />
        </div>
      </div>
      <p className="mt-1.5 text-xs text-smoke-500">{t("ratingsHint")}</p>
    </div>
  );
}
