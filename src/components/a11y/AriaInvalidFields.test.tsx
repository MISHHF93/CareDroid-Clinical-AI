import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AriaInvalidInput, AriaInvalidSelect } from './AriaInvalidFields';

describe('AriaInvalidFields', () => {
  it('renders static aria-invalid true/false on inputs', () => {
    const { rerender } = render(<AriaInvalidInput aria-label="age" invalid={false} />);
    expect(screen.getByLabelText('age').getAttribute('aria-invalid')).toBe('false');
    rerender(<AriaInvalidInput aria-label="age" invalid />);
    expect(screen.getByLabelText('age').getAttribute('aria-invalid')).toBe('true');
  });

  it('renders static aria-invalid true/false on selects', () => {
    const { rerender } = render(
      <AriaInvalidSelect aria-label="sex" invalid={false}>
        <option value="">Select</option>
      </AriaInvalidSelect>,
    );
    expect(screen.getByLabelText('sex').getAttribute('aria-invalid')).toBe('false');
    rerender(
      <AriaInvalidSelect aria-label="sex" invalid>
        <option value="">Select</option>
      </AriaInvalidSelect>,
    );
    expect(screen.getByLabelText('sex').getAttribute('aria-invalid')).toBe('true');
  });
});
