import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import DesignSystemPlayground from './DesignSystemPlayground';

// This page is only ever mounted inside the app's own live BrowserRouter
// (see router.tsx's DEV-only /dev/design-system route) -- MemoryRouter here
// stands in for that ambient context, same as PatientCard.core.test.tsx.
// A live-browser check caught a real bug during item 41's build: this page
// used to wrap its PatientCard section in its own <MemoryRouter>, which
// crashes ("cannot render a <Router> inside another <Router>") once nested
// under the app's real router -- this smoke test guards against that class
// of regression.
describe('DesignSystemPlayground', () => {
  it('renders every catalog section without throwing', () => {
    render(
      <MemoryRouter>
        <DesignSystemPlayground />
      </MemoryRouter>,
    );

    expect(screen.getByText('CareDroid Design System Playground')).toBeInTheDocument();
    expect(screen.getByText('Page header')).toBeInTheDocument();
    expect(screen.getByText('Buttons')).toBeInTheDocument();
    expect(screen.getByText('Fields')).toBeInTheDocument();
    expect(screen.getByText('Cards')).toBeInTheDocument();
    expect(screen.getByText('Statuses')).toBeInTheDocument();
    expect(screen.getByText('Alerts')).toBeInTheDocument();
    expect(screen.getByText('Patient context')).toBeInTheDocument();
    expect(screen.getByText('Dialogs & drawers')).toBeInTheDocument();
    expect(screen.getByText('Empty, loading & error states')).toBeInTheDocument();
    expect(screen.getByText('Table')).toBeInTheDocument();
    expect(screen.getByText('Responsive compositions')).toBeInTheDocument();
  });

  it('opens and closes the real Drawer component', () => {
    render(
      <MemoryRouter>
        <DesignSystemPlayground />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Open drawer' }));
    expect(screen.getByText(/Drawer body content/)).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByText(/Drawer body content/)).not.toBeInTheDocument();
  });

  it('toggles the full-viewport LoadingScreen preview instead of rendering it permanently mounted', () => {
    render(
      <MemoryRouter>
        <DesignSystemPlayground />
      </MemoryRouter>,
    );

    expect(document.querySelector('.loading-screen')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Preview full-screen loading state' }));
    expect(document.querySelector('.loading-screen')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Close preview' }));
    expect(document.querySelector('.loading-screen')).not.toBeInTheDocument();
  });
});
