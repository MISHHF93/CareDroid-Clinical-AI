import React from 'react';
import './Charts.css';

/**
 * Drug Interaction Heatmap
 * Visual matrix showing drug-drug interactions with severity levels
 */
const DrugInteractionHeatmap = ({ interactions = [] }) => {
  // Get unique drugs from interactions
  const drugSet = new Set();
  interactions.forEach(int => {
    drugSet.add(int.drug1);
    drugSet.add(int.drug2);
  });
  const drugs = Array.from(drugSet).sort();

  // Build interaction matrix
  const matrix = {};
  drugs.forEach(drug1 => {
    matrix[drug1] = {};
    drugs.forEach(drug2 => {
      matrix[drug1][drug2] = null;
    });
  });

  // Fill matrix with interactions
  interactions.forEach(int => {
    matrix[int.drug1][int.drug2] = int;
    matrix[int.drug2][int.drug1] = int; // symmetric
  });

  const getSeverityColor = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'major':
      case 'severe':
        return '#ff6b6b'; // Red
      case 'moderate':
        return '#ff922b'; // Orange
      case 'minor':
        return '#ffd43b'; // Yellow
      default:
        return 'var(--surface-2)'; // Gray
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'major':
      case 'severe':
        return '⛔';
      case 'moderate':
        return '⚠️';
      case 'minor':
        return '⚡';
      default:
        return '';
    }
  };

  return (
    <div className="chart-container">
      <div className="chart-header">
        <h3 className="chart-title">Drug Interaction Matrix</h3>
        <div className="heatmap-legend">
          <span className="legend-item"><span style={{background: '#ff6b6b'}} className="legend-box"></span> Major</span>
          <span className="legend-item"><span style={{background: '#ff922b'}} className="legend-box"></span> Moderate</span>
          <span className="legend-item"><span style={{background: '#ffd43b'}} className="legend-box"></span> Minor</span>
        </div>
      </div>

      <div className="heatmap-wrapper">
        <table className="heatmap-table">
          <thead>
            <tr>
              <th className="heatmap-corner"></th>
              {drugs.map((drug, idx) => (
                <th key={`header-${idx}`} className="heatmap-header">
                  <div className="heatmap-label">{drug}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {drugs.map((drug1, rowIdx) => (
              <tr key={`row-${rowIdx}`}>
                <th className="heatmap-row-header">
                  <div className="heatmap-label">{drug1}</div>
                </th>
                {drugs.map((drug2, colIdx) => {
                  const interaction = matrix[drug1][drug2];
                  const isself = drug1 === drug2;
                  
                  return (
                    <td 
                      key={`cell-${rowIdx}-${colIdx}`}
                      className={`heatmap-cell ${interaction ? 'has-interaction' : ''} ${isself ? 'self-cell' : ''}`}
                      style={{
                        background: isself ? 'var(--surface-3)' : getSeverityColor(interaction?.severity),
                        cursor: interaction ? 'pointer' : 'default'
                      }}
                      title={
                        interaction 
                          ? `${interaction.drug1} + ${interaction.drug2}\n${interaction.severity}: ${interaction.description || 'Interaction detected'}`
                          : isself ? drug1 : 'No known interaction'
                      }
                    >
                      {interaction && (
                        <span className="interaction-icon">{getSeverityIcon(interaction.severity)}</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Interaction details list */}
      {interactions.length > 0 && (
        <div className="interaction-details">
          <h4 className="details-title">Detected Interactions ({interactions.length})</h4>
          <div className="interaction-list">
            {interactions.map((int, idx) => (
              <div key={idx} className="interaction-item" style={{ borderLeft: `3px solid ${getSeverityColor(int.severity)}` }}>
                <div className="interaction-header">
                  <span className="interaction-drugs">{int.drug1} + {int.drug2}</span>
                  <span className="interaction-severity" style={{ color: getSeverityColor(int.severity) }}>
                    {getSeverityIcon(int.severity)} {int.severity}
                  </span>
                </div>
                {int.description && (
                  <div className="interaction-description">{int.description}</div>
                )}
                {int.recommendation && (
                  <div className="interaction-recommendation">
                    💡 {int.recommendation}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DrugInteractionHeatmap;
