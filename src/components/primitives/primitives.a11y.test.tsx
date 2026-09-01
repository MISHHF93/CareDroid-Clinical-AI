/**
 * Component-level accessibility contract for the shared primitives.
 *
 * The suite already had ~97 axe assertions, but every one of them scanned a whole
 * rendered page. That catches a broken page; it does not catch a broken Button,
 * because a primitive only gets incidental coverage if it happens to appear on a
 * scanned route in the one state the route renders it in.
 *
 * These scans are deliberately STRICTER than the page-level ones: page scans
 * assert only serious/critical violations, because a page composes work from many
 * owners. A primitive has exactly one owner and is reused everywhere it appears,
 * so every violation counts, at every impact level.
 */

import { useRef, useState } from 'react';
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { describe, expect, it } from 'vitest';

import { Button } from './Button';
import { Checkbox } from './Checkbox';
import { IconButton } from './IconButton';
import { Input } from './Input';
import { Switch } from './Switch';
import { Textarea } from './Textarea';
import { Avatar } from './Avatar';
import Badge from './Badge';
import { Skeleton } from './Skeleton';
import useModalDialog from '../../hooks/useModalDialog';

expect.extend(toHaveNoViolations);

const WCAG = { runOnly: { type: 'tag' as const, values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } };

async function expectNoViolations(ui: React.ReactElement) {
  const { container } = render(ui);
  const results = await axe(container, WCAG);
  expect(
    results.violations,
    results.violations
      .map((v) => `${v.id} (${v.impact}, ${v.nodes.length} node(s)): ${v.help} — ${v.helpUrl}`)
      .join('\n'),
  ).toHaveLength(0);
}

describe('Button', () => {
  it.each(['primary', 'secondary', 'ghost', 'danger'])('is accessible as %s', async (variant) => {
    await expectNoViolations(<Button variant={variant as never}>Admit patient</Button>);
  });

  it('is accessible while loading', async () => {
    await expectNoViolations(<Button loading>Saving</Button>);
  });

  it('is accessible while disabled', async () => {
    await expectNoViolations(<Button disabled>Admit patient</Button>);
  });

  it('is accessible with long text that has to wrap', async () => {
    await expectNoViolations(
      <Button>Escalate to the on-call attending physician and notify the charge nurse</Button>,
    );
  });
});

describe('IconButton', () => {
  it('carries an accessible name even though it renders no text', async () => {
    await expectNoViolations(<IconButton icon={<svg aria-hidden="true" />} label="Refresh telemetry" />);
  });
});

describe('Input', () => {
  it('is accessible with a label', async () => {
    await expectNoViolations(<Input label="Medical record number" />);
  });

  it('is accessible with hint text', async () => {
    await expectNoViolations(<Input label="Medical record number" hint="Nine digits, no spaces" />);
  });

  it('is accessible in an error state', async () => {
    await expectNoViolations(<Input label="Medical record number" error="That MRN does not exist" />);
  });

  it('is accessible when required', async () => {
    await expectNoViolations(<Input label="Chief complaint" required />);
  });

  it('is accessible when disabled', async () => {
    await expectNoViolations(<Input label="Medical record number" disabled />);
  });
});

describe('Textarea', () => {
  it('is accessible with a label and hint', async () => {
    await expectNoViolations(<Textarea label="Handoff note" hint="SBAR format" />);
  });

  it('is accessible in an error state', async () => {
    await expectNoViolations(<Textarea label="Handoff note" error="A handoff note is required" />);
  });
});

describe('Checkbox', () => {
  it('is accessible with a label', async () => {
    await expectNoViolations(<Checkbox label="Patient is ambulatory" />);
  });

  it('is accessible with a description', async () => {
    await expectNoViolations(
      <Checkbox label="Isolation required" description="Droplet precautions until cleared" />,
    );
  });

  it('is accessible in an error state', async () => {
    await expectNoViolations(<Checkbox label="Consent obtained" error="Consent is required" />);
  });

  it('is accessible when indeterminate', async () => {
    await expectNoViolations(<Checkbox label="All criteria" indeterminate />);
  });
});

describe('Switch', () => {
  it('is accessible with a label', async () => {
    await expectNoViolations(<Switch label="Command centre mode" />);
  });
});

describe('Badge, Avatar and Skeleton', () => {
  it('Badge is accessible', async () => {
    await expectNoViolations(<Badge tone="critical">Breached</Badge>);
  });

  it('Avatar is accessible when it falls back to initials', async () => {
    await expectNoViolations(<Avatar name="Cara George" />);
  });

  it('Skeleton is accessible', async () => {
    await expectNoViolations(<Skeleton width={200} height={16} />);
  });
});

function TrappedDialog() {
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(true);
  useModalDialog(ref, { onClose: () => setOpen(false), enabled: open });
  if (!open) return null;
  return (
    <div ref={ref} role="dialog" aria-modal="true" aria-labelledby="a11y-dialog-title">
      <h2 id="a11y-dialog-title">qSOFA</h2>
      <Input label="Respiratory rate" />
      <Button>Save score</Button>
    </div>
  );
}

describe('Modal dialog', () => {
  it('a dialog built on useModalDialog is accessible', async () => {
    await expectNoViolations(<TrappedDialog />);
  });
});
