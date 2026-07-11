/**
 * Build aria-invalid props using only static string literals.
 * Call sites should spread: `{...ariaInvalid(flag)}`.
 */
export type AriaInvalidProps = { readonly 'aria-invalid': 'true' | 'false' };

const ARIA_INVALID_TRUE = { 'aria-invalid': 'true' } as const satisfies AriaInvalidProps;
const ARIA_INVALID_FALSE = { 'aria-invalid': 'false' } as const satisfies AriaInvalidProps;

export function ariaInvalid(invalid: unknown): AriaInvalidProps {
  if (invalid) {
    return ARIA_INVALID_TRUE;
  }
  return ARIA_INVALID_FALSE;
}

export default ariaInvalid;
