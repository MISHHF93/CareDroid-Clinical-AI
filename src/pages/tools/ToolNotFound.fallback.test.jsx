import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ToolNotFound from './ToolNotFound';
import { mockConversationValue, mockToolPreferencesValue } from '../../test/testRenderUtils';

vi.mock('./ToolNotFound.css', () => ({}));

vi.mock('../../contexts/ConversationContext', () => ({
  useConversation: () => mockConversationValue,
}));

vi.mock('../../contexts/ToolPreferencesContext', () => ({
  useToolPreferences: () => mockToolPreferencesValue,
}));

describe('ToolNotFound fallback', () => {
  it('renders non-empty recovery UI for unknown tool routes', () => {
    render(
      <MemoryRouter initialEntries={['/tools/calculators/not-a-real-calc']}>
        <ToolNotFound toolId="not-a-real-calc" title="Calculator not found" />
      </MemoryRouter>
    );

    expect(screen.getByRole('alert')).toHaveTextContent(/not-a-real-calc/i);
    expect(screen.getByRole('link', { name: /all tools/i })).toHaveAttribute('href', '/tools');
    expect(screen.getByRole('link', { name: /developer catalog \/ source audit/i })).toHaveAttribute(
      'href',
      '/tools/catalog'
    );
  });
});
