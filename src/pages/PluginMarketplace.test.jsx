import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import PluginMarketplace from './PluginMarketplace';
import { PLUGIN_MARKETPLACE_STORAGE_KEY } from '../data/pluginMarketplace';

describe('PluginMarketplace', () => {
  beforeEach(() => {
    localStorage.removeItem(PLUGIN_MARKETPLACE_STORAGE_KEY);
  });

  it('renders plugin types, validation status, and unified inventory links', () => {
    render(<PluginMarketplace />);

    expect(screen.getByRole('heading', { name: /plugin marketplace/i })).toBeInTheDocument();
    expect(screen.getByText(/all plugin registrations are valid/i)).toBeInTheDocument();

    for (const label of [
      /calculator/i,
      /protocol/i,
      /simulation/i,
      /workflow/i,
      /dashboard/i,
      /ai extension/i,
    ]) {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    }

    expect(screen.getAllByText(/linked/i).length).toBeGreaterThan(0);
  });

  it('installs, disables, enables, and uninstalls a plugin', async () => {
    const user = userEvent.setup();
    render(<PluginMarketplace />);

    const card = screen
      .getByRole('heading', { name: /fluid resuscitation calculator plugin/i })
      .closest('article');

    await user.click(within(card).getByRole('button', { name: /^install$/i }));
    expect(within(card).getByText(/^enabled$/i)).toBeInTheDocument();

    await user.click(within(card).getByRole('button', { name: /^disable$/i }));
    expect(within(card).getByText(/^disabled$/i)).toBeInTheDocument();

    await user.click(within(card).getByRole('button', { name: /^enable$/i }));
    expect(within(card).getByText(/^enabled$/i)).toBeInTheDocument();

    await user.click(within(card).getByRole('button', { name: /^uninstall$/i }));
    expect(within(card).getByText(/^available$/i)).toBeInTheDocument();
  });

  it('filters plugin catalog by type', async () => {
    const user = userEvent.setup();
    render(<PluginMarketplace />);

    await user.click(screen.getByRole('button', { name: /^workflow$/i }));

    expect(screen.getByRole('heading', { name: /discharge workflow plugin/i })).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: /capacity command dashboard plugin/i })
    ).not.toBeInTheDocument();
  });
});
