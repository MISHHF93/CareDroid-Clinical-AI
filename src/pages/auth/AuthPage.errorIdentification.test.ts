import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(__dirname, 'AuthPage.tsx'), 'utf8');

/**
 * WCAG 3.3.1 (Error Identification). The sign-in form announced failures
 * through a role="alert" container, but no input was ever marked invalid, so
 * a screen reader user who tabbed back into the form got no indication that
 * the fields were the thing in error -- and nothing tying the message to them.
 *
 * Source-level assertions rather than a render, matching authRouteFlow.test.ts.
 */
describe('AuthPage identifies which fields an auth error refers to', () => {
  it('gives the error container an id the inputs can point at', () => {
    expect(source).toContain('role="alert" id="auth-page-error"');
  });

  it('marks the credential fields invalid and describes them by the error', () => {
    // Verification code, email, password -- the three inputs an authentication
    // failure actually implicates.
    const marks = source.match(/\{\.\.\.ariaInvalid\(error\)\}/g) || [];
    expect(marks).toHaveLength(3);

    const described = source.match(/aria-describedby=\{error \? 'auth-page-error' : undefined\}/g) || [];
    expect(described).toHaveLength(3);
  });

  it('does not mark the signup name field invalid', () => {
    // "Invalid credentials" or "email already registered" says nothing about
    // the person's name. Marking every field in the form invalid on a
    // form-level error is the usual over-correction and makes aria-invalid
    // meaningless, so the full-name input is deliberately left alone.
    const fullNameBlock = source.slice(
      source.indexOf('<span>Full name</span>'),
      source.indexOf('<span>Email address</span>'),
    );
    expect(fullNameBlock).not.toContain('ariaInvalid');
    expect(fullNameBlock).not.toContain('auth-page-error');
  });
});
