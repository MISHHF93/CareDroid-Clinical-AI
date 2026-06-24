import React from 'react';
import { FileText, Shield, Stethoscope, X } from 'lucide-react';
import {
  INTAKE_ARTIFACT_CATEGORIES,
  listArtifactsByCategory,
} from '../../config/intakeArtifactRegistry';
import { RECEPTION_COPY } from './receptionCopy';
import './IntakeArtifactPicker.css';

const CATEGORY_ICON = {
  identity: Shield,
  admin: FileText,
  clinical: Stethoscope,
  arrival: FileText,
};

export default function IntakeArtifactPicker({ onClose, onSelectArtifact }) {
  const copy = RECEPTION_COPY.artifactPicker;

  return (
    <div className="intake-artifact-picker" role="dialog" aria-labelledby="intake-artifact-picker-title">
      <div className="intake-artifact-picker__panel">
        <header className="intake-artifact-picker__header">
          <div>
            <p className="intake-artifact-picker__eyebrow">{copy.eyebrow}</p>
            <h2 id="intake-artifact-picker-title">{copy.title}</h2>
            <p>{copy.description}</p>
          </div>
          <button type="button" className="intake-artifact-picker__close" onClick={onClose} aria-label="Close">
            <X size={18} aria-hidden />
          </button>
        </header>

        <div className="intake-artifact-picker__groups">
          {INTAKE_ARTIFACT_CATEGORIES.map((category) => {
            const artifacts = listArtifactsByCategory(category.id);
            if (!artifacts.length) return null;
            const Icon = CATEGORY_ICON[category.id] || FileText;
            return (
              <section key={category.id} className="intake-artifact-picker__group">
                <h3>
                  <Icon size={16} aria-hidden />
                  {category.label}
                </h3>
                <div className="intake-artifact-picker__options">
                  {artifacts.map((artifact) => (
                    <button
                      key={artifact.artifactId}
                      type="button"
                      className="intake-artifact-picker__option"
                      onClick={() => onSelectArtifact?.(artifact.artifactId)}
                    >
                      <strong>{artifact.shortLabel}</strong>
                      <small>{artifact.description}</small>
                    </button>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}