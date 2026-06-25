/**
 * After literal-to-MEDICAL_THEME swaps, ensure JSX attributes use expression braces.
 */
const JSX_ATTR_PATTERN =
  /(\s)(placeholder|stroke|color|fill|background|borderColor|backgroundColor|border)=MEDICAL_THEME\.([a-zA-Z0-9_]+)/g;

export function fixJsxMedicalThemeAttributes(source) {
  return source.replace(JSX_ATTR_PATTERN, '$1$2={MEDICAL_THEME.$3}');
}