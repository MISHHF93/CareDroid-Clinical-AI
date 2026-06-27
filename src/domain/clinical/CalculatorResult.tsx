import React from 'react';
import './clinical.css';

type CalculatorResultProps = {
  score: number | string;
  interpretation: string;
  subtext?: string;
  guidance?: string;
  children?: React.ReactNode;
  className?: string;
};

export function CalculatorResult({ score, interpretation, subtext, guidance, children, className }: CalculatorResultProps) {
  return (
    <div className={['cd-calc-result', className ?? ''].filter(Boolean).join(' ')}>
      <div className="cd-calc-result__score-row">
        <span className="cd-calc-result__score" aria-label={`Score: ${score}`}>{score}</span>
        <div className="cd-calc-result__interp">
          <div className="cd-calc-result__interp-label">{interpretation}</div>
          {subtext && <div className="cd-calc-result__interp-sub">{subtext}</div>}
        </div>
      </div>
      {guidance && <div className="cd-calc-result__guidance">{guidance}</div>}
      {children}
    </div>
  );
}
