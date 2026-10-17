export type Theme = "dark" | "light";

/** Cookie holding the visitor's theme choice; dark when unset. */
export const THEME_COOKIE = "edf_theme";

export function parseTheme(value: string | undefined): Theme {
  return value === "light" ? "light" : "dark";
}
