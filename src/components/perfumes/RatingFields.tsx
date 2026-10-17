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
            type="number"
            inputMode="decimal"
            min={0}
            max={5}
            step={0.01}
            defaultValue={fragrantica ?? ""}
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
            type="number"
            inputMode="decimal"
            min={0}
            max={10}
            step={0.1}
            defaultValue={parfumo ?? ""}
            placeholder="8.1"
            className="field"
          />
        </div>
      </div>
      <p className="mt-1.5 text-xs text-smoke-500">{t("ratingsHint")}</p>
    </div>
  );
}
