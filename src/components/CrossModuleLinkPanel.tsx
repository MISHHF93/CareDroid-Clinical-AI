import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { createCrossModuleIntelligenceService } from '../services/crossModuleIntelligenceService';
import './CrossModuleLinkPanel.css';

export default function CrossModuleLinkPanel({
  moduleId,
  title = 'Related modules',
  description = 'CareDroid connects this surface to adjacent modules so the next useful capability is one click away.',
  limit = 4,
  className = '',
}) {
  const service = useMemo(() => createCrossModuleIntelligenceService(), []);
  const relatedModules = useMemo(
    () => service.getRelatedModules(moduleId, { limit }),
    [limit, moduleId, service],
  );
  const pathway = useMemo(() => service.getModulePathway(moduleId), [moduleId, service]);

  if (!relatedModules.length) return null;

  return (
    <section
      className={`cross-module-panel ${className}`.trim()}
      aria-label={`${title} cross-module links`}
    >
      <div className="cross-module-panel__header">
        <div>
          <p className="cross-module-panel__eyebrow">Cross-module intelligence</p>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        {pathway ? <span>{pathway.label}</span> : null}
      </div>
      <div className="cross-module-panel__grid">
        {relatedModules.map((module) => (
          <Link key={module.id} className="cross-module-card" to={module.route}>
            <div>
              <strong>{module.label}</strong>
              <span>{module.relationship}</span>
            </div>
            <p>{module.rationale}</p>
            <footer>
              <span>{module.score} relevance</span>
              <span>{module.evidenceCount} signals</span>
            </footer>
          </Link>
        ))}
      </div>
    </section>
  );
}
