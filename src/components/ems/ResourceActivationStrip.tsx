import { deriveResourceActivations } from '../../services/resourceActivation';
import { AiTruthLabel, resourceActivationTruthLabel } from '../ai/AiTruthLabel';
import type { EMSArrival, Patient } from '../../types/emergency';
import './ResourceActivationStrip.css';

type ResourceActivationStripProps = {
  arrival: EMSArrival;
  patient?: Patient | null;
  compact?: boolean;
  className?: string;
};

export default function ResourceActivationStrip({
  arrival,
  patient = null,
  compact = false,
  className = '',
}: ResourceActivationStripProps) {
  const activations = arrival.resourceActivations?.length
    ? arrival.resourceActivations
    : deriveResourceActivations(arrival, patient);

  if (!activations.length) return null;

  return (
    <div
      className={[
        'resource-activation-strip',
        compact ? 'resource-activation-strip--compact' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      role="status"
      aria-label="Recommended resource activations"
    >
      <span className="resource-activation-strip__label">Resource activation</span>
      <AiTruthLabel {...resourceActivationTruthLabel()} compact />
      <ul>
        {activations.map((entry) => (
          <li
            key={entry.type}
            className={`resource-activation-strip__item resource-activation-strip__item--${entry.priority}`}
            title={entry.rationale.join(' · ')}
          >
            <strong>{entry.label}</strong>
            <span>{Math.round(entry.confidence * 100)}% confidence</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
