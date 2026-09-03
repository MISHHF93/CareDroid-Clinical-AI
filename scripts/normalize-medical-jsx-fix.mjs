/**
 * After literal-to-MEDICAL_THEME swaps, ensure JSX attributes use expression braces.
 */
const JSX_ATTR_PATTERN =
  /(\s)(placeholder|stroke|color|fill|background|borderColor|backgroundColor|border)=MEDICAL_THEME\.([a-zA-Z0-9_]+)/g;

/** Prevent `.app-shell-foo` from becoming `:is(.app-shell, .emergency-app-shell)-foo`. */
const BROKEN_IS_CLASS_PATTERN = /:is\(\.app-shell,\s*\.emergency-app-shell\)-([a-zA-Z][\w-]*)/g;

export function fixJsxMedicalThemeAttributes(source) {
  return source.replace(JSX_ATTR_PATTERN, '$1$2={MEDICAL_THEME.$3}');
}

export function fixBrokenAppShellIsSelectors(source) {
  return source.replace(BROKEN_IS_CLASS_PATTERN, '.app-shell-$1');
}
