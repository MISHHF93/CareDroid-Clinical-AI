import React from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';
import { useDensity } from '../../contexts/DensityContext';
import './DensityToggle.css';

export interface DensityToggleProps {
  className?: string;
  showLabel?: boolean;
}

export const DensityToggle: React.FC<DensityToggleProps> = ({
  className = '',
  showLabel = false,
}) => {
  const { toggleDensity, isCompact } = useDensity();

  const nextMode = isCompact ? 'comfortable' : 'compact';
  const label = `Switch to ${nextMode} density`;

  return (
    <button
      type="button"
      className={`caredroid-density-toggle ${isCompact ? 'caredroid-density-toggle--compact' : ''} ${className}`}
      onClick={toggleDensity}
      aria-label={label}
      title={label}
    >
      {isCompact ? (
        <Maximize2 size={15} className="caredroid-density-toggle__icon" />
      ) : (
        <Minimize2 size={15} className="caredroid-density-toggle__icon" />
      )}
      {showLabel && (
        <span className="caredroid-density-toggle__label">
          {isCompact ? 'Compact' : 'Comfortable'}
        </span>
      )}
    </button>
  );
};

export default DensityToggle;
