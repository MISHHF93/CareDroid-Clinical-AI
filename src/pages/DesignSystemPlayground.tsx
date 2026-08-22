import { useState, type ReactNode, type ComponentType, type ChangeEvent, type FocusEvent, type CSSProperties } from 'react';
import Button from '../components/ui/button';
import InputImpl from '../components/ui/input';
import Card from '../components/ui/card';
import AlertImpl from '../components/ui/Alert';
import Badge from '../components/ui/Badge';
import PageHeaderImpl from '../components/ui/PageHeader';
import OperationalEmptyStateImpl, { OperationalEmptyAction as OperationalEmptyActionImpl } from '../components/ui/OperationalEmptyState';
import { Drawer } from '../components/ui/Drawer';
import { Spinner, LoadingScreen, LoadingText } from '../components/ui/Spinner';
import SkeletonLoader from '../components/ui/SkeletonLoader';
import { AiTruthLabel, type AiTruthLabelState } from '../components/ai/AiTruthLabel';
import PatientCard from '../components/PatientCard';
import { PatientState, Priority, type Patient } from '../types/emergency';
import './DesignSystemPlayground.css';

/**
 * src/components/ui/{PageHeader,input,Alert,OperationalEmptyState}.tsx are plain,
 * untyped destructured-prop components (no interface). Left as-is here since
 * retyping them is out of item 41's scope and touches ~dozens of call sites --
 * instead these local aliases describe their real, already-in-use prop
 * contracts just for this catalog page.
 */
type PageHeaderProps = {
  eyebrow?: ReactNode;
  title: ReactNode;
  titleId?: string;
  description?: ReactNode;
  actions?: ReactNode;
  leadingIcon?: ReactNode;
  children?: ReactNode;
  compact?: boolean;
  className?: string;
};
const PageHeader = PageHeaderImpl as ComponentType<PageHeaderProps>;

type InputProps = {
  type?: string;
  label?: ReactNode;
  error?: string;
  success?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  placeholder?: string;
  id?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (_e: ChangeEvent<HTMLInputElement>) => void;
  onFocus?: (_e: FocusEvent<HTMLInputElement>) => void;
  onBlur?: (_e: FocusEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  compact?: boolean;
  className?: string;
  style?: CSSProperties;
};
const Input = InputImpl as ComponentType<InputProps>;

type AlertProps = {
  tone?: 'info' | 'success' | 'warning' | 'danger';
  title?: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
  role?: string;
};
const Alert = AlertImpl as ComponentType<AlertProps>;

type OperationalEmptyStateProps = {
  icon?: ReactNode;
  title?: ReactNode;
  guidance?: ReactNode;
  status?: ReactNode;
  statusTone?: 'stable' | 'neutral';
  nextSteps?: string[];
  actions?: ReactNode;
  helpTopicId?: string;
  size?: 'card' | 'inline' | 'panel';
  className?: string;
  role?: string;
};
const OperationalEmptyState = OperationalEmptyStateImpl as ComponentType<OperationalEmptyStateProps>;

type OperationalEmptyActionProps = {
  children?: ReactNode;
  onClick?: () => void;
  secondary?: boolean;
  type?: 'button' | 'submit' | 'reset';
};
const OperationalEmptyAction = OperationalEmptyActionImpl as ComponentType<OperationalEmptyActionProps>;

/**
 * Item 41 — a developer-facing catalog of CareDroid's real, canonical
 * components, deliberately stressed with long text, missing values, and
 * both themes. Every component here is imported from its real production
 * location (src/components/ui/, src/components/ai/, src/components/
 * PatientCard.tsx) -- nothing on this page is a reimplementation or a
 * simplified stand-in. This is NOT registered in CANONICAL_ROUTE_MAP, any
 * navigation config, or the command palette -- reachable only by direct URL
 * (see router.tsx, gated to import.meta.env.DEV) for whoever is building or
 * auditing a component, not for end users.
 */

const LONG_TEXT =
  'This is a deliberately long string used to verify that titles, labels, and body copy wrap or truncate correctly instead of breaking layout when real-world content runs longer than a designer expected.';

function buildPatient(overrides: Partial<Patient> = {}): Patient {
  return {
    id: 'playground-patient-1',
    mrn: 'ED-0000',
    firstName: 'Jordan',
    lastName: 'Lee',
    dob: '1988-04-02',
    age: 38,
    sex: 'Male',
    arrivalTime: new Date(Date.now() - 45 * 60_000).toISOString(),
    chiefComplaint: 'Chest pain',
    complaintCategory: 'Chest pain',
    state: PatientState.Triage,
    priority: Priority.P3,
    vitals: [],
    flags: [],
    notes: [],
    timeline: [],
    ...overrides,
  } as Patient;
}

const EDGE_CASE_PATIENT = buildPatient({
  id: 'playground-patient-2',
  firstName: 'Alexandria-Constantina',
  lastName: 'Featherstonehaugh-Worthington',
  mrn: 'ED-999999999',
  chiefComplaint:
    'Intermittent chest discomfort radiating to the left arm, associated with shortness of breath, diaphoresis, and nausea for the past three hours',
  complaintCategory: 'Chest pain',
  priority: Priority.P1,
});

const TRUTH_STATES: AiTruthLabelState[] = ['Live', 'Manual', 'Stale', 'Demo'];

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="ds-playground__section">
      <div className="ds-playground__section-head">
        <h2>{title}</h2>
        {description ? <p>{description}</p> : null}
      </div>
      <div className="ds-playground__section-body">{children}</div>
    </section>
  );
}

function Swatch({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="ds-playground__swatch">
      <span className="ds-playground__swatch-label">{label}</span>
      <div className="ds-playground__swatch-content">{children}</div>
    </div>
  );
}

export default function DesignSystemPlayground() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [loadingScreenOpen, setLoadingScreenOpen] = useState(false);

  return (
    <div className="ds-playground">
      <header className="ds-playground__masthead">
        <span className="ds-playground__eyebrow">Developer catalog · not a production destination</span>
        <h1>CareDroid Design System Playground</h1>
        <p>
          Every component below is the real, canonical implementation used across the app — rendered
          against long text, missing values, and (via the app's own theme toggle) both themes.
        </p>
      </header>

      <Section title="Page header" description="src/components/ui/PageHeader.tsx">
        <PageHeader
          eyebrow="Eyebrow label"
          title="A normal page header"
          description="Standard-length description copy."
          actions={<Button variant="primary">Primary action</Button>}
        />
        <div className="ds-playground__gap" />
        <PageHeader eyebrow="Long title" title={LONG_TEXT} />
      </Section>

      <Section title="Buttons" description="src/components/ui/button.tsx">
        <div className="ds-playground__row">
          {(['primary', 'secondary', 'ghost', 'danger', 'success'] as const).map((variant) => (
            <Button key={variant} variant={variant}>
              {variant}
            </Button>
          ))}
        </div>
        <div className="ds-playground__row">
          {(['sm', 'md', 'lg'] as const).map((size) => (
            <Button key={size} size={size}>
              size {size}
            </Button>
          ))}
          <Button loading>Loading</Button>
          <Button disabled disabledReason="Requires charge-nurse permission">
            Disabled with reason
          </Button>
        </div>
      </Section>

      <Section title="Fields" description="src/components/ui/input.tsx">
        <div className="ds-playground__row ds-playground__row--wrap">
          <Input label="Normal field" placeholder="Type here..." value={inputValue} onChange={(e) => setInputValue(e.target.value)} />
          <Input label="With error" error="This field is required." defaultValue="Invalid value" />
          <Input label="With success" success="Looks good." defaultValue="Valid value" />
          <Input label="Disabled" disabled defaultValue="Cannot edit" />
          <Input label="Long placeholder" placeholder={LONG_TEXT} />
        </div>
      </Section>

      <Section title="Cards" description="src/components/ui/card.tsx">
        <div className="ds-playground__row ds-playground__row--wrap">
          <Card style={{ width: 220 }}>Default card</Card>
          <Card subtle style={{ width: 220 }}>Subtle card</Card>
          <Card hover style={{ width: 220 }}>Hoverable card</Card>
          <Card compact style={{ width: 220 }}>Compact card</Card>
          <Card style={{ width: 220 }}>{LONG_TEXT}</Card>
          <Card style={{ width: 220 }}>{/* deliberately empty -- missing content */}</Card>
        </div>
      </Section>

      <Section title="Statuses" description="src/components/ui/Badge.tsx + src/components/ai/AiTruthLabel.tsx">
        <div className="ds-playground__row">
          {(['neutral', 'brand', 'info', 'success', 'warning', 'danger'] as const).map((variant) => (
            <Badge key={variant} variant={variant}>
              {variant}
            </Badge>
          ))}
          <Badge variant="danger" dot>
            with dot
          </Badge>
        </div>
        <div className="ds-playground__gap" />
        <div className="ds-playground__row ds-playground__row--wrap">
          {TRUTH_STATES.map((state) => (
            <AiTruthLabel
              key={state}
              state={state}
              sourceContext={`Example ${state.toLowerCase()} source context.`}
              reviewRequired={state !== 'Demo'}
              compact
            />
          ))}
        </div>
      </Section>

      <Section title="Alerts" description="src/components/ui/Alert.tsx">
        <div className="ds-playground__stack">
          <Alert tone="info" title="Info">
            Standard informational message.
          </Alert>
          <Alert tone="success" title="Success">
            Action completed successfully.
          </Alert>
          <Alert tone="warning" title="Warning">
            Something needs attention soon.
          </Alert>
          <Alert
            tone="danger"
            title="Danger"
            action={
              <Button variant="danger" size="sm">
                Acknowledge
              </Button>
            }
          >
            {LONG_TEXT}
          </Alert>
        </div>
      </Section>

      <Section title="Patient context" description="src/components/PatientCard.tsx (the real component, real Patient shape)">
        <div className="ds-playground__stack">
          <PatientCard patient={buildPatient()} layout="row" />
          <PatientCard patient={EDGE_CASE_PATIENT} layout="row" />
        </div>
        <div className="ds-playground__gap" />
        <div className="ds-playground__row ds-playground__row--wrap">
          <PatientCard patient={buildPatient()} layout="card" />
          <PatientCard patient={EDGE_CASE_PATIENT} layout="card" />
        </div>
      </Section>

      <Section title="Dialogs & drawers" description="src/components/ui/Drawer.tsx">
        <Button onClick={() => setDrawerOpen(true)}>Open drawer</Button>
        <Drawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} title="Example drawer" side="right" size="md">
          <p>Drawer body content. Escape, overlay click, and focus return all work exactly as in production.</p>
        </Drawer>
      </Section>

      <Section title="Empty, loading & error states" description="src/components/ui/OperationalEmptyState.tsx + Spinner.tsx + SkeletonLoader.tsx">
        <div className="ds-playground__row ds-playground__row--wrap">
          <Swatch label="Empty state">
            <OperationalEmptyState
              icon="○"
              title="No results"
              guidance="Nothing matches the current filters."
              status="0 records"
              nextSteps={['Clear filters', 'Broaden the date range']}
              actions={<OperationalEmptyAction onClick={() => setInputValue('')}>Clear filters</OperationalEmptyAction>}
            />
          </Swatch>
          <Swatch label="Spinner">
            <Spinner size="lg" />
          </Swatch>
          <Swatch label="Loading text">
            <LoadingText text="Loading queue..." />
          </Swatch>
        </div>
        <div className="ds-playground__gap" />
        <Swatch label="Skeleton (panel)">
          <SkeletonLoader variant="panel" rows={3} />
        </Swatch>
        <div className="ds-playground__gap" />
        <Swatch label="Loading screen (full-viewport overlay -- preview only, since the real component is position:fixed)">
          <Button onClick={() => setLoadingScreenOpen(true)}>Preview full-screen loading state</Button>
        </Swatch>
        {loadingScreenOpen ? (
          <>
            <LoadingScreen message="Loading department data..." />
            <button
              type="button"
              onClick={() => setLoadingScreenOpen(false)}
              style={{ position: 'fixed', top: 16, right: 16, zIndex: 10000 }}
              className="btn btn-secondary btn-sm"
            >
              Close preview
            </button>
          </>
        ) : null}
      </Section>

      <Section title="Table" description="cd-data-table (used by Shift Summary and other operational pages)">
        <div className="ds-playground__table-wrap">
          <table className="ds-playground__table cd-data-table">
            <thead>
              <tr>
                <th>Queue</th>
                <th>Patients</th>
                <th>Avg wait</th>
                <th>Breaches</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Triage</td>
                <td>4</td>
                <td>12m</td>
                <td>0</td>
              </tr>
              <tr>
                <td>Reassessment</td>
                <td>—</td>
                <td>—</td>
                <td>—</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Section>

      <Section
        title="Responsive compositions"
        description="Fixed-width preview frames -- resize the real browser window to test the app's own breakpoints; these frames show a card at three representative widths without leaving this page."
      >
        <div className="ds-playground__row ds-playground__row--wrap">
          {[320, 768, 1440].map((width) => (
            <div key={width} className="ds-playground__frame" style={{ width: Math.min(width, 360) }}>
              <span className="ds-playground__frame-label">{width}px</span>
              <Card style={{ width: '100%' }}>
                <strong>Card at {width}px</strong>
                <p>{LONG_TEXT}</p>
              </Card>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}
