"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { THEME_COOKIE, type Theme } from "@/lib/theme";
import { MoonIcon, SunIcon } from "./icons";

/** Switches between the dark and light palette and remembers the choice for a year. */
export function ThemeToggle({ initial }: { initial: Theme }) {
  const t = useTranslations("Theme");
  const [theme, setTheme] = useState<Theme>(initial);
  const next: Theme = theme === "dark" ? "light" : "dark";
  const label = next === "light" ? t("toLight") : t("toDark");

  function toggle() {
    document.documentElement.dataset.theme = next;
    document.cookie = `${THEME_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    setTheme(next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className="btn btn-ghost btn-sm !px-2.5"
    >
      {theme === "dark" ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}
