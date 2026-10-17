"use client";

import { useTranslations } from "next-intl";
import { useId } from "react";

/**
 * The Fragrantica rating (0–5), typed in by people because Fragrantica blocks
 * automated reading. The Parfumo rating is read from its link automatically.
 */
export function RatingFields({
  fragrantica = null,
  parfumo = null,
}: {
  fragrantica?: number | null;
  /** Shown read-only when already known */
  parfumo?: number | null;
}) {
  const t = useTranslations("AddPerfume");
  const id = useId();

  return (
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
        pattern="[0-5]([.,][0-9]{1,2})?"
        autoComplete="off"
        defaultValue={fragrantica === null ? "" : String(fragrantica)}
        placeholder="0–5"
        className="field sm:max-w-40"
      />
      <p className="mt-1.5 text-xs text-smoke-500">{t("fragranticaManualHint")}</p>
      <p className="mt-1 text-xs text-smoke-500">
        {parfumo === null ? t("parfumoAuto") : t("parfumoAutoKnown", { value: parfumo.toFixed(1) })}
      </p>
    </div>
  );
}
