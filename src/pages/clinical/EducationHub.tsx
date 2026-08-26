import { Link } from 'react-router-dom';
import { GraphicIconBadge } from '../../components/graphics/CdlGraphicKit';
import { CANONICAL_ROUTES } from '../../config/routes.config';
import { useRouteChromeRegistration } from '../../contexts/RouteChromeContext';
import './EducationHub.css';

type EducationCard = Readonly<{
  to: string;
  title: string;
  description: string;
}>;

/**
 * Fourth clinical department workspace, and the simplest of the four: unlike
 * Pharmacy (real tool embedded) or Radiology/Laboratory (honestly-labeled
 * demo queue), Education has no unique content of its own to build — Training
 * Dashboard, Simulation Suite, Competencies, Credentials, and the Knowledge
 * Hub are already real, separately-routed pages. This is a pure navigation
 * hub linking to them, so nothing here is fabricated or duplicated.
 */
const EDUCATION_CARDS: readonly EducationCard[] = [
  {
    to: CANONICAL_ROUTES.trainingDashboard,
    title: 'Training dashboard',
    description: 'Course progress, assigned modules, and completion tracking.',
  },
  {
    to: CANONICAL_ROUTES.simulation,
    title: 'Simulation suite',
    description: 'Run and review clinical training scenarios.',
  },
  {
    to: CANONICAL_ROUTES.simulationOutcomes,
    title: 'Simulation outcomes',
    description: 'Results and debrief notes from completed scenarios.',
  },
  {
    to: CANONICAL_ROUTES.competencies,
    title: 'Competencies',
    description: 'Tracked clinical competencies and sign-off status.',
  },
  {
    to: CANONICAL_ROUTES.credentials,
    title: 'Credentials',
    description: 'Licensure, certifications, and renewal deadlines.',
  },
  {
    to: CANONICAL_ROUTES.knowledgeHub,
    title: 'Knowledge hub',
    description: 'Reference material and healthcare knowledge base.',
  },
];

export default function EducationHub() {
  useRouteChromeRegistration({ title: 'Education' });

  return (
    <main className="education-page" aria-label="Education hub">
      <header className="education-page__header">
        <div className="education-page__title-row">
          <GraphicIconBadge iconKey="education" accent="brand" size="md" />
          <div>
            <p className="education-page-title-text" data-testid="cd-page-title-text">Education</p>
            <p>Training, simulation, competencies, and credentialing in one place.</p>
          </div>
        </div>
        <div className="education-page__actions">
          <Link to={CANONICAL_ROUTES.dashboard}>Command dashboard</Link>
          <Link to={CANONICAL_ROUTES.laboratory}>Laboratory</Link>
          <Link to={CANONICAL_ROUTES.pharmacy}>Pharmacy</Link>
        </div>
      </header>

      <section className="education-page__grid" aria-label="Education destinations">
        {EDUCATION_CARDS.map((card) => (
          <Link key={card.to} to={card.to} className="education-page__card">
            <h2>{card.title}</h2>
            <p>{card.description}</p>
          </Link>
        ))}
      </section>
    </main>
  );
}
