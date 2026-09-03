import { describe, expect, it } from 'vitest';
import { validateLazyModule } from './lazyWithRetry';

describe('validateLazyModule', () => {
  it('accepts modules with a valid default component export', () => {
    function RouteComponent() {
      return null;
    }

    expect(validateLazyModule({ default: RouteComponent })).toEqual({
      default: RouteComponent,
    });
  });

  it('throws a safe diagnostic instead of letting React stringify module namespaces', () => {
    expect(() => validateLazyModule({ NamedOnly: () => null })).toThrow(
      /missing a valid default export.*NamedOnly/i,
    );
  });

  it('handles empty or non-object module values without primitive conversion errors', () => {
    expect(() => validateLazyModule({})).toThrow(/Exports: none/i);
    expect(() => validateLazyModule(null)).toThrow(/Exports: none/i);
  });
});
